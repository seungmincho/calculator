# 18차 준비 설계 — 공용 영어 번역 복원

2026-11-17 KST. [공용 UX 후보](2026-11-17-shared-ux-candidates.md)를 읽고 코드·메시지 원본·생성기를 대조했다. 이 조사에서 제품/공용 파일, 생성물은 수정하지 않았고 브라우저·tsc·빌드는 실행하지 않았다. 구현은 17차 완료와 root의 18차 계약/소유권 신호 이후다.

**권장안은 순수 lookup·공통 lazy 훅·namespace registry의 역할을 분리하는 것이다.** 기존 KO 분할과 직접 wrapper를 유지하면서 EN loader만 연결한다. `shared.ts`를 registry 별칭으로 만들거나 전체 `en.json`을 import하지 않는다.

## 확인한 세 경로와 실제 영향

| 경로 | 코드 근거 | 실제 영향 |
| --- | --- | --- |
| 일반 도구 registry | `src/lib/i18n.ts`는 KO shared와 `registerMessages`의 KO namespace만 읽음 | Grade/Csat/Notepad/JSON/Timer 등 본문이 언어 선택과 무관하게 KO. 직접 registry import component/hook은 조사 시점 424파일 |
| 공용 scope | `src/lib/i18n/shared.ts`는 순수 KO factory만 사용 | Footer, ShareResult, MobileResultLink, ToolsShowcase 등의 KO가 남음 |
| 기존 EN lazy scope | `navigation.ts`의 factory와 salary/loan/fuelCalculator/runningPace/subsidies wrapper | Header·검색과 급여/대출/연료/달리기/지원금은 이미 EN lazy 지원. 실패 Promise 영구 보관과 catch/명시 재시도 부재를 함께 수정해야 함 |

`generate-scoped-messages.mjs`는 ko/en shared+기존 7개 scope를 생성하지만 일반 `ns/<name>.json` 및 등록 모듈은 KO만 생성한다. 원본 대조 시 ko/en 각각 408개 namespace, KO에만 있는 키와 중첩 타입 불일치 0개였다. 번역 품질이나 실제 화면 검증 결과는 아니다.

`LanguageContext.tsx`는 초기 KO지만 localStorage get/set에 예외 보호가 없고 저장값을 타입 단언만 한다. `pathname.startsWith('/en')`는 실제 `/energy-voucher/`, `/enneagram/`, `/env-editor/`까지 EN으로 오인한다. 경로 fallback을 유지한다면 `/en` 또는 `/en/` 세그먼트만 인정해야 한다.

## 모듈/API 계약 제안

아래 이름은 실행 계약에서 확정할 제안이다. 기존 도구의 `useTranslations` 호출 API는 유지한다.

| 소유 모듈 | API/역할 | 보존 조건 |
| --- | --- | --- |
| `translationLookup.ts` | `createTranslations(primary, fallback?)`: React 없는 순수 문자열/raw 조회 | 기존 중첩 조회·보간·missing-key·raw 계약과 EN→KO 타입 fallback |
| 신규 `lazyTranslations.ts` | `createLazyEnTranslations(ko, loadEn, resourceId)`와 자원 상태/cache/subscription | scope별 pending 공유, 성공 cache, 실패 상태, revision별 HMR 무효화. 전체 catalogue import 금지 |
| `i18n.ts` registry | `registerMessages(koNamespaces, loadEn?)`, 기존 `useTranslations(namespace?)` | KO 동기 등록은 유지. 사용 중인 namespace의 EN만 요청하고 관련 catalogue 변경만 구독 |
| `navigation.ts`/`shared.ts`와 직접 wrapper | 공통 factory에 자기 KO 데이터와 EN loader 전달 | scoped dependency graph 유지. shared는 navigation의 공용 hook을 재노출해도 되지만 registry alias는 금지 |
| `LanguageContext.tsx` | 기존 `useLanguage`, 제안 `useOptionalLanguage`, 안정적인 `changeLanguage`, retry token | 값 검증/저장 차단 보호. Provider 없는 generic hook은 KO. 기존 strict `useLanguage` 계약은 별도 유지 가능 |
| 공통 자원 상태 + `LanguageToggle.tsx` | 제안 `useTranslationLoadState()`/`retryTranslations()` | 현재 필요한 자원 실패만 안내하고 명시적으로 재시도. UI에는 내부 namespace 이름을 노출하지 않음 |
| 메시지 생성기 | KO 등록 모듈에 자기 EN namespace의 리터럴 `import()` thunk 등록 | EN ns 생성·stale 정리·check 추가. 원본만 수정하며 생성물 수작업 금지 |

