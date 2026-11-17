# 25A 저장 원고 → 줄 비교 전달 설계

2026-11-17 KST. [25차 계약](plan.md)과 [후보 조사](../../handoff/2026-11-17-writing-diff-handoff-candidate.md)를 실제 코드와 대조한 **읽기 설계**다. 23차 제품은 ready 상태를 유지하며, 이 설계에 따른 제품 TS 작성·부모 연결은 아직 시작하지 않았다.

후속 상태: 23차 체크포인트 뒤 승인된 독립 유틸·검사·번역의 [미연결 준비 결과](writing-diff-preparation.md)를 별도로 기록했다. 아래는 최초 설계이며, 기존 부모 연결은 여전히 24차 체크포인트 이후로 보류한다.

## 현재 구조와 최소 연결

- `WritingVersionsPanel.tsx:14`는 현재 `WritingDraft`, 활성 탭 번호, 선택한 저장본을 이미 갖는다. 기존 글자 수 차이·원문 나란히 보기와 복원/삭제를 유지하고 그 옆에 ‘줄 단위로 비교’를 추가하면 된다. `CharacterCounter`의 5개 탭·undo·자동 저장 연결은 바꿀 필요가 없다.
- 같은 패널의 `blocked`와 명시 복원의 저장소 재조회(`:68`, `:119`)를 기준으로, 클릭 시 저장 raw와 선택 ID를 다시 확인한다. 목록 충돌/손상/작업 중에는 전달하지 않는다. 재조회가 성공하면 그 순간의 저장본과 현재 글을 각각 복사한다. 전달에 저장소 쓰기나 Web Lock 대기는 필요 없다.
- `writingVersions.ts:48`의 저장본은 현재 공백뿐인 글을 허용하지 않지만, 현재 초안은 비어 있거나 50,000자를 넘을 수 있다. **저장 스키마는 그대로 두고**, 전달 프로토콜은 빈 문자열을 허용하며 각 문서의 길이를 별도로 검사한다. 동일한 내용의 두 snapshot도 유효하다. ‘서로 다른 두 snapshot’은 저장본/현재본의 역할을 뜻하며 내용 차이를 강제하지 않는다.
- `TextDiffWorkspace.tsx:34`의 초기 예제·입력과 확정 결과는 분리돼 있다. 수신 성공 시 두 입력만 교체하고 예제 결과를 지운다. 기존 `compare()`가 명시 호출될 때만 Worker를 만든다. 줄 정책·1 MiB/10,000줄/DP 한도·200행 페이지·TXT/복사 복구는 변경하지 않는다.
- `textHandoff.ts:50`의 메모 새 탭 전달은 popup→sessionStorage 쓰기/읽기 확인→고정 경로 이동·실패 탭 정리 패턴을 제공한다. OCR은 `ImageOcr.tsx:201`에서 같은 탭으로 이동한다. 두 기존 흐름의 `toolhub-ocr-tts-v1`, source, 수신 코드는 수정하지 않는다.

## 제안 API와 데이터

새 `src/utils/writingDiffHandoff.ts`만 두 문서 프로토콜을 소유한다.

```ts
// 제안 이름. 제품 구현 전 계약으로 고정한다.
WRITING_DIFF_HANDOFF_KEY = 'toolhub-writing-diff-v1'
WRITING_DIFF_HANDOFF_TTL = 10 * 60 * 1000
WRITING_DIFF_TEXT_LIMIT = 50_000
WRITING_DIFF_HANDOFF_PATH = '/diff-viewer/?from=writing-versions'

type WritingDiffHandoff = {
  version: 1
  source: 'writing-versions'
  createdAt: number
  left:  { role: 'saved'; name: string; title: string; sourceTab: number; text: string }
  right: { role: 'current'; title: string; sourceTab: number; text: string }
}

createWritingDiffHandoff(saved, current, now): WritingDiffHandoff
parseWritingDiffHandoff(raw, now): /* valid payload 또는 분류한 실패 */
openWritingDiffHandoff(payload, openWindow): void
clearWritingDiffHandoff(storage, expectedRaw): /* cleared / replaced / unavailable */
```

