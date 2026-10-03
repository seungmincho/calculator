# 공통 번들 측정 및 최소 분리 설계 (2026-10-03)

## 측정 범위

운영 사이트 `https://toolhub.ai.kr`의 홈, 연봉, 대출 페이지 HTML에 포함된 Next.js 스크립트를 읽었다. API 호출·배포·사이트 변경은 하지 않았다. 로컬 수정본의 Webpack 정적 빌드도 동일한 방식으로 측정했다.

`scripts/measure-shared-bundle.mjs`는 압축 해제된 JS 바이트를 계산한다. gzip/Brotli 수치는 로컬 압축 추정값이며 실제 브라우저 전송량이 아니다. 운영 응답은 `Content-Encoding: br`였으나 해당 번들의 `Content-Length`가 없어 실제 압축 전송량은 확인하지 못했다. LCP·INP·CLS와 방문자 트래픽은 측정하지 않았다.

## 확인한 수치

| 대상 | 스크립트 수 | 압축 해제 JS 합계 (bytes) | gzip 추정 합계 (bytes) |
| --- | ---: | ---: | ---: |
| 운영 홈 | 16 | 3,326,472 | 1,009,937 |
| 운영 연봉 | 17 | 3,415,429 | 1,029,598 |
| 운영 대출 | 16 | 3,354,293 | 1,019,312 |
| 로컬 Webpack 홈 | 15 | 3,302,257 | 998,872 |
| 로컬 Webpack 연봉 | 19 | 3,399,590 | 1,022,962 |
| 로컬 Webpack 대출 | 17 | 3,339,308 | 1,013,171 |

운영 공통 청크 `/_next/static/chunks/30814c2c67a007ea.js`는 **2,371,417 bytes** (gzip 추정 731,926 bytes)이며, 로컬 공통 청크 `/_next/static/chunks/90613-29ebfdee9b2d1cff.js`는 **2,384,261 bytes** (gzip 추정 732,226 bytes)다. 두 청크 모두 350개 최상위 번역 키가 문자열 검사에서 발견됐다. 이 키 검사는 빠른 확인용이며, 의존성 근거는 `src/lib/i18n.ts`의 전체 `messages/ko.json` 정적 import다.

현재 수정본 `ko.json`의 최소화 JSON은 2,369,845 bytes (gzip 추정 730,948, Brotli 추정 540,095)다. 운영 측정의 번역 JSON 크기도 로컬 소스에서 계산하므로 운영 소스와 완전히 동일하다고 단정하지 않는다. 번들러·환경이 다른 운영/로컬 수치로 이번 수정의 성능 향상을 주장할 수 없다. 이번에는 분리를 구현하지 않았다.

## 전체 import를 없애야 하는 지점

`useTranslations()`와 `t.raw()`가 동기식으로 전체 JSON을 읽는다. 루트 `layout.tsx`의 정적 import 그래프에서 29개 소스 파일을 확인했으며, 참조되는 번역 namespace는 다음 12개다.

`accessibility`, `common`, `dailyTips`, `favorites`, `footer`, `header`, `homePage`, `mobileNav`, `navigation`, `pushNotification`, `searchDialog`, `toolsShowcase`

이 namespace 전체를 묶은 보수적 후보는 46,284 bytes (gzip 추정 16,002, Brotli 추정 13,459)다. **완성된 분리 결과나 예상 최종 번들 크기가 아니다.** 페이지별 `RelatedTools`, 공유 UI, 가이드, 동적 메뉴 키 등은 추가 확인해야 한다. `homePage`는 공통 BackToTop 문자열 하나 때문에 포함되므로 검증 후 키 단위로 줄일 여지가 있다.

Header, Footer, ToolsShowcase 등도 전체 번역 모듈을 참조한다. 계산기 하나만 바꾸면 공통 UI의 import 경로가 남아 전체 JSON이 계속 로드된다. 공통 UI와 파일럿 페이지를 함께 전환해야 한다.

## 다음 실행의 최소 변경 설계

