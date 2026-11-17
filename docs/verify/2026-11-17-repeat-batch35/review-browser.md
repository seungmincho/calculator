# 35차 실제 서비스워커 검증

**최종5/5 PASS, 2026-11-17 05:36:55 KST.** 단일 Chrome·임시 서버 모두 종료했다. 기존3039와 사용자 브라우저/운영 캐시에 접근하지 않았다. 실행기 `scripts/check-repeat-batch35-browser.mjs`는 무작위127.0.0.1 포트에서 실제 `public/sw.js`와 합성 문서·아이콘만 제공한다. serviceWorkers allow인 격리 컨텍스트를 흐름마다 새로 사용하며 외부 origin은 차단한다. CSV/29 결과와 합산하지 않는다.

최초5흐름 중 activate 캐시 보존1개가 통과했다. 아래 기존 navigation 결함과 fixture 경계를 구분한 뒤 영향4흐름만 재실행했다. 그중 favicon 부수 조회 횟수 기대값1건을 보정해 해당 흐름만 최종 재확인했다. activate 제품 코드는 추가로 바뀌지 않아 최초 통과를 유지했다.

| 실제 흐름 | 최종 결과 |
|---|---|
| activate CacheStorage 소유권 | 구 소유6개만 삭제. 현재3개+transformers/webllm4개+미지/유사명7개, 총14개 캐시의 이름과 합성6바이트 payload를 정확 보존 |
| 정상·캐시 오프라인 문서 | 실제 navigation→정규화 `/visited-page/?probe=35` 캐시 생성, 합성 header/cookie 전달. 실제 offline 전환 뒤 해당 문서와 `/offline/` 캐시를200/fromServiceWorker Response로 반환 |
| offline 캐시 부재 | 격리 원점의 `/offline/`를 제거한 뒤 첫 경로 탐색이 생성HTML200/text-html 반환. 실제2,777바이트 파일·타이틀·화면 확인. 비문서 미캐시 자원은 기존408 |
| cache lookup 거부 | 실제 Worker의 offline lookup만 거부하거나 initial+fallback 모두 거부해도HTML200. 네트워크가 있을 때 initial lookup 거부는 실제 서버 응답으로 복구 |
| 기존 정상 전략 | 정적 자원 두 조회에 실제 서버 요청1회. dynamic `/tips/`는 stale 즉시 반환 뒤 정규 키로 배경 갱신. API GET은 매번 네트워크, POST/세 놀이공원 경로는 캐시 미저장 |

최종 pageerror·Worker error·unhandled rejection0, 외부 요청0. 의도된 비문서 offline408 console은 제품 JS 예외와 구분한다. 캐시 버전은 현재3개 모두v4.35.16을 유지했다. 실제 모델을 다운로드하거나 사용자 모델 캐시를 열지 않았으며, 합성 바이트 보존을 실제 모델 실행 검증으로 확대하지 않는다.

## 실제 브라우저에서 찾은 기존 제품 결함

온라인 `/visited-page` 탐색이 정규화 캐시에 들어가지 않았고, 오프라인 문서 탐색은 `ERR_INTERNET_DISCONNECTED`로 끝났다. actual Worker에 error/fetch listener를 추가해 다음을 독립 수집했다.

```text
sw.js:86 Uncaught TypeError: Failed to construct 'Request':
Cannot construct a Request with a RequestInit whose mode member is set as 'navigate'.
fetch mode=navigate, destination=document
```

기존 `new Request(normalizedUrl, event.request)`가 navigation Request의 readonly mode를 RequestInit로 복사해 respondWith 이전에 실패한다. 작성자의 VM fixture는 일반 Request mode여서 이 경계를 놓쳤고, 작성자도 실제 Request 생성자로 추가 재현했다. 이는 이번 캐시 소유권 수정으로 발생한 회귀가 아니라 실제 navigation을 막던 기존 경계다.

작성자가 동일 URL은 원 Request를 재사용하고 정규화된 navigation만 허용되는 same-origin 모드로 재구성하도록 최소 보완했다. 실제 Chrome에서 query·합성 header·cookie 전달과 캐시/오프라인 흐름이 모두 통과했다. 검증 담당자는 제품 코드를 수정하지 않았다. 정상 Request 옵션의 확대 VM10그룹 근거는 작성자의 `sw-implementation.md`로 분리한다.

원본 오류 증거는 `browser/navigation-mode-original-defect.json`에 별도 보존했다. 이후 영향 사례가 통과해도 이 재현은 덮어쓰지 않는다.

## 테스트 기대값 보정

동적 캐시의 `/tips` 요청이 배경 갱신되지 않는 별도 실패는 기존 `isDynamicContent`가 `/tips/`를 판별하는 정책과 맞지 않는 fixture였다. 계약대로 제품 동적 판정은 그대로 두고 기존 정상 경로 `/tips/`를 검사하도록 수정했다. 정규화 문서 경계와 혼동하지 않는다.

lookup 거부 사례의 첫 영향 검사에서 favicon까지 CacheStorage를 조회해 총3회였는데2회로 고정한 fixture가 실패했다. 문서 URL과 `/offline/` 각각의 조회를 확인하도록 바꿔 해당1개만 재실행했다. 실제 Response는 이 단계에서도 이미 유효했으며 제품 추가 변경은 없었다.

실행기 scoped ESLint0. 전체 tsc는 SW JS-only 보완을 이유로 반복하지 않으며 앞선 CSV+29 체크포인트와 구분한다. 빌드·배포·서비스워커 버전 증가·등록 UI 변경은 실행하지 않았다.

최종 결과와 source SHA-256은 `browser/final-results.json`, 원 navigation 오류는 `browser/navigation-mode-original-defect.json`, 실제 fallback 산출물은 `browser/actual-generated-offline.html`과 `.png`다. 생성HTML의 기존 디자인/안내는 그대로이며 이 화면에 나열된 모든 도구의 오프라인 기능을 새로 전수 검증했다고 주장하지 않는다. 외부-origin bypass의 실제 외부 네트워크 검사는 하지 않고 VM 회귀로 분리했다.