`sourceTab`은 1~5, `name`/`title`은 기존 40자 한도다. saved name은 공백뿐인 이름을 거부하고 title은 빈값을 허용한다. 문자열은 trim·개행 정규화·유니코드 정규화·잘라내기를 하지 않는다. 문자 한도는 기존 저장본과 같은 UTF-16 `text.length`이며, 코드포인트 제한으로 바꾸지 않는다. target/basis/저장본 ID 등 비교에 필요 없는 상태는 전달하지 않는다.

검사는 null/배열/잘못된 타입, 고정 source/역할/버전, 정확한 필드, 각 한도, 안전한 정수 시각, 미래 시각, 10분 초과를 거부한다. 정확히 10분은 유효하다. 좌우 역할을 뒤집은 payload는 자동 재정렬하지 않는다. JSON 파싱 전 raw 길이 상한은 두 문서 각각의 제어문자 6배 이스케이프와 제한된 메타데이터를 포함해 산정한다. 자체 생성한 최대 payload를 자체 parser가 거부하지 않는 왕복 검사를 둔다.

## 보내기와 실패 보존

1. 사용자가 누른 순간의 활성 탭/current, 선택 저장 ID, 정상 `stored.raw`를 확인하고 저장소를 동기 재조회한다. raw가 다르면 충돌 안내로 중단하고 원문과 선택을 유지한다.
2. 유효한 두 원문과 제한된 이름을 복제해 payload를 만든다. 현재 초안이 너무 길면 명시 오류를 보여 주며 일부만 보내지 않는다.
3. 같은 클릭 호출 안에서 `window.open('about:blank', '_blank')`를 호출한다. await나 잠금 대기를 넣지 않는다. 새 탭의 sessionStorage에 쓰기→동일 raw 읽기 확인→`opener = null`→고정 경로 `replace` 순서로 실행한다.
4. 팝업 null/throw, 저장소 접근·쓰기·읽기 확인 실패, opener/경로 이동 예외는 실패로 분류한다. 만든 탭만 가능한 범위에서 닫고 원래 창의 주소·초안·undo·선택·저장 bytes를 변경하지 않는다. 원문을 URL/hash/localStorage/로그/외부 요청에 넣지 않는다.
5. 실패 안내는 원래 패널에 남기고 기존 두 원문 보기를 유지한다. ‘원문을 각각 선택해 텍스트 비교 도구에 붙여넣기’ 수동 경로와 기존 `/diff-viewer/` 링크를 제공한다. 클립보드 복사가 성공했다고 표시하는 기능은 이 버튼에 추가하지 않는다.

새 탭의 sessionStorage는 탭에 종속된다. 기존 열려 있는 Diff/TTS 탭을 찾아 재사용하거나 덮지 않는다. snapshot 이후 원래 글을 수정해도 이미 전달한 원문이 따라 바뀌지 않는다고 버튼 주변과 수신 안내에 명시한다.

## 수신·편집 보호·소비