1. `getNestedValue`·보간·번역 함수 생성 로직을 JSON import 없는 순수 모듈로 분리한다. 기존 `t(key, vars)`, `t.raw(key)`와 누락 키 처리 동작을 보존한다.
2. 원본 `ko.json`·`en.json`을 유지하고, 빌드 전에 공통/페이지 번역 파일을 생성한다. 공통 UI의 정적 키뿐 아니라 메뉴 설정에서 만들어지는 키와 `t.raw()` 배열/객체도 명시적으로 포함한다. 누락 키·양 언어 구조 차이를 생성 단계에서 검사한다.
3. 공통 UI는 생성된 공통 메시지만 정적 import한다. 파일럿은 대출 페이지 하나로 시작하고, 해당 페이지의 번역과 가이드·공유·관련 도구 의존성을 함께 공급한다. 공통 UI를 타고 전체 JSON이 다시 import되지 않는지 확인한다.
4. 페이지의 Server Component에서 작은 메시지 맵을 `I18nWrapper`/동기식 client provider에 전달한다. 공통 번역 모듈과 페이지 provider를 구분하되 기존 번역 API는 유지한다. 같은 맵을 client import와 HTML 직렬화에 중복 포함하지 않는다. 전환하지 않은 페이지의 호환 경로가 파일럿의 공통 청크에 전체 JSON을 끌어오지 않도록 모듈을 나눈다.
5. 기존 본문을 비동기 Suspense로 감싸지 않는다. `I18nWrapper.tsx`에 기록된 정적 HTML 본문 누락·hydration 문제를 다시 만들지 않도록 페이지를 동기 렌더한다. 영어 활성화는 별도 범위다.

파일럿 완료 기준: 정적 HTML에 제목·입력·가이드 본문이 존재하고, 페이지 및 공통 client 의존성에서 전체 JSON import가 제거되며, 실제 생성된 초기 스크립트 크기가 감소해야 한다. 대출 저장/복원, 모바일·다크모드, 메뉴·검색·관련 도구 이동, `t.raw()` 가이드, 대표 페이지 10개의 번역 누락과 hydration 오류를 확인한다. 최종 합계에는 페이지 메시지의 HTML/RSC 직렬화 비용도 포함한다.

## 재현 명령

저장소 루트에서 실행한다. 로컬 측정은 사용자가 승인한 빌드가 완료된 `out`을 사용한다.

```powershell
node scripts/measure-shared-bundle.mjs --url https://toolhub.ai.kr
node scripts/measure-shared-bundle.mjs --dir out
```

## 원본 저장소의 최종 빌드 확인

`C:\projects\salary-calculator`에서 승인된 `npm run build`의 기본 Turbopack 빌드가 통과했고, 756개 정적 페이지와 기존 RSC 경로 후처리(1,224개 파일)를 생성했다. 해당 `out`으로 측정한 결과는 다음과 같다.

| 대상 | 스크립트 수 | 압축 해제 JS 합계 (bytes) | gzip 추정 합계 (bytes) |
| --- | ---: | ---: | ---: |
| 최종 로컬 홈 | 16 | 3,326,652 | 1,010,007 |
| 최종 로컬 연봉 | 17 | 3,415,609 | 1,029,668 |
| 최종 로컬 대출 | 16 | 3,354,937 | 1,019,534 |

공통 번들 `/_next/static/chunks/d292c2db44ca20c0.js`는 2,371,597 bytes (gzip 추정 731,996)로, 전체 번역 키 350개가 여전히 발견된다. 이번 작업은 공통 번들을 줄이는 구현을 포함하지 않았다. 안내 문구·복원 로직을 추가한 최종 결과에 대해 실제 전송 속도 개선을 주장하지 않는다.

이 정적 결과물에서 대출·유가 브라우저 회귀 11개(모바일·다크모드 포함)가 모두 통과했다. 작업 사본의 Webpack 빌드는 환경 비교 기록이며, 최종 제품 검증은 원본의 기본 빌드를 기준으로 한다.
