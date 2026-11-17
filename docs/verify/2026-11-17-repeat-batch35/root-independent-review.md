# SW 최소 수정 독립 재확인

2026-11-17 KST. root가 수정 전 재현했던 동일한 실제 `public/sw.js` activate/fetch VM 포트를 수정 후 다시 실행했다. 모델/미지 캐시 보존과 미캐시 navigation HTML Response의 **2개 독립 확인이 통과**했다. 작성자 검사 파일을 호출하지 않고 기존 root 포트와 독립 기대값을 사용했다.

- 합성 이름7개 중 `toolhub-static-v0.0.1`, `toolhub-dynamic-v0.0.1`만 삭제했다. `transformers-cache`, webllm/model·config·wasm, 무관한 cache는 남았다.
- 네트워크 실패와 `/offline/` 부재에서 결과가 실제 Response·상태200·HTML 본문임을 확인했다. 이전 같은 포트에서는 undefined였다.
- git diff를 직접 읽어 current cache version3개·등록 UI·모델 제거 함수·IDB 기록을 바꾸지 않은 것을 확인했다. 최초 cache lookup rejection도 miss로 처리한 추가 한 줄은 오프라인 fallback까지 도달하는 데 필요한 같은 오류 경로의 보완으로 인정한다.

개인/운영 캐시에는 접근하지 않았다. native ServiceWorker install/activate/fetch와 실제 오프라인 navigation은 verifier의 별도 임시 origin에서 확인한다. 이 JS 수정에는 새 전체 TypeScript 검사를 요구하지 않으며 소스 VM·JS lint와 native browser 증거로 평가한다. 현재 병렬 작성 중인28/30 제품 TS는 해당 체크포인트에서 따로 검사한다.

## 실제 브라우저 발견 뒤 추가 독립 확인

verifier가 실제 mode=navigate 문서의 `new Request(normalizedUrl, originalRequest)` TypeError를 발견했다. 최초 root/작성자 VM은 Request의 기본 cors mode라 이 결함을 재현하지 못했다. gpa가 동일 URL은 원 Request를 재사용하고 변경된 navigate URL만 명시 same-origin init으로 구성하도록 수정했다.

root는 Node native Request의 navigate 속성을 제어한 별도 포트로 이전 constructor TypeError를 먼저 재현한 뒤, 수정된 실제 소스에서 normalized query·method·headers·credentials·cache·redirect·referrer/referrerPolicy·integrity·keepalive 보존과 원 AbortSignal 전달을 확인했다. 이미 정규화된 URL은 Request 객체 자체를 재사용했다. 실제 HTML Response도 반환했다. 이 **추가1그룹 PASS**를 포함해 root 독립 확인은 총3그룹이다. 속성을 제어한 Node 확인과 실제 브라우저 navigation을 구분한다.
