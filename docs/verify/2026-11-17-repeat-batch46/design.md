# 46차 TTS 읽기 목록 — 연결 설계

2026-11-17. **읽기 설계/합성 MJS만 작성했다. 제품 TS/부모/공용 번역은 변경하지 않았다.** 41/42/45 native·전체 타입 체크포인트와 42 발견 대응을 우선한다. 아래 schema/API는 다음 구현 단계의 제안이며 구현 완료 기능으로 안내하지 않는다.

## 현재 부모의 실제 연결점

`TextToSpeech.tsx`에는 `originalText`, `currentSegment`, `startFrom`이라는 변수는 없다. 정확한 원고는 `text`, 재생 조각은 `segments=chunkText(text)`, 화면 문장 번호는 `cur`, 콜백 체인의 문장 번호는 `idx.current`다. 새 영속 모델의 용어를 이 상태에 대응시키며 기존 소유권을 중복 생성하지 않는다.

| 기존 코드 | 현재 의미와 새 목록 연결 |
| --- | --- |
| `text`, `changeText(next)` | 원문을 그대로 유지한다. textarea/예제/정리/비우기/붙여넣기는 `changeText`를 거쳐 stop·반복 초기화한다. 저장 시 slice/trim/줄바꿈 변환을 하지 않는다. 이름만 별도 trim한다. |
| `segments`, `cur`, `idx`, `word` | segments는 trim된 발화 조각과 원문 offset이다. 단어 하이라이트 위치를 문장 bookmark로 오해하지 않는다. 저장은 문장 전체 `{index,start,end,text}` snapshot이다. |
| `session`, `uttRef`, `gapTimer` | stop으로 session을 증가시켜 old utterance end/error/boundary와 반복 대기를 무효화한다. 목록 열기도 같은 정지 경계를 먼저 사용한다. native cancel 자체의 OS 완료를 보장하지 않는다. |
| `status`, `toggle`, `speakFrom(start,resume)` | 현재 stopped→play는 항상0에서 시작한다. 새 `startFrom`(복원 대기 문장, 기본0)만 추가하여 stopped→play가 그 위치에서 시작하도록 한다. 실제 재생·단어 이벤트의 진행값은 기존 idx/cur가 계속 소유한다. |
| `recoveryRef`, `canRetryTtsRecovery` | 13차 실패 복구는 원문·generation·문장 offset/text·repeat 설정 전체가 같아야 유효하다. 목록에는 recovery token/pass를 저장하지 않고 유효한 실패 문장 위치만 복제한다. 목록 열기는 실패 복구를 지운다. |
| repeat/start/end/count/gap/pass/waiting | 저장 대상에서 제외한다. 목록 열기는 반복 false, 범위0, pass1, waiting false로 초기화한다. 같은 문장 열기라도 이전 반복 timer를 재사용하지 않는다. |
| `voiceName`, derived `voice`, `localVoicesOnly` | 저장에는 음성 이름과 local-only 조건만 포함한다. SpeechSynthesisVoice 객체·원격 응답·음성 파일은 저장하지 않는다. 실제 기기 목록과 복원할 선택 의도를 별도로 대조한다. |
| `tts.voice` | 기존 writer는 사용자가 음성 select를 바꾸는 `changeVoice`뿐이다. 목록 열기에서 이 함수를 호출하면 현재 발화가 재시작할 수 있으므로 호출하지 않는다. 열기는 현재 선택 state만 복원하며 voice preference key에 새 자동 writer를 추가하지 않는다. |
| `tts.settings` | 기존 rate/pitch/volume effect는 initialized 이후 자동 저장한다. 목록 열기에서 이 state가 바뀌면 기존 effect가 실행된다. 새 목록 저장 성공/실패와 이 best-effort 설정 저장을 같은 성공으로 표시하지 않는다. localVoicesOnly는 이 기존 key에 추가하지 않는다. |
| handoff/URL 초기화 | hydrate 후 한 번: 일반 저장 설정 → truthy `t`의 앞1500 UTF-16 → `!q`일 때 유효 from의 session payload → 유효 URL `r`로 속도 우선. from은 local-only true를 먼저 설정한다. 잘못된 from/다른 source payload 소비 정책을 유지한다. 새 목록은 초기 자동 적용/추가0이다. |

