# 19차 문서 비교·마크다운 동작 독립 검토

담당: writing_versions. 2026-11-17 KST. [실행 계약](plan.md)을 기준으로 제품 파일을 직접 수정하지 않는다. 18차 브라우저/통합 발견 대응이 우선이며 Chrome·전체 tsc·빌드·배포·패키지 추가는 실행하지 않는다.

## 상태

최종 독립 **25그룹 통과**: A 텍스트 비교 12, B 마크다운 13. 순수 도메인 9, 실제 Worker 모듈/클라이언트 3, 복사 세대 1, 실제 client/UI 및 DiffViewer 부모 연결 4, 마크다운 부모/복구 연결 8로 구성된다. 비교 완료 시 이전 결과의 늦은 복사 안내가 새 결과에 표시되는 P2는 담당자 수정 후 해결을 확인했다. 추가 제품 변경 요청은 없다. 실제 브라우저 Worker 로드/네이티브 FileReader·Clipboard/모바일/다운로드는 별도 담당 보고서와 구분한다.

## 미연결 도메인 실행

| 파일 | 결과 | 독립 경계 |
| --- | --- | --- |
| `check-line-diff-independent.ts` | 4그룹 PASS | 짧은 중복/빈 줄 수열 14,400쌍에 별도 전체 부분수열 oracle을 적용해 최소 추가+삭제 수와 왼쪽/오른쪽 원문·연속 줄 번호를 대조. CRLF/CR/LF 정규화·마지막 개행·빈 문서·공백/HTML 문자열 보존, 1MiB UTF-8/10,000줄 정확 경계, sentinel 포함 4,000,000 DP 셀과 10,000줄 중 한 줄 수정. |
| `check-markdown-actions-independent.ts` | 5그룹 PASS | md/html/rich 실패의 정확 fallback 유형과 false 판정, 다른 대상 복사/원고 변경 후 늦은 거부의 fallback 차단, await 전 snapshot 고정과 오래된 성공 표시 차단, 파일 type/size 선제 거부·정확 1MiB/빈 파일, 두 읽기 역순 성공/실패와 편집 후 read 호출 차단. |
| `check-line-worker-independent.ts` | 3그룹 PASS | 실제 Worker 모듈을 Node worker_threads의 분리 스레드에서 실행하고 실제 client와 어댑터로 연결. Unicode/개행 결과, UTF-8/DP 한도 typed 오류, 실행 중 supersede 취소와 최신 완료, 생성한 스레드 5개 종료 확인. |
| `check-diff-client-ui.cjs` | 4그룹 PASS | 실제 client/protocol을 실제 Workspace에 연결하고 Worker 포트만 제어. 다른 request ID 무시와 invalidResponse 안내·retry, 종료된 Worker의 늦은 message/error 및 취소 후 오류 무효화, unsupported 구체 안내·원문/이전결과 보존, DiffViewer의 신규 Workspace 1개 연결. |
| `check-markdown-component.cjs` | 8그룹 PASS | 실제 부모·복구 컴포넌트 코드를 상태/DOM I/O 제어 하네스에서 실행. md/html/rich 거부·matching legacy false·rich Blob 형식, 다른 복사/원고 편집 stale, FileReader 역순 완료와 편집/취소/unmount, metadata 선제 검증/읽기 실패/빈 파일, 이미지와 텍스트의 공동 세대/시작 커서/2MiB, readOnly 선택·형식 전환, 현재 자동 저장/MD 다운로드. |

실행: `node docs/verify/2026-11-17-repeat-batch19/<파일명>`. 작성자 기존 검사 전체를 반복하지 않고 독립 oracle과 실패 경계에 집중했다. Node의 기존 module-type 추론 경고 외 오류는 없다. 위 신규 TS 검사 3파일의 범위 ESLint도 exit 0으로 통과했다.

## 확인한 정책과 후속 검토

### P2 해결 — 새 결과에 이전 결과의 복사 성공 안내가 표시됨

`check-diff-copy-generation.cjs`는 실제 `TextDiffWorkspace`를 실행하고 Worker client/clipboard 포트만 대체한다. 원문 편집→비교 대기→이전 결과 복사 시작→새 결과 완료→오래된 복사 성공 순서에서 새 결과 옆에 `actions.copied`가 나타나는 실패를 재현했다. 비교 시작 시 세대는 바뀌지만 결과 확정 이후의 복사 세대가 갱신되지 않던 경계다.

