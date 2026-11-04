# 테마파크 지도 중첩 스크롤 수정 — 2026-11-04

사용자 스크린샷의 롯데월드 지도에 iframe 문서와 지도 자체의 세로 스크롤이 중첩되는 문제를 수정했다. 에버랜드·경주월드도 같은 구조이므로 함께 적용했다.

## 원인과 변경

- 운영에서 부모 JS 로드를 보류해 지도 iframe이 먼저 로드되도록 재현했다. 초기 높이 메시지를 부모 hydration 전에 보내면 수신자가 없어, iframe은 1,200px인 채 본문 2,252px을 내부 스크롤로 표시했다.
- 부모가 message listener 등록 직후와 iframe load 때 높이를 요청한다. 자식은 동일 출처·부모 source를 확인해 응답한다. 이후 ResizeObserver로 구역·검색·이미지·화면 폭 변경을 반영한다.
- 기본 지도에서 고정 최대 높이를 제거했다. 확대 상태에만 높이 제한·내부 스크롤을 적용하고, `overscroll-behavior: contain`을 제거해 지도 경계에서 페이지로 휠을 이어갈 수 있게 했다.
- 지도 브라우저 번들을 재생성하고 스크립트 URL에 버전을 추가해 기존 브라우저 캐시와 구분했다. 기존 정적 export를 재사용하고 변경된 지도 번들 및 Pages Functions를 배포했다. 전체 Next build는 재실행하지 않았다.

## 검증

- 전체 TypeScript, Functions/Worker 타입 검사, 변경 범위 ESLint 통과.
- `node scripts/verify-park-scroll.mjs <baseURL>`: 부모 hydration을 의도적으로 늦춰 초기 메시지 누락 상황 재현 → 높이 복구, iframe 자체 스크롤 없음, 기본 지도의 내부 세로 넘침 없음, 지도 위 실제 휠이 바깥 페이지로 전달됨을 검사한다.
- 세 공원에서 확대·축소·확대 경계 연속 휠, 롯데월드 층 변경, 검색에 따른 높이 축소/복원, 모바일 390/320px 전환, iframe 재로드를 확인했다. JavaScript 오류 0.
- 증거: `.wrangler/park-scroll/`의 before/after 이미지, 결과 JSON, 배포 로그.
- 운영 Pages `2b1c682b` 배포 후 `https://toolhub.ai.kr`에서 위 스크롤 회귀 검사 모두 통과했다.

기존 변경 보존, commit/push 미실행. 검증용 로컬 서버는 작업 종료 후 정리한다.
