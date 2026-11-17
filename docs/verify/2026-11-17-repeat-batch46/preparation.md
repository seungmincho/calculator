# 46차 읽기 목록 — 미연결 준비 체크포인트

후속: 부모 연결 승인 뒤 구현/자체 검사를 완료했다. 최신 상태는 [implementation.md](implementation.md)에 있으며 아래는 미연결 준비 당시 기록으로 보존한다.

2026-11-17. 승인된 순수 모듈/자식/KOEN 조각과 `tts.ts`의 최소 문장 경계 보완을 구현했다. **TextToSpeech 부모 연결0, canonical/meta 변경0**이다. 다음 부모 연결은 별도 신호 뒤 진행한다.

## 준비 파일/API

- `src/utils/ttsReadingRecords.ts`: key/lock `toolhub-tts-reading-list-v1`. read/parser `{ok:true,snapshot:{raw,revision,records}} | {ok:false,error,raw?}`. 생성과 위치 캡처는 `{ok:true,value} | {ok:false,error}`, load는 `{record,segments,index,positionMatched}`를 전달한다.
- `parseTtsReadingRecords`/`readTtsReadingRecords`: 2MiB raw 보호, 8 records, 원문30,000 UTF-16/name40/voice512/position140/ASCII id·revision80, 정확 field/type/version/date/offset/slice/중복 ID·이름·decoded JSON key. 손상/미지원은 전체 거부·원문 보존·초기0쓰기다.
- `createTtsReadingRecord`는 원문을 정확 복제하며 현재 분할의 정확한 문장만 생성한다. `captureTtsReadingPosition`은 유효 recovery → speaking/paused 현재문장 → 복원 시작문장/첫문장의 우선순위를 사용한다. 저장해 둔 과거 분할 위치가 현재와 달라져도 parser는 정확 원문 slice를 보존하고 `resolveTtsReadingPosition`/load는 index0+positionMatched=false를 반환한다. 조각이 없으면 index=null이다.
- `resolveTtsReadingVoice`는 local-only=true인 경우 localService===true인 음성만 후보로 삼고,0개이면 voice=null/**playAllowed=false**다. 이는 아직 부모 실제 재생 차단을 대신하지 않는다. 부모 canPlay와 speakFrom 양쪽에서 동일 조건을 적용할 것이며 native utterance에 null voice를 넘겨 기본 remote를 사용하는 흐름을 막아야 한다.
- `writeTtsReadingAction` add/delete만 제공, 매번 revision 변경. 입력 action을 await 전에 복제한다. key lock 안 raw 재확인, 쓰기 직전 재확인, 정확 readback. ninth save 자동 축출0, duplicate-name 자동 덮기0. quota/conflict/unknown 원문 복원 시도0/성공표시0. lock 없는 환경은 CAS/readback 범위다.
- `loadTtsReadingRecord`는 lock/raw/current/abort를 확인한 읽기다. 삭제는 재생/원문을 참조하지 않는다. 쓰기와 열기는 별도 세대의 `current`와 AbortSignal을 받아 늦은 요청을 차단한다.

`src/components/TtsReadingList.tsx`는 미연결 단일 자식이다. props는 `ready`, `inputRevision`, `capture():Result<Draft>`, `onApply(Load):boolean`이다. inputRevision은 **명시적** 원고/설정/재생 액션에만 증가하며 자동 onboundary/진행에는 증가시키지 않는다. 자식은 initial read로 원고를 적용하지 않고 명시 확인 열기에서만 onApply를 한 번 호출한다. 부모 적용은 stop/반복 off/기존 recovery 무효화/원문·settings·startFrom 복원과 자동발화0을 책임진다. onApply가 자기 적용으로 inputRevision을 증가시켜도 자식의 적용 결과를 스스로 취소하는 loop는 없다.

기존 읽기 원문/발화 설정은 부모에서 캡처해야 하므로 현재 자식만으로 실제 음성 재생/중단을 검증했다고 주장하지 않는다. 사용자 편집/목록 재조회/언마운트는 pending load/save를 무효화한다. raw conflict/storage 이벤트 뒤에는 추가 액션을 막고 재조회한다. quota/unknown에서도 이름 입력을 유지한다. 삭제/목록 재조회는 onApply를 호출하지 않는다.

## chunkText의 제한된 공용 영향

`src/utils/tts.ts`의 공개 `chunkText`/`splitLong`에서 max는 양의 safe integer만 허용한다.0/음수/NaN/Infinity/소수는 빈 원문에서도 RangeError다. 실제 제품 caller는 TextToSpeech 기본140, meetingHandoff1000뿐이며 정상 값을 변경하지 않았다.

긴 조각 경계가 surrogate pair 중간이면 한 칸 앞으로 당긴다. max1에서 진전0이 될 때만 그 한 code point2 UTF-16를 함께 낸다. 원문 offset/CRLF/원래 lone surrogate를 보존하고 grapheme cluster/OS 발음까지 해결했다고 표현하지 않는다. 디자인 단계 before 관측 MJS/JSON은 원래 실패 증거로 보존하며 현재 수정 뒤 회귀는 새 검사 script로 확인한다.

## 검사 결과

- `node scripts/check-tts-reading-records.ts`: **9그룹 PASS**. invalid max/다양한 pair 위치/max1·1000, strict/decoded duplicates, 실제8개 최대 원문/음성이름 serializer+정확2MiB/초과 원문 보존, recovery/active/paused/restored 캡처, 이전 분할 열기, local-only0 차단,8개/분기/duplicate/삭제revision,quota/unknown/await 복제,load 취소/raw 교체.
- `node docs/verify/2026-11-17-repeat-batch46/check-reading-list-child.mjs`: **5그룹 PASS**. 실제 자식 KO/EN 명시 save/load/delete·초기0쓰기·44px/16px,lock 대기 중 edit/refresh/unmount,quota/unknown과이름보존/storage conflict,초기ready gate·이전 split warning·자기적용 revision loop 방지.
- 기존 `node scripts/check-tts.ts` PASS, `node scripts/check-tts-recovery.ts` **25checks PASS**, `node scripts/check-meeting-handoff.ts` **11checks PASS**. 기존회귀 수는 새14그룹과 중복 합산하지 않는다.
- 제품3파일+순수검사TS+child검사MJS의5파일 scoped ESLint exit0/경고0. 마지막 const action capture 정리의 단일 util lint도 exit0/경고0이며 순수9그룹 영향 재확인 PASS다(중복 합산0).
- `translations-tts.json`: KO/EN 각 **44leaf**, 미연결 child 정적 literal19개 키 대조 누락0. 생성/원본병합은 통합담당의 다음 단계다.

실제 저장소/개인 원고/SpeechSynthesis발화/RPC/Chrome/전체tsc/build를 실행하지 않았다. 합성 JSON max는 design의1,471,151bytes/보수상한1,478,975bytes로2MiB 내이며 실제 quota 성공 보장은 아니다.

## 다음 부모 연결 범위

1. 초기 URL/from/tts.settings/tts.voice 우선과 early user input을 보존하며 child ready를 초기화 완료 뒤 활성화한다.
2. 현재 manuscript·설정·정확 recovery 문장을 capture, 명시 load에서만 stop+세대 증가와 live ref의 새 snapshot을 적용한다. repeat false/pass1/gap 취소, startFrom 표시/명시 play 연결, 오래된 end/error/boundary 무효화.
3. delayed voiceschanged의 record 의도를 보호하고 local-only0일 때 canPlay/speakFrom 모두 실제 발화0을 확인한다. 누락 voice 안내를 붙이며 remote로 몰래 전환하지 않는다.
4. 실제 부모에서 현재 speaking/paused/failure/repeat-gap/열기 직후 play,원고/locale·URL/handoff,old Clipboard paste/link 응답의 최소 원고 세대를 대조한다. 기존13차·회의록 영향은 변경 경계만 실행한다.
5. 부모 완료 후 canonical44키/추가키 통합·독립·단일 native·전체 타입을 지정 담당자에게 넘긴다. 현재 이 후속 검사는 완료하지 않았다.
