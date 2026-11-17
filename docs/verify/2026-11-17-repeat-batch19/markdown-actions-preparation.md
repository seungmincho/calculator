# 19B 마크다운 복사·파일 읽기 복구 구현

2026-11-17 KST. 담당 `/root/taxi_repeat`. 18차 체크포인트 뒤 부모 `MarkdownEditor.tsx`에 순수 유틸과 `MarkdownCopyRecovery.tsx`를 연결했다. ko/en 조각은 공용 담당이 병합했다. 독립 부모 검토를 통과했고 실제 브라우저 검증은 진행 중이며, 빌드·배포는 하지 않았다.

## 조사한 기존 동작

- Markdown·HTML 텍스트·서식 복사는 Clipboard 거부 또는 `execCommand(false)`에도 `flash()`를 호출한다.
- 서식 복사는 현재 렌더러가 만든 HTML과 원 Markdown을 `ClipboardItem`에 함께 넣는다. 기존 legacy 경로는 렌더된 HTML 요소를 선택한다. 이 형식을 그대로 유지하고 성공 판정/복구만 보완한다.
- 텍스트 파일은 `.md/.markdown/.txt`를 받으나 크기 상한·오류·읽기 순서 가드가 없다. 이미지의 2 MiB 상한은 이미 있다.
- 이미지 읽기 완료 시점에 `insertAtCursor()`를 호출하므로 중간 원고 편집이나 다른 파일 열기 뒤 오래된 읽기가 문서를 바꿀 수 있다.
- 기존 Markdown 렌더러, HTML 안전 처리, 이미지 형식, 저장 키 `toolhub-markdown-draft`, 600ms 자동 저장, md/html 다운로드는 교체하지 않는다.

## 순수 API

`src/utils/markdownActions.ts`는 DOM 접근 없이 다음 경계를 분리한다.

1. `copyMarkdownContent(snapshot, target, ports, isCurrent)`
   - target은 `md | html | rich`. Markdown/HTML 텍스트는 선택된 원문을 그대로 전달한다.
   - 서식 복사는 HTML+원 Markdown API 또는 실제 서식을 선택한 legacy 경로만 사용한다. 텍스트 복사를 대신 수행하고 서식 복사 성공이라고 표시하지 않는다.
   - API 없음/거부/동기 throw 후 matching fallback의 실제 `true`일 때만 성공이다. false/throw는 실패다.
   - 이미 새 복사나 문서 변경이 있으면 늦은 legacy fallback을 시작하지 않으며 `stale`로 끝낸다.
   - OS에 이미 전달된 Clipboard write를 취소할 수 있다는 의미는 아니다. 그 write가 늦게 끝나더라도 이전 UI 성공/오류/복구 안내를 적용하지 않고, 코드가 통제할 수 있는 추가 fallback을 차단한다.
2. `createMarkdownActionGuard()`
   - 문서 revision과 copy/read별 요청 번호를 함께 검사한다.
   - 모든 복사 종류가 하나의 copy 세대를 사용한다. 새 복사는 이전 다른 종류 복사의 fallback도 무효화한다.
   - 텍스트/이미지 파일 읽기는 하나의 read 세대를 사용한다. 새 파일 요청이 이전 이미지/텍스트 읽기를 무효화한다.
   - `invalidateDocument()`는 편집·새 문서·예제·읽은 문서 반영·언마운트에서 두 작업을 무효화한다. 이미지의 이전 삽입 위치 역시 오래된 문서 revision에서 적용하지 않는다.
   - `invalidateReads()`는 새 파일 선택창을 열 때 호출한다. 파일 선택을 취소하더라도 이전 read가 원고를 덮지 않게 한다. 선택 취소 자체로 원고는 바꾸지 않는다.
3. `readMarkdownTextFile(fileMetadata, reader, isCurrent)`
   - `.md/.markdown/.txt`와 0~1 MiB 정수 바이트 크기를 읽기 전에 검사한다. 빈 파일은 명시적으로 선택한 유효한 텍스트다.
   - reader가 반환한 문자열의 개행/BOM을 helper에서 추가 변환하지 않는다. 브라우저 디코더의 기존 처리를 교체한다는 의미는 아니다. `ready(text)`, `failed(type|size|read)`, `stale`을 구분한다.
   - 뒤늦은 읽기 성공/오류는 새 문서나 새 파일 읽기를 덮지 않는다.

## UI와 부모 연결