순수 lookup을 유지해야 `check-scoped-translations.mjs`가 React hook을 VM에서 직접 실행하지 않고도 기존 문자열/raw 동등성을 검증할 수 있다. registry KO 동등성은 별도 React fixture로 이전하며 기존 검사를 삭제하거나 약화하지 않는다.

## 동작 계약

1. **KO 초기 화면:** 서버와 첫 hydration은 KO. 저장 EN은 초기화 effect 뒤 적용한다. 전역 Suspense/본문 숨김/언어별 key로 remount하지 않는다. KO 상태에서는 EN 요청 0회가 기준이다.
2. **필요한 EN만:** module 등록은 KO와 loader만 보관하고 EN을 요청하지 않는다. English 선택 + 해당 scope 사용 시 요청한다. 예전에 KO로 방문한 namespace가 registry에 남아 있다는 이유로 모두 EN 로드하지 않는다. shared EN과 같은 namespace 동시 요청은 중복을 막는다.
3. **타입 보존 fallback:** EN 문자열이 없거나 타입이 다르면 KO 문자열을 사용한다. raw 객체는 KO 구조를 기준으로 보완하고 호환되지 않는 배열은 KO 배열 전체로 돌아간다. 인덱스 의미를 모르는 배열 항목을 KO/EN으로 임의 혼합하지 않는다. 양쪽 모두 없는 원래 잘못된 키는 별도 audit 대상이며, runtime이 번역을 만들어 내지는 않는다.
4. **실패/재시도:** reject를 처리해 KO를 유지하고 pending Promise를 해제하되 실패 상태를 남긴다. 재렌더에 따른 무한 자동 재시도는 금지한다. '일부 영어 내용을 불러오지 못했어요. 다시 불러오기' 정도의 제품 문구와 버튼을 제공한다. 명시 재시도 또는 KO→EN 재선택에서만 실패 자원을 재요청한다. 이미 EN일 때 같은 언어를 고르는 경우에도 retry token으로 재시도 가능해야 한다.
5. **늦은 응답/HMR:** EN 대기 중 KO로 바꾸면 늦은 응답이 선택 언어를 되돌리지 않는다. unmount 후 state 갱신을 막고 성공 cache는 재사용할 수 있다. KO/EN loader가 HMR로 교체되면 revision을 갱신해 예전 응답/실패 Promise가 새 catalogue를 가리지 않게 한다.
6. **입력과 함수 참조:** 실제 locale/catalogue 변경 때만 t 참조를 바꾸고 관계없는 namespace의 완료로 바꾸지 않는다. GuideSection의 `[t]` memo는 실제 번역 변경을 반영해야 한다. 번역 때문에 점수·원고·타이머·URL·저장 기록을 재초기화하지 않는다. 대표 도구의 `[t]` effect/callback이 원고나 기본값을 재설정하는지는 독립 리뷰 과제로 둔다.
7. **저장소/Provider:** 저장 언어와 changeLanguage 런타임 인자는 ko/en만 인정한다. getItem/setItem이 실패해도 초기화를 완료하고 메모리에서 언어 전환한다. production layout은 Provider로 앱을 감싸지만, Provider 없는 SSR/독립 컴포넌트 fixture는 optional context→KO로 동작해야 한다. 조건부 hook 호출이나 useLanguage 예외 포착으로 우회하지 않는다.

namespace 없는 root 조회를 주의해야 한다. 공용 labelKey를 쓰는 Header/InquiryForm/YearEndChecklist는 shared로 해결되지만 **InstallPrompt는 root hook으로 `pwa.*`를 읽는 실제 비공용 사례**다. 최소 수정은 `useTranslations('pwa')`와 키 접두사 정리다. 비공용 root 호출은 audit에 포함해 명시 namespace로 바꾸고, root 조회를 위해 등록된 모든 EN을 내려받는 방식은 사용하지 않는다. 기존 KO root 조회 호환성은 유지한다.

## 파일 소유 제안

| 담당 역할 | 파일 |
| --- | --- |
| 공용 runtime 담당 1명 | `src/lib/i18n.ts`, `src/lib/i18n/translationLookup.ts`, 신규 lazy 훅, navigation/shared와 직접 scope wrapper |
| 같은 runtime 담당 또는 순차 담당 | `src/contexts/LanguageContext.tsx`, `src/components/LanguageToggle.tsx`, 필요한 InstallPrompt 최소 변경 |
| 공용 메시지 담당 1명 | `scripts/generate-scoped-messages.mjs`, `messages/ko.json`·`en.json`의 안내 키, 생성물 전체 |
| 독립 코드/fixture 담당 | scoped lookup/graph 검사, lazy/HMR/SSR/Context fixture, 대표 `[t]` 의존성 리뷰 |
| 단일 브라우저 담당 | 실제 언어 선택/실패/재시도/입력 보존/네트워크·hydration 검사 |

