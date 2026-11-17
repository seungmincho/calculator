# 39 정규식 부모 연결 — 자체 검증 완료

2026-11-17. 36/37 타입 체크포인트 뒤 연결했다. **제품 final ready / TS 편집 중지.** 실제 Chrome과 전체 타입은 지정 담당자가 이어 확인한다. 빌드·Chrome·전체 tsc·배포·커밋은 실행하지 않았다.

## 연결한 파일

- 기존 `src/components/RegexExtractor.tsx`: 프리셋·스마트 모드·가이드·기존 계산 이력은 유지하면서 main-thread 사용자 정규식 실행 루프와 개별 URL 쓰기를 제거했다.
- 새 `src/hooks/useRegexWorkspace.ts`: 300ms debounce, 실제 client, 취소/재시도, hidden/pagehide, 초기/외부 URL 복원과 자기 쓰기 구분, 마지막 성공 snapshot, FileReader, 전체 복사/TXT 수명.
- 새 `src/components/RegexResultPanel.tsx`: 현재 실행과 이전 성공 결과를 구분한다. 출력 50,000자/상세 5개는 미리보기이고 전체 건수·복사·TXT는 정확한 성공 snapshot이다. 빈 결과도 정상 완료. 50k 초과 복사 복구 원문은 명시 버튼으로 펼쳐 전체를 선택한다.
- 새 `src/utils/regexActions.ts`: 결과/현재 입력 링크/TXT의 공통 request token, native 실패 뒤 최신 요청만 legacy fallback, 정확한 성공 판정과 수동 선택 복구. 기존 화면은 ShareResult를 쓰지 않았으며 이번에도 추가하지 않았다.
- 준비된 engine/client/protocol/Worker/URL helper를 재사용했다. `regexEngine.ts`의 공백만 있는 패턴 거부는 수정해 **빈 문자열만** 거부한다. 공백/탭/개행 정규식은 실행한다.
- `translations-regex.json`: KO/EN execution **59leaf**, 동일 키·placeholder 대조 PASS. canonical/meta/기존 guide는 integrator가 병합했다.

## 입력·결과·파일·URL 계약

Worker 실패·취소·시간 초과 때 마지막 성공 결과를 남기고, 이전 결과라는 안내를 복사/TXT 버튼 가까이에 표시한다. 현재 입력과 성공 snapshot이 일치하고 완료 상태일 때만 이력 저장/입력 링크 복사가 가능하다. smart dedupe/uppercase는 enum이 포함된 Worker job이며 예전 debounce/Worker를 먼저 무효화한다. 비전역 extract의 전체 일치+캡처 의미와 URL의 빈 flags를 보존한다.

초기 URL 복원 전 쓰기는 없고, 이미 발생한 사용자 편집은 partial patch로 보관해 초기 URL 위에 적용한다. 초기 입력을 비활성화해 편집을 버리는 해결로 끝내지 않았다. unknown query·hash·history.state를 유지하며 같은 query의 hash popstate는 재복원하지 않는다. URL 16,384자 초과/인코딩 불가이면 모든 이전 소유 key를 제거하고 링크 복사를 막는다. replaceState 자체가 실패하면 이전 주소일 수 있음을 알리고 링크 복사를 차단한다.

파일은 이전 read를 abort하고 token을 바꾼다. 편집/새 선택/언마운트 뒤 늦은 load/error는 무효다. 4MiB/디코딩1M 초과·읽기 실패는 입력을 남긴다. **중지·hidden·pagehide는 Worker와 FileReader를 함께 취소**하고 reading을 해제한다. 돌아온 뒤 자동 실행하지 않으며 새 편집/선택·명시 재시도로 재개한다. 5초는 Worker 중단 기준이며 background timer의 엄격 wall-clock 보장이 아니다.

출력 복사/링크/TXT는 같은 guard를 사용한다. input/locale A→B→A와 새 결과 확정에서 옛 성공/실패/타이머·fallback을 차단한다. 선택 실패도 안내하고 원문을 남긴다. OS에 이미 전달한 clipboard 쓰기를 취소한다고 주장하지 않는다. TXT는 `regex-{operation}-result.txt`, UTF-8 전체 성공 문자열이며 URL 해제 수명을 소유한다.

## 자체 검증 — 총 37그룹

준비 **23그룹**(engine10/client8/URL5)은 이전 PASS를 유지했고 반복하지 않았다. 준비 actual Node worker thread 8생성/8종료와 root 별도 native oracle4도 기존 증거로 유지한다.

