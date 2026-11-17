# 35차 긴급 보완 — 모델 다운로드 보존·오프라인 응답

2026-11-17 KST. 기존 PWA의 두 결함을 root가 실제 `public/sw.js`의 activate/fetch handler를 VM에서 실행해 재현했다. 개인 브라우저/운영 캐시·모델·기록은 읽거나 지우지 않았으며 모두 합성 캐시 이름·네트워크 실패 포트다. 새 경로·모델·패키지·빌드·배포는 추가하지 않는다.

## 확인한 결함

1. activate의 캐시 청소는 현 버전의3개 이름 이외 **모든** Cache Storage 항목을 삭제한다. 구 버전 Toolhub 캐시와 함께 `transformers-cache`, `webllm/model`, `webllm/config`, `webllm/wasm`, 무관한 캐시까지 삭제하는 것을 재현했다. 실제 설치 `@huggingface/transformers/src/utils/hub.js`는 `transformers-cache`를 열며, `src/lib/speaking/client.ts`의 명시 다운로드 제거도 위 webllm 세 이름만 대상으로 한다. 따라서 PWA 업데이트가 사용자 선택과 무관하게 재다운로드를 유발할 수 있다. IDB 연습 기록을 삭제한다는 뜻은 아니다.
2. 처음 방문하는 경로를 오프라인으로 열고 `/offline/` 캐시도 없으면 `caches.match('/offline/') || new Response(...)`에서 Promise를 truthy로 취급한다. 실제 handler 결과는 Response가 아닌 undefined였다. 준비 파일 일부 다운로드 실패 때도 유효한 오프라인 HTML을 반환해야 한다.

## 최소 수정 계약

- `toolhub-v<숫자 버전>`, `toolhub-static-v<숫자 버전>`, `toolhub-dynamic-v<숫자 버전>`이라는 실제 소유 형식만 청소한다. 현재3개 캐시는 유지하고 transformers/webllm/미지의 캐시는 보존한다. 문자열에 toolhub가 포함됐다는 이유만으로 삭제하지 않는다.
- navigation 실패 경로에서 offline cache lookup의 결과를 await/then으로 확인한다. 있으면 해당 Response, 없거나 lookup이 실패하면 기존 `generateOfflinePage()`의 HTML Response를 반환한다. 외부/API/놀이공원 제외, trailing slash, 기존 정상 캐시 전략은 이 작은 수정에서 바꾸지 않는다.
- `public/sw.js` 캐시 버전은 이번 작업에서 올리지 않는다. 인계의 다음 실제 배포 버전 v4.35.17 절차를 유지한다. 등록/업데이트 UI·모델 삭제 버튼·연습 기록·production 배포는 별도 변경하지 않는다.

## 검증과 소유권

제품은 gpa 담당 `public/sw.js`만, 의미 있는 VM 회귀·보고서를 같은 담당이 작성한다. root 재현을 근거로 소유 캐시/비소유 캐시 혼합·현 버전 유지·offline 캐시 존재/부재/lookup 실패의 실제 Response를 확인한다. 기존 API bypass/정상 캐시/외부 요청을 회귀 확인한다.

실제 서비스워커는 전담 verifier의 단일 Chrome에서 **별도 임시 localhost 서버·격리 브라우저 컨텍스트**에 현재 sw.js와 합성 HTML만 제공해 검증한다. 기존 Next 개발 서버나 사용자 캐시를 제어하지 않고 빌드도 하지 않는다. 현재 CSV+29 검증과 증거는 별도 보고서로 유지하고 추가 검증 시점을 root와 조율한다. 수정 전 모델 캐시 손실과 undefined 응답의 합성 재현을 실제 운영 장애 빈도로 과장하지 않는다.
