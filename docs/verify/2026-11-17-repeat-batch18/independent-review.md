# 18차 공용 영어 번역 독립 검토

담당: writing_versions. 2026-11-17 KST. [실행 계약](plan.md)에 따라 제품 runtime을 직접 수정하지 않고 순수 조회·자원 상태·실제 React 훅·정적 의존성 경로를 검증했다. Chrome/전체 tsc/빌드/배포/패키지 추가는 실행하지 않았다.

## 현재 판정

독립 검토 최종 **29그룹 통과**: 1차 19그룹을 보존하고, 실제 브라우저에서 발견된 실패 import 캐시의 JSON fallback 보완에 추가 10그룹을 실행했다. 최초의 새 EN 소비자 자동 retry 경계와 후속 fallback 경계 모두 독립 수정 확인을 마쳤다. 추가 제품 변경 요청은 없다. 실제 번들러·네트워크와 320px 팝오버 위치의 최종 브라우저 확인은 별도 담당 결과를 따른다.

## 실행 근거

| 검사 | 결과 | 확인한 계약 |
| --- | --- | --- |
| `node scripts/check-scoped-translations.mjs` | PASS | 1차 생성물 1,186개, fallback 추가 후 **1,578개**. KO/EN 완전 재구성, 기존 28,287 순수 legacy parity, 390개 자기 EN namespace의 literal thunk와 해당 hash URL/namespace, 8개 경량 manifest, 기존 6개 정적 그래프. 전체 ko/en JSON·registry·정적 EN 유입을 차단한다. |
| `node docs/verify/2026-11-17-repeat-batch18/check-i18n-lookup.ts` | 4그룹 PASS | 0/false/빈 문자열 보간, 누락·잘못된 scalar의 KO fallback, raw 객체 보완·원본 불변, 길이/재귀 shape가 다른 배열 전체 KO fallback. |
| `node docs/verify/2026-11-17-repeat-batch18/check-i18n-resource.ts` | 5그룹 PASS | 등록만으로 EN 요청 없음, 동시 요청 1회, 실패 영구 pending/자동 반복 없음, 활성 실패만 명시 retry, 교체 이전 success/error 무효화, release 후 실패 공지 제외, malformed 응답·source revision. |
| `node docs/verify/2026-11-17-repeat-batch18/check-i18n-react.cjs` | 초기 7 + 후속 1그룹 PASS | **실제 React** SSR의 등록 KO 79,217경로 문자열/raw/보간 parity, Provider 없는 SSR, 등록 멱등성, 저장 EN의 첫 KO 렌더, registry/direct scoped HMR, 현재 입력과 t 참조 유지, 실패→명시 retry, 늦은 EN→KO 선택 보존, invalid/get/set 차단·정확 `/en/` 세그먼트, 초기 명시 선택과 unmount. 후속 그룹은 신규 EN 소비자 no-retry와 KO→EN/EN 재선택의 명시 retry를 함께 확인. |
| `node docs/verify/2026-11-17-repeat-batch18/check-locale-effects-react.cjs` | 2그룹 PASS | 제품의 effect 전체와 의존성·state/ref 선언을 AST로 추출해 실제 React에서 실행. Markdown의 다른 언어 예제와 같은 명시 원고·저장 key 보존, Othello의 StrictMode/언어 변경에서 chat 중복과 restart 재적용 방지. |
| `node docs/verify/2026-11-17-repeat-batch18/check-i18n-fetch.ts` | 후속 6그룹 PASS | 실제 failed+명시 retry만 context true, 동시 fetch 공유와 성공 cache, HTTP/JSON 재실패 후 재시도, 잘못된/추가 namespace·배열/null 거부, 허용 URL 밖 요청0, 늦은 fallback의 새 resource 덮어쓰기 방지. |
| `check-i18n-react.cjs`의 `Registry failed-import` / `Direct scoped factory forwards` 필터 | 후속 2그룹 PASS | 실제 registry/direct factory에서 retry context를 helper까지 전달. 최초 EN 선택에는 import만 실행, 명시 retry의 fetch 재실패는 KO 유지, 다음 성공 후 cache와 KO→EN 왕복 보존. |
| `node docs/verify/2026-11-17-repeat-batch18/check-generated-fallback-react.cjs` | 후속 2그룹 PASS | 실제 생성 csatGrade 등록모듈과 fuel direct wrapper를 번들링하고 초기 EN import에 실패를 주입. 실제 React에서 KO 요청0, 최초 EN JSON fetch0, 명시 retry가 실제 public hash 파일의 자기 namespace(직접 scope는 shared 포함)만 읽어 EN 복구 및 cache. |
| 범위 ESLint | exit 0 | 1차 수정 `scripts/check-scoped-translations.mjs` 및 신규 순수 TS 검사 2파일. fallback 후에는 변경 scoped 검사와 신규 `check-i18n-fetch.ts`를 다시 확인했다. CJS React fixture까지 lint 통과한 것으로 확대하지 않는다. |

기존 scoped 검사에서 registry의 `useTranslations`를 일반 VM 함수처럼 실행하던 부분은 React hook 전환에 맞춰 동결한 순수 legacy oracle로 분리했다. 기존 문자열/raw/보간/누락 검사를 삭제하지 않았고, registry 자체의 동등성은 별도 실제 React SSR의 전체 등록 경로 검사로 보완했다. 생성기의 누락/잔존/내용 drift 격리 fixture는 통합 담당 소유다.