초기 `t=` 빈 값은 현재 `!q` 분기로 handoff를 허용한다. 공유 `t`가 있으면 from보다 우선한다. 기존 render-time initialization/guard를 이번 목록 편의를 위해 전면 재작성하지 않는다. 목록 액션은 initialized 이후에만 활성화한다. 언어 변경은 번역 label만 바꾸고 원고·목록·선택을 재초기화하지 않는다.

## 저장 모델과 엄격한 제한

새 key/lock 이름을 **`toolhub-tts-reading-list-v1`**로 제안한다. 기존 세 key(`tts.voice`, `tts.settings`, `toolhub-ocr-tts-v1`)와 독립이다.

```ts
type ReadingList = {
  version: 1;
  revision: string; // ASCII [A-Za-z0-9_-], 1..80
  records: ReadingRecord[]; // 0..8
};
type ReadingRecord = {
  id: string; // ASCII [A-Za-z0-9_-], 1..80, 목록 안 유일
  name: string; // trim한 비어 있지 않은 이름, 1..40 UTF-16
  text: string; // 원문 그대로, trim 결과는 비어 있지 않음, 최대30,000 UTF-16
  createdAt: number; // 정수 0..8,640,000,000,000,000 (유효 Date 범위)
  position: { index: number; start: number; end: number; text: string };
  settings: {
    voiceName: string | null; // null 또는 비어 있지 않은 문자열, 최대512 UTF-16
    rate: number; pitch: number; // finite, 0.5..2
    volume: number; // finite, 0..1
    localVoicesOnly: boolean;
  };
};
```

position.index는0..29,999 정수, 0≤start<end≤원문.length, end-start=position.text.length≤140이며 원문의 정확한 slice와 같아야 한다. 현재 create에서는 실제 `chunkText(text)`의 선택 조각과 완전히 같은 snapshot만 만든다. parser는 구조/offset/slice를 검사하고, **현재 분할 결과와의 문장 일치**는 열기 때 별도로 검사한다. 그래야 구버전 분할 경계와 달라진 원고 전체를 손상으로 잘못 삭제하지 않고 첫 문장부터 선택하도록 안내할 수 있다. index를 새 조각 수에 clamp하여 다른 문장을 읽지 않는다.

원문·음성 이름을 잘라 한도에 맞추지 않는다. 30,001자/음성 이름513자는 해당 저장 요청을 설명과 함께 거부하고 기존 목록/현재 원고를 유지한다. 일반 textarea의 기존 무상한 입력을 30,000자로 제한하지 않는다. 읽을 조각이 전혀 없는 원고는 새 저장 대상으로 만들지 않는다. 원문에 원래 있던 고립 surrogate까지 임의 치환하지 않는다.

모든 object의 알려진 필드/필수 필드/type/version·중복 ID·배열 한도를 검사한다. 알려지지 않은 version/필드는 unsupported로 전체 쓰기를 막고 raw를 유지한다. JSON.parse가 구문을 소유하며, 중복 속성 이름을 검출한다면 별도 작은 lexical 검사만 사용하고 두 번째 JSON 파서를 만들지 않는다. 빈 key는 정상 빈 목록으로 읽되 초기 read에 쓰지 않는다. 같은 이름은 덮어쓰기 대신 duplicate-name 안내로 거부한다. 첫 범위에는 rename/overwrite/JSON backup을 추가하지 않는다.

## 2MiB 보호 예산의 제안 확정 근거

`reading-design-probes.mjs`는 최종 제안 구조를 사용한 메모리 합성이다. text30,000·name40·voiceName512에 JSON escape 최대6bytes인 고립 surrogate를 채우고 ID/revision80, 유효 최종 발화 위치, 긴 finite 설정 숫자를 넣었다. **8개 raw 1,471,151 UTF-8bytes, 정확 JSON 왕복 PASS**다.

유효 serializer output에 대한 보수적 상한도 계산했다. UTF-16당 JSON 인코딩 최대6 ASCIIbytes, 원문30,000+이름40+voice512+문장140, ASCII ID/revision80, 레코드당7개 숫자에 각64byte를 넉넉히 예약하고 필드명·괄호·쉼표·더 긴 false 길이를 실제 skeleton으로 더했다. **1,478,975bytes < 2,097,152bytes**다. actual fixture는 최종 문장이40자라 보수 상한과 다르다. 64byte 숫자 예약은 현재 유한 JS number의 JSON 표현보다 넓고 safe integer 날짜/offset도 포함한다.