`translations-markdown.json`의 `markdownEditor.copyRecovery` 및 `fileRead` ko/en 문구를 사용한다. 수동 복구는 읽기 전용 필드, 전체 선택, 원래 복사 재시도, 닫기로 구성했다. 서식 실패에서는 Markdown/HTML 텍스트 대안을 선택할 수 있지만 이를 서식 복사 성공으로 표시하지 않는다. 16px 입력·44px 조작 영역과 모바일 줄바꿈을 적용했다. 복사 종류를 바꾸면 복구 필드의 형식도 새 대상에 맞춘다.

- 모든 원고 변경은 `setMarkdown` 안전 래퍼를 통과한다. 18차의 `sampleBaseline`과 명시 예제/새 문서 확인 동작은 유지했다.
- 실제 `execCommand('copy') === true`일 때만 legacy 복사 성공이며 임시 선택 영역은 `finally`에서 제거한다. 서식 경로는 기존 렌더러 HTML을 선택하고 이전 selection을 복원한다.
- 파일 선택창을 열거나 선택 취소·새 파일·편집·언마운트 시 이전 FileReader를 abort하고 세대를 무효화한다. 읽기 오류·잘못된 확장자·크기 초과는 현재 원고를 유지한다.
- 이미지 삽입은 읽기 시작 시 원고와 커서를 캡처하고 원고 revision이 그대로인 경우에만 반영한다. 기존 2 MiB 제한, 붙여넣기/드롭, toolbar 실행 취소 흐름을 유지한다.
- 안정 selector: `[data-markdown-copy="md|html|rich"]`, `[data-markdown-copy-recovery="md|html|rich"]` 안 `textarea[readonly]`, `[data-markdown-file-input]`.

## 자체 검사

- `node scripts/check-markdown-actions.ts`: 17개 그룹 PASS.
- `npx eslint src/components/MarkdownEditor.tsx src/components/MarkdownCopyRecovery.tsx src/utils/markdownActions.ts scripts/check-markdown-actions.ts`: exit 0, 오류·경고 0. 기존 부모의 직접 상태 변경 lint 진단은 안전 래퍼 연결 후 사라졌으며 hydration 구조를 확장하지 않았다.
- `node docs/verify/2026-11-17-repeat-batch18/check-locale-effects.mjs`: 11개 그룹 PASS. 원고/예제 기준/확인 취소와 이전 Othello 회귀를 유지했다.
- 검사 범위: 3종 복사/원문 전달, API 없음·거부·throw/legacy false·true·throw, 서식 실패의 텍스트 분리, 다른 복사 뒤 늦은 fallback 차단, 편집·언마운트 무효화, snapshot 보존, 파일 확장자·1 MiB 경계·빈 파일, 읽기 실패, 두 파일 역순 완료, 편집 뒤 늦은 성공/실패, 선택창 취소, 이미지/텍스트 공통 세대와 삽입 revision.
- 독립 순수 검사 `check-markdown-actions-independent.ts` 5개 그룹 PASS.
- 실제 부모/복구 독립 검사 `check-markdown-component.cjs` 8개 그룹 PASS: 3종 Clipboard/legacy false와 rich Blob, 다른 복사/편집 뒤 stale, 역순 FileReader 완료/편집/취소/unmount/실패/한도/빈 파일, image↔text 공통 세대와 시작 커서, readOnly 선택/현재 자동저장·다운로드. 재현 결함이나 변경 요청은 없다.
- 18차 실제 React Markdown locale effect fixture도 state setter 이름을 맞춘 뒤 해당 1개 그룹 PASS를 재확인했다. Othello React fixture는 이번 범위에서 다시 실행하지 않았다.
- 전체 타입 검사에서 React input의 `onCancel` prop 미지원 1건을 발견해 네이티브 `cancel` 이벤트 등록/해제로 최소 수정했다. `node docs/verify/2026-11-17-repeat-batch19/check-markdown-native-cancel.mjs`는 실제 부모 effect/취소/abort 콜백을 추출해 DOM EventTarget으로 취소·새 선택·원고 유지, StrictMode 중복/cleanup, unmount 경계를 검사하며 3개 그룹 PASS다. 전체 타입 재검사는 공용 담당이 수행한다.

기존 GPA helper와 Markdown 렌더러는 수정하지 않았다. 공용 메시지는 통합 담당이 병합했다. 독립 UI/실제 Clipboard/FileReader/브라우저 검증 결과는 담당 보고서에 기록한다.