```powershell
node docs/verify/2026-11-17-repeat-batch39/check-regex-parent.mjs
node scripts/check-regex-engine.ts whitespace-only
npx eslint src/components/RegexExtractor.tsx src/components/RegexResultPanel.tsx src/hooks/useRegexWorkspace.ts src/utils/regexActions.ts src/utils/regexEngine.ts scripts/check-regex-engine.ts docs/verify/2026-11-17-repeat-batch39/check-regex-parent.mjs docs/verify/2026-11-17-repeat-batch39/regex-parent-harness.mjs
```

- 실제 부모 **13그룹 PASS**: 첫12그룹 실행 뒤 독립 발견 영향1그룹을 추가했다. 마지막 패치 뒤 새 boundary1 + 초기 Strict/URL 영향1을 선별 재확인했다. 전체13을 마지막 패치 뒤 전부 다시 돌렸다는 뜻은 아니다.
- 실제 parent/hook/client/protocol을 사용하고 Worker 포트·DOM/Clipboard/FileReader만 제어했다. 초기/외부/손상 URL·Strict, cancel/hidden/pagehide·늦은 작업, smart3, 이전 성공/빈 결과/상세 vs 전체 수, 이력 실패·구형 replacement/flags, URL 초과/쓰기 실패, 파일 선택/편집/한도, 양방향 copy·A-B-A·늦은 성공, 전체 TXT/URL 해제, 실제 child KO/EN50k preview/60k 복구를 확인했다.
- 엔진 공백 전용 **1그룹 PASS**, native oracle **24개**(space/tab/newline/mixed, g/비전역, grep/replace/extract)와 빈 패턴 거부.
- 최종 영향 **8파일 scoped ESLint exit0, 오류/경고0**. KO/EN fragment59leaf·placeholder 일치.

초기 fixture는 실제 client와 bundled hook이 서로 다른 Error class를 사용해 code를 workerFailed로 읽었다. protocol 포트를 공유해 제품과 같은 class identity로 고쳤다. 비동기 copy 직후 부족한 microtask 대기도 보완했다. 둘은 제품 결함으로 세지 않는다. 설치되지 않은 Python 편집 명령은 실행되지 않았고 Node로 실제 파일을 수정했다.

## 독립 발견과 수정

team이 초기0ms 복원 전 편집 유실, 공백 정규식 차단, 파일 읽기 중 취소 뒤 늦은 load 재실행을 재현했다. 위 정책대로 수정했고 자기 영향 검사와 독립 **9그룹 PASS**를 받았다. 늦은 debounce callback에도 request/revision 선검사를 추가해 새 Worker를 취소하지 않게 했다. native clearTimeout이 실제로 취소 실패했다는 주장과 구분한다. 독립 근거는 team 소유 JS/MD에 별도 기록한다.

## 브라우저 인계 selector

- 입력: `#regex-pattern`, `#rx-replacement`, `#regex-input`, `[data-regex-file]`.
- 결과/상태: `#regex-extractor-result`, `[data-regex-status]`, `[data-regex-output]`, `[data-regex-previous]`, `[data-regex-url-error]`, `[data-regex-file-error]`.
- 작업: `data-regex-action`의 개별 값 `cancel`, `retry`, `copy`, `download`, `link`, `save`. 상태는 waiting/running/canceled/error/complete/idle.
- 복구: `[data-regex-copy-status]`, `#regex-copy-manual`; 50k 초과면 전체 원문 열기 버튼을 먼저 누른다.
- 스마트/프리셋은 기존 번역 버튼과 aria-pressed 유지. 실제 Worker bundle·역추적 heartbeat/취소·기본5초 timeout·native Clipboard·실제 파일/TXT·320 KOEN은 verifier 담당이며 자체 검사와 구분한다.

## 실제 브라우저 import 결함 보완

첫 실제 Chrome 진입에서 `useLocale`을 export하지 않는 `@/lib/i18n`에서 가져온 오류로 페이지500/compile overlay가 발생했다. 기능 검증8건 실패가 아니라 **단일 import 통합 결함으로 기능에 진입하지 못한 것**이다. 기존 제어 fixture가 가상의 useLocale export를 공급해 이를 놓쳤다.

실제 `LanguageContext.tsx`의 `useOptionalLanguage` export를 확인하고, 부모를 `useOptionalLanguage()?.language ?? 'ko'`로 최소 수정했다. fixture도 해당 실제 경로만 제공하며 실제 두 파일의 export 선언을 확인한다. 영향 locale/copy A→B→A 그룹1 PASS, 부모+fixture 범위 lint exit0·오류/경고0. 제품 TS 다시 동결했으며 verifier가 새 context로 실제8흐름을 다시 시작한다. native 통과를 아직 주장하지 않는다.