따라서 raw UTF-8 **2MiB**를 채택할 수 있다. 외부에서 같은 값에 많은 whitespace/escape를 붙여2MiB를 넘긴 raw는 원문 보존·쓰기 중지한다. 이 제한을 모든 가능한 legacy raw의 최대라고 부르지 않는다(새 key이며 legacy migration 없음). 최대8개는 자동 축출하지 않고 ninth save를 거부한다. localStorage quota는 별도 실패 경계이며2MiB가 어느 브라우저에서나 저장된다는 보장은 없다.

## 명시 저장·열기·삭제와 경합

제안 순수 API는 `src/utils/ttsReadingRecords.ts`의 `parse/read/capturePosition/resolvePosition/createRecord/writeAction/loadRecord`다. read는 `{ok:true,snapshot:{raw,revision,records}} | {ok:false,error,raw?}`를 반환한다. `writeAction`은 add/delete만 받고 모든 실제 변경마다 새 revision을 사용한다. key lock 안에서 raw를 다시 확인하고 set 뒤 정확 readback을 검사한다. lock이 없으면 같은 CAS/readback 범위이며 원자적 localStorage transaction으로 주장하지 않는다. quota/차단/손상/미지원/tooLarge/conflict/writeUnknown/canceled를 구분하고 자동 rollback하지 않는다.

- 저장 버튼 클릭 순간 이름·원문·문장·현재 UI 설정을 캡처한다. 일반 automatic boundary/진행 이벤트는 저장 snapshot을 바꾸지 않는다. 사용자 원문/설정 편집이나 목록 재조회/언마운트는 대기 중 액션을 취소한다. 실제 쓰기가 이미 끝났다면 이를 되돌렸다고 표시하지 않는다.
- 위치 우선순위는 **유효 recovery → speaking/paused/waiting의 idx/cur → 열어 둔 복원 시작 위치 → 첫 조각**이다. stale recovery를 정확한 실패 문장이라고 저장하지 않는다. 원문 slice와 현재 segments를 항상 대조한다.
- 열기는 현재 원고를 교체한다는 확인 영역에서 명시 실행한다. 기다리는 lock 동안 원문/음성/설정/반복/명시 재생 액션이 바뀌면 늦은 열기를 취소한다. 자동 onboundary/진행 시각만으로는 사용자 선택한 열기를 취소하지 않는다. load 전에 raw가 바뀌면 기존 원고/읽기를 유지하고 재조회를 안내한다.
- 적용 시 먼저 stop/session 증가, 이전 gap/recovery/word/copy 안내를 무효화한다. 원문·settings·현재 segments를 적용한 후 status=stopped로 둔다. 복원 위치는 `startFrom`과 reader highlight로 표시하되 자동 speak/resume하지 않는다. 다음 play/Space만 그 문장을 읽는다. 새 reader 문장 클릭은 기존처럼 그 문장을 명시 재생한다. 재생 끝/정지/직접 원고 편집은 복원 위치를0으로 되돌린다.
- apply 직후 live ref도 새 원문/segments/settings/repeat=false snapshot으로 맞춰 첫 사용자 play가 이전 원고를 읽지 않게 한다. 새 상태 effect가 commit될 때까지 playback 준비 상태를 명확히 한다. 명시 load의 자기초기화가 load를 스스로 취소하는 세대 루프를 만들지 않는다.
- 음성 선택 intent는 record load generation에 귀속시킨다. 늦은 `voiceschanged`가 기존 `tts.voice`로 방금 연 기록 선택을 덮지 않게 한다. 현재 allowed 음성 중 저장 이름이 없으면 allowed fallback 선택/누락 안내를 제공한다. local-only=true에서는 remote fallback을 하지 않고 local voice0이면 재생을 막는다. 사용자가 직접 voice/local-only를 바꾸면 이전 record intent를 해제한다.
- 삭제는 목록만 바꾸며 현재 원문/발화/복원 위치를 바꾸지 않는다. 저장소 event/명시 재조회는 목록만 갱신하고 현재 원고를 자동으로 적용하지 않는다. corruption/unknown 상태에서는 다른 작업보다 목록 재조회만 허용하며 TTS 자체는 계속 쓸 수 있다.