- 정적 HTML/첫 hydration은 기존 예제를 유지한다. `useHydrated` 뒤 최초 명시 `from=writing-versions` 진입만 읽는다. marker 없는 일반 방문은 저장소를 읽거나 소비하지 않는다. URL에는 본문이 없고, 새로 고침/링크 복사로 전달을 재현할 수 있다고 안내하지 않는다.
- 한 번 시도한 방문 상태와 사용자 작업 revision을 분리한다. 양쪽 입력 편집·swap·clear·명시 compare/cancel은 revision을 즉시 증가시킨다. 초기 수신 작업은 alive/방문 세대/revision이 여전히 같은지 적용 직전에 검사한다. 이미 편집하거나 비교를 시작했다면 입력을 보존하고 적용하지 않는다. 언마운트 뒤 callback도 무시한다.
- raw 읽기→검증 뒤 적용 직전에 현재 raw가 같은지 재확인한다. 사이에 새 payload로 바뀌면 오래된 두 문서를 적용하지 않는다. locale/rerender/같은 방문의 query 변화로 자동 재시도하지 않는다.
- 성공 적용은 기존 Worker/copy 요청을 무효화하고 두 입력을 한 번에 설정한다. 이전 예제/확정 결과·페이지·복사/다운로드 성공 안내를 초기화한다. 받은 이름과 저장본/현재본 역할은 escape된 일반 React 텍스트로 표시한다. 이후 편집 시 snapshot 설명과 현재 입력의 차이를 표시하고, swap 시 좌우 역할을 함께 바꾸거나 출처 표기를 일반 좌우 라벨로 되돌린다.
- 적용한 payload만 `clearWritingDiffHandoff(expectedRaw)`로 소비한다. 삭제 직전 raw가 다르면 새 값을 보존한다. 삭제 뒤 읽기 확인이 불가능하거나 값이 남아 있으면 ‘입력은 받았지만 전달 데이터 정리를 확인하지 못함’을 안내하되 받은 입력을 되돌리지 않는다. 재렌더로 다시 적용하지 않는다.
- 미존재/만료/미지원/잘못된 payload 또는 dirty 차단은 기본 도구를 계속 사용할 수 있게 하고 자동 계산하지 않는다. **적용하지 않은 raw는 보존**하는 보수적인 정책을 제안한다. 원래 창에서 다시 보내면 별도의 새 탭으로 전달된다. 타 세대 payload를 삭제하거나 임의 복구하지 않는다.

## 파일 소유와 검증 계획

| 파일 | 최소 변경 |
| --- | --- |
| `src/utils/writingDiffHandoff.ts` | 별도 순수 schema/TTL, 새 탭 포트, 조건부 소비 API |
| `src/components/WritingVersionsPanel.tsx` | 클릭 시 최신 목록 확인·snapshot 전달·오류/수동 안내 |
| `src/components/TextDiffWorkspace.tsx` | 최초 수신/dirty guard·원문 적용·소비 안내. 기존 compare/export 재사용 |
| `scripts/check-writing-diff-handoff.ts` 및 작은 실제 컴포넌트 harness | 아래 경계 검사 |
| `docs/verify/2026-11-17-repeat-batch25/translations-writing-diff.json` | `characterCounter.versions`/`diffViewer` 하위 ko/en 조각. canonical 병합은 integrate |

`CharacterCounter`, 기존 `writingVersions` 저장 형식, OCR/메모/TTS handoff, `lineDiff` 엔진은 변경하지 않는 범위다. 필요하면 작은 수신 안내 child를 분리하되 미리 준비한 파일부터 연결한다.

1. 순수/포트: 빈·동일·한글·CRLF·제어문자 원문 정확 왕복, 양쪽 50,000/50,001과 최악 JSON, 이름/출처/역할·미지원/미래/TTL 정확 경계. popup null/throw, set/get/readback/opener/navigation 실패에서 새 탭 정리와 원창 불변. 새 raw로 교체된 경우 조건부 삭제가 보존하는지 확인한다.
2. 실제 source/target 이벤트: 현재 탭·선택 변경 직후 클릭, 놓친 storage event의 raw 충돌, 긴 현재 글, current/저장 raw/5탭 undo 불변. 초기 수신 전 입력·compare·swap·clear, 늦은 callback/언마운트/locale, 두 수신 시도 역순과 새로운 raw, 적용 뒤 재소비 금지. 기존 OCR/메모→TTS 관련 회귀는 분리한다.
3. 독립 브라우저 담당: 실제 새 탭/sessionStorage/opener·양쪽 원문 equality, 자동 Worker 0회→명시 비교 실제 Worker, TXT·native copy/실패 복구, 부모 저장 bytes 불변, 차단/만료와 320px KO/EN. 기존 Diff 한도/긴 문서 렌더는 제품 한도를 그대로 대조한다.

23차 브라우저 결함 대응이 우선이며, 23차 전체 체크포인트와 다음 준비 신호 전에는 이 설계를 제품에 연결하지 않는다. 이번 읽기 조사에서는 TS·메시지원본·메타 변경, Chrome·전체 타입·빌드 검사를 실행하지 않았다.