runtime API와 생성 모듈 등록 형식을 먼저 맞추고, 생성물 준비 후 부모 경로를 연결한다. 16~17차 진행 중 공용 runtime을 먼저 바꾸지 않는다.

## 검증 경계

- **생성·정적 graph:** ko/en 원본의 완전 재구성, stale/check, namespace audit를 유지한다. 기존 6개 진입(layout/home/loan/salary/fuel/running)에 전체 ko.json/en.json과 registry가 새로 들어오지 않는 assertion을 유지한다. EN ns의 동적 경로도 자기 namespace로 한정하는 검사 추가.
- **순수 lookup:** 기존 VM oracle의 중첩/raw/보간(0·false·빈 문자열)/누락/멱등 등록/reconstruction을 보존한다. EN 누락·잘못된 문자열/배열/객체 fallback을 추가하고 registry의 KO parity는 React fixture로 검증한다.
- **hook/SSR:** KO에서 EN 0요청, 동시 mount 1요청, reject→KO 유지→명시 재시도 성공, 무한 retry·unhandled rejection 0, KO 복귀 후 늦은 응답, unmount, HMR 교체, t 참조 안정성. 기존 `check-lazy-i18n-refresh.mjs`의 factory 교체 보장 유지. Provider 유무, 저장 EN의 KO 첫 hydration, invalid language/get/set 차단, `/energy-voucher/` 등의 경로 판정 확인.
- **대표 화면:** 일반 registry는 Grade/Csat(저장 입력·raw 가이드), Notepad 또는 JSON(원문), Timer(실행 상태)로 확인한다. 직접 wrapper는 Fuel/Salary/Loan 및 Running/Subsidies 중 경로를 대표하도록 고른다. Header와 Footer/ShareResult/MobileResultLink가 함께 EN으로 바뀌는지 확인한다. 동적 GuideSection, InstallPrompt, 별도 client인 SvgEditor도 계약별 fixture에 포함한다.
- **Network:** KO 방문에서 EN catalogue 요청이 없어야 한다. KO로 여러 도구를 방문한 뒤 현재 도구에서 EN을 선택해도 필요한 분할만 요청해야 한다. 새 도구 이동·저장 EN 재방문·EN chunk 실패·재시도에 근거를 남긴다.
- 브라우저 종료 후 통합 담당이 전체 타입 검사를 순차 실행한다. 빌드/배포/새 영어 route/SEO는 별도 요청 없이 수행하지 않는다.

## 확인된 한계와 범위 밖

- 원본 배열 길이가 다른 두 경로는 조사 시점 `emojiPicker.guide.tips.items`(KO4/EN3), `lunarConverter.guide.howToUse.items`(KO4/EN3)다. 길이까지 같아야 한다는 안전한 fallback을 택하면 해당 목록은 KO로 남는다. 17차 메시지 변경을 포함한 최종 원본에서 재확인하고, 이를 전체 영어 완료로 보고하지 않는다.
- component/hook의 번역 사용 455파일을 AST로 읽어 모듈 최상위 useTranslations 호출은 없음을 확인했다. 앱 밖 직접 호출은 scoped 검사 VM oracle에서 확인했다. 모든 컴포넌트의 Provider 배치/입력 보존을 브라우저로 검증했다는 뜻은 아니다.
- `useMessages.ts`는 전체 JSON을 가져오는 옛 경로이며 조사한 src에 사용처가 없었다. `src/i18n.ts`의 next-intl request config와 함께 이번 client 복원의 우회로로 사용하지 않는다.
- server page의 KO metadata/JSON-LD, CategoryHubPage의 SEO 본문, 하드코딩 예시, 이미 state에 저장한 과거 알림 문자열은 자동 번역 완료 범위가 아니다. API/MCP의 `toolSearch.ts`, Functions 대시보드/지도용 `everland/render.ts`를 client 경로로 옮기지 않는다.
- 완료 표현은 '기존 번역 경로의 영어 선택·fallback 복원'으로 한정한다. 모든 문구가 영어가 되었거나 영어 검색 색인이 완료됐다는 주장은 하지 않는다.