담당자가 결과 확정 직전에 copy 세대와 copy/download 상태를 무효화한 뒤 리뷰어가 동일 명령을 다시 실행해 PASS를 확인했다. 이 1그룹은 위 순수 9그룹과 별도로 기록하며 실제 클립보드 쓰기나 Worker 실행을 검증한 것으로 확대하지 않는다.

- 줄 비교는 CRLF와 lone CR를 LF로 맞춘다. 빈 문자열은 0줄, 마지막 개행은 별도 빈 줄이며 `"\n"`은 2개의 빈 줄이다. 결과 양쪽 재구성은 이 정규화된 원문을 기준으로 한다.
- 4,000,000셀 한도는 DP의 추가 행/열을 포함한다. 1,999×1,999개의 공통 없는 본문은 정확 경계, 2,000×2,000개는 초과다. 공통 앞/뒤 줄을 먼저 제거해 큰 문서의 작은 수정은 계산할 수 있다.
- 복사 세대 가드는 늦은 성공 안내/실패 대안과 fallback 실행을 차단한다. 이미 브라우저 Clipboard API에 제출한 오래된 요청 자체를 취소하거나 OS 클립보드 완료 순서를 보장하지는 않는다.
- 텍스트 파일 메타 검사는 실제 파일을 읽기 전에 수행한다. UI 연결 후 FileReader 오류/취소/새 선택/원고 편집/언마운트와 이미지 읽기의 세대 연결을 확인했다.
- 위 FileReader 검사는 abort가 실제 완료를 막지 못하는 경우도 모사해 이전 파일의 성공/오류가 새 문서를 바꾸지 않음을 확인했다. 파일의 CRLF/끝 개행은 helper가 임의 정규화하지 않고 저장/MD 다운로드까지 유지한다. 입력한 빈 파일은 명시적으로 빈 원고로 반영된다.
- Worker/client/UI의 request identity·이전 callback·취소·지원 불가 안내를 독립 확인했다. 작성자의 기존 실제 UI 8그룹은 편집/교환/비우기/unmount·필터/200줄 페이지·전체 TXT·복구 필드·다운로드 실패·ko/en empty/unchanged를 다루며 읽기 검토했고 중복 집계/전체 반복하지 않았다. Worker 실패 시 메인 스레드 무제한 fallback이 없음을 확인했다.
- 위 분리 스레드 검사는 실제 Worker 모듈과 client의 계산/메시지 동작을 검증한다. 브라우저의 `new URL(..., import.meta.url)` 번들 경로, 실제 Web Worker 지원·로드·네트워크 검증은 별도 브라우저 담당 범위다.
- UI의 복사 실패 읽기 전용 대안, rich payload의 HTML+Markdown, MD Blob의 현재 원문 일치를 확인했다. 복구 대상 변경에 `key={copyRecovery.target}`가 있어 React의 빠른 실패 배치에서도 대상별 초기 형식이 재사용되지 않도록 한 작성자 보완은 정적으로 확인했다. 실제 클립보드 전송·수동 드래그 선택·파일 다운로드와 모바일·Worker 네트워크는 별도 브라우저 담당이 검증한다.
- 19차 부모가 내부 setter 이름을 `setMarkdownState`로 명시한 영향으로 18차의 원고 자동 저장 effect fixture 추출 부분만 호환 처리했다. `check-locale-effects-react.cjs Markdown` 1그룹을 다시 실행해 언어 예제 변경 시 원고/key 보존을 확인했다. Othello/18차 runtime 전체를 반복하지 않았으며 이 1그룹은 위 25그룹에 중복 집계하지 않는다.
- 최종 타입 검사에서 file input의 JSX `onCancel` 미지원이 발견되어 작성자가 native `addEventListener('cancel')` effect로 최소 보완했다. 독립 event harness에 mount effect 이전 ref 주입을 추가하고 실제 `EventTarget.dispatchEvent(new Event('cancel'))`로 기존 Editing/cancel/unmount 1그룹만 재실행해 PASS를 확인했다. JSX 핸들러 직접 호출은 제거했고 이 반복 확인은 위 25그룹에 중복 집계하지 않는다. 신규 TS는 작성/수정하지 않았다.