`minimal-dom.cjs`는 **host element를 렌더하지 않는 컴포넌트**를 위한 최소 컨테이너만 제공한다. 실제 설치된 React/React DOM의 dispatcher·state·effect·useSyncExternalStore·Context를 사용하며 자체 hook 모형으로 결과를 대체하지 않는다. DOM hydration, 레이아웃, 실제 번들 네트워크는 이 fixture의 범위 밖이며 독립 브라우저 담당이 맡는다. 초기 KO 렌더와 저장 EN 적용 순서는 이 fixture에서도 확인했다.

## 재현한 추가 경계

### P2 해결 — 실패한 영어 자원을 새 소비자 mount가 명시 동작 없이 재시도

- 재현: KO에서 `reviewDelayed` namespace를 등록 → EN 선택 → loader 1회 실패 → 언어 변경/재시도 없이 같은 namespace 소비자를 추가 mount.
- 실제: `useResourceTranslations` effect가 매 mount에 `load({ retry: true })`를 호출해 loader 횟수가 1에서 2로 증가한다. 일반 rerender 루프는 아니지만 지연 표시/화면 이동에 따라 실패 자원을 자동 재요청한다.
- 근거: `node docs/verify/2026-11-17-repeat-batch18/check-i18n-react.cjs delayed`가 `2 !== 1`로 실패했다. 이 가능성은 runtime 작성자가 먼저 제기했고 리뷰어가 실제 React에서 확인했다.
- 수정: 신규/최초 EN mount는 기본 load, 같은 hook의 KO→EN 전환과 명시 retry만 실패 상태를 재시도하도록 직전 effect의 언어를 구분한다. source replacement의 idle 자원은 기본 load로 정상 로드한다.
- 확인: `check-i18n-react.cjs delayed` 통과. 기존 실패 뒤 신규 소비자를 추가해도 요청 1회, KO→EN 명시 전환 뒤 2회, EN 재선택 뒤 3회임을 확인했다. `Failure remains`, `Stored EN`, `Registry HMR`, `Replacing a direct` 필터의 기존 영향 4그룹도 각각 재확인했다. 이 4개 반복 실행은 총 19그룹에 중복 집계하지 않는다. 초기 전체 SSR/parity를 불필요하게 반복하지 않았다.

## 원고·게임 회귀 보완

taxi 담당의 [호출부 감사](locale-effect-audit.md)와 11그룹 effect/handler 검사는 위 29그룹에 중복 집계하지 않는다. 독립 2그룹은 실제 React 의존성 실행을 추가 확인한다. Markdown에서 KO→EN만 바뀔 때 자동 저장이 다시 예약되지 않고, 실제 원고 수정 때는 저장된다. Othello에서 기존 message 객체는 StrictMode 재setup과 t 변경에 재적용되지 않으며 새로운 같은 내용 객체는 새 메시지로 처리된다. 게임 엔진/실제 WebRTC 전체 재검증을 주장하지 않는다.

## 후속 import 캐시 복구 경계

실제 브라우저 담당이 발견한 문제는 loader 함수의 Promise를 초기화해도 번들러 내부의 실패한 dynamic import 캐시는 복구되지 않을 수 있다는 것이다. 신규 fallback은 **이미 failed 상태인 자원의 명시 retry**에서만 동작한다. 초기/idle 로드는 literal import를 유지하고, 실패 뒤에는 namespace와 내용 hash가 고정된 같은 사이트의 public JSON을 읽는다. 성공만 공유하고 HTTP/JSON/namespace 검증 실패는 cache에서 제거해 다음 명시 재시도를 허용한다.

추가 10그룹은 초기 19그룹과 별개이며 전체 79,217 SSR parity를 불필요하게 반복하지 않았다. 실제 생성 모듈 검사에서 EN import만 의도적으로 실패시켰고 fetch 포트는 URL이 가리키는 **실제 생성 public 파일**을 읽어 Response로 반환했다. 브라우저 번들러의 캐시 구현을 이 Node fixture가 재현했다고 주장하지 않으며, 생성된 retry 분기·resource context·React 전환·실제 자산 대응을 검증한 근거다.

## 한계

- 이 작업은 기존 한국어/영어 원본의 선택·fallback 복원 검토다. 영어 SEO/metadata나 하드코딩 문구까지 전체 영어화한 것은 아니다.
- 기본 등록 KO와 필요한 scope의 EN 로딩 계약을 확인하며 실제 페이지 이동의 요청량/캐시/모바일 표시는 브라우저 보고서를 따른다.
- InstallPrompt는 현재 layout에 mount되지 않는 기존 상태다. pwa/common 키 분리와 전체 registry KO parity는 확인했지만 실제 설치 이벤트 팝업 렌더는 이 독립 검사의 범위에 포함하지 않았다.
- 새 lookup은 배열 구조가 다르면 KO 배열 전체를 유지한다. 통합 담당이 확인된 두 원본 배열 길이를 맞춘 결과와 이 일반 fallback 동작은 별개 근거다.
- Node의 기존 module-type 추론 경고 외 최종 검사 오류는 없다. 후속 실패 1그룹의 최초 재현과 수정 확인을 위에 별도 기록했다.