기존 비동기 Clipboard 붙여넣기·링크 복사는 원고 교체 뒤 늦은 응답이 남을 수 있다. 목록 적용을 이전 Clipboard 응답이 덮지 않도록 기존 핸들러의 manuscript generation 확인이 필요한 최소 경계로 기록한다. 새 복사 대안 UI나 Clipboard 정책 전면 변경은 이 목록 범위에 넣지 않는다. 기존 짧은 URL share(1500)와 OCR/메모장 전달(30000)은 계속 별도 경로다.

## chunkText 진행·surrogate 보완 제안

제품 호출처는 **2곳**이다: TextToSpeech `chunkText(text)`(140), meetingHandoff의 `meetingSentences(text)`(1000, transcript≤12000). `splitLong` 직접 제품 호출은 chunkText 내부뿐이며 회귀 script가 직접100으로 호출한다. 회의록 전달의 원문 offset/문장 순서도 영향 회귀 대상이다.

현재 실제 읽기 probe는139 ASCII 뒤 emoji가140 경계에서 고립 surrogate로 갈라짐을 확인했다. `max=1`도 pair를 분리하며 `max=1.5`는 소수 offset을 만든다. NaN/Infinity는 긴 문장을 그대로 한 조각으로 반환했다. `max=0`과 음수는 **실행하지 않았다**: 공백 없는 입력에서 start가 각각 제자리/감소하므로 while 진행이 보장되지 않는 코드 근거다. 무한 루프를 주 작업 프로세스에 돌리지 않는다. 원본 SHA와 관측은 `design-observations.json`이다.

제안 정책은 `chunkText`와 공개 `splitLong` 모두 **양의 safe integer max만 허용**, 0/음수/NaN/Infinity/소수는 즉시 RangeError다. 빈 원문도 잘못된 인수를 조용히 성공으로 처리하지 않는다. 기본140/회의1000/기존100의 정상 ASCII·한글 결과는 유지한다.

자르려는 경계가 high/low surrogate 사이면 한 UTF-16 뒤로 물린다. 단 max=1에서 pair 앞이라 뒤로 물리면 진전0이 되는 경우는 그 단일 code point의2 UTF-16를 함께 낸다. 이는 문서화된 유일한 max 초과 예외다. 모든 반복에서 next>start를 확인하고 원문 offset을 유지한다. 원래 깨진 surrogate를 보정하거나 grapheme/ZWJ 전체 결합·OS 발음 품질을 보장하지 않는다. 140/1000은2이상이므로 예외에 해당하지 않는다.

## 자식 UI와 다음 검증

`TtsReadingList.tsx`는 기존 입력 아래 보조 영역으로 둔다. 이름 입력+명시 저장+브라우저 저장 설명, 최대8개 목록의 이름/날짜/원문 길이/읽던 문장 번호/짧은 preview, 확인 열기/삭제, 실패 안내/재조회만 제공한다. preview는 줄바꿈 공백화·code point 안전하게 짧게 표시하되 저장 원문은 그대로다. 원문 전체를 목록8행마다 렌더하지 않는다. 입력16px/버튼44px/320 KOEN/token/t()와 기존 controls 접근을 보존한다. 새 route/자동 저장/원격 음성 모델/계정·JSON backup 없음.

다음 구현은 pure+child+KOEN를 먼저 완결한 뒤 부모 연결한다. 의미 있는 검사: 모든 한도와 실제 serializer 최대, 원문 CRLF/emoji/고립 surrogate 정확 보존, 현재/실패/paused/복원 위치, 구분 변경 시 첫 문장 재선택, strict·duplicates·2MiB·quota·unknown·two-tab/lock, late load/voices/utterance/gap, local-only0/fallback, 초기 URL/from 우선·초기 목록0쓰기, 열기 자동발화0/명시play 정확위치, 삭제 재생 유지. 기존13차 recovery·tts 기본·meetingSentences 정상 회귀도 변경 경계만 확인한다.

실제 browser는 지정 담당만 SpeechSynthesis 제어 포트/실제 저장·키보드·320을 확인한다. 실제 개인 원고·마이크·공개 RPC·실제 원격 발화를 시험하지 않는다. 전체 타입/빌드/공용 canonical은 이 준비 작업에서 실행·수정하지 않는다.
