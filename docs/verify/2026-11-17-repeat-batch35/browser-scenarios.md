# 35차 actual Service Worker 검증 계획

기존3039·사용자 브라우저·운영 캐시에는 접근하지 않는다. `scripts/check-repeat-batch35-browser.mjs`가 임시127.0.0.1 무작위 포트 서버를 열고 현재 `public/sw.js` 원문과 합성HTML/아이콘만 제공한다. 별도 Chrome 컨텍스트에서 serviceWorkers allow, 나머지 origin 요청 차단, 종료 시 브라우저·서버 모두 닫는다. 제품 final ready와 현재 전체tsc 종료 신호 뒤에만 실행한다.

1. 실제 register/activate 전에 구 소유6개·현재3개·transformers/webllm/미지11개 캐시를 합성 바이트로 seed. 실제 activate 완료 뒤 구 소유만 삭제하고 나머지 이름/바이트 정확 보존을 확인한다.
2. 실제 방문 페이지 캐시·trailing slash를 확인하고 브라우저 네트워크를 offline으로 전환. 캐시 페이지와 `/offline/` 캐시 fallback이 실제200 Response/fromServiceWorker로 돌아오는지 확인한다.
3. 격리 원점의 `/offline/` 캐시만 삭제하고 처음 방문하는 페이지를 offline으로 탐색. 현재 generateOfflinePage HTML200·Content-Type·타이틀을 검증하고 실제HTML파일을 보존한다. 문서 아닌 미캐시 자원은 기존408을 유지한다.
4. 실제 서비스워커 글로벌의 `/offline/` caches.match만 reject하도록 제어 주입한다. 다른 CacheStorage 동작은 native로 유지하며 유효HTML200·unhandled0을 확인한다. 이 사례는 실제 저장장치 실패 재현으로 과장하지 않는다.
5. 정상 정적 캐시·동적 배경 갱신과 API GET/POST·세 놀이공원 경로 bypass를 합성 서버의 요청 카운터로 확인한다.

제품 sw.js는 수정하지 않으며 캐시 버전 변경·실모델 다운로드·개인 데이터·production 빌드·실서비스 RPC는 없다. 페이지 JS 오류와 의도된 offline 네트워크 console 오류를 구분한다. CSV/29 결과에 합산하지 않고 별도5흐름으로 보고한다.
