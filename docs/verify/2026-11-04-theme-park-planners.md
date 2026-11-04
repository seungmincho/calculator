# 롯데월드·경주월드 방문 플래너 검증 — 2026-11-04

사용자의 에버랜드와 같은 방식 확장 요청으로, 기존 툴허브 내부에 잠실 롯데월드와 경주월드를 추가했다. 기능·출처·한계는 [구현 문서](../theme-park-planners.md).

## 검사 결과

- 전체 TypeScript 및 Pages Functions/Worker 별도 타입 검사 통과. 변경 범위 ESLint 통과.
- 번역 718개 생성/일치, namespace apply 변경 0, audit 미해결 0. 기존 동적 namespace 등 56개 참고 항목 유지.
- 실내/실외 추천 차이·악천후 제한, 공원별 예보 격리·1시간 캐시·429 보존, 누락 대기시간 처리, 지도 좌표 경계·42/26개 개수·6/1구역, SSR·canonical·OG·사이트맵 테스트 통과.
- 기존 에버랜드 KST·예보 결측/노후화·추천 알고리즘·SQLite·보존·HTML escaping 테스트 및 브라우저 회귀 통과.
- 타입 통과 후 `SKIP_BUILD_TYPECHECK=1 LOW_MEMORY_BUILD=1 npm run build` 성공(775/775). 정적 HTML 774페이지 중 기존 noindex tips 400개 h1 누락 외 신규 문제 없음.
- 실제 Chromium에서 두 공원의 목적·주말 필터, 롯데 실내 선택, URL 복원, 날짜 페이지, 공유 PNG, 지도 구역 전환·이미지 로드·시설 검색·선택·확대, 모바일 320/390px 가로 넘침 없음, 모바일 추천 요약 첫 화면 표시, 다크, sitemap·만료 날짜 404 확인.
- 모바일 지도 겹침 검사를 추가해 전체 보기에서 겹침이 없고 최대 8배 확대에서 구역의 모든 표시가 보임을 확인. 6배에서 경주월드 1개가 가려지는 문제를 수정했다. Wrangler dev가 외부 의존 파일 수정본을 놓쳐 재시작 후 재검증했다.
- 홈 검색에서 공원 페이지로 Next 탐색 후 실시간 서버 본문 진입, 검색봇 UA에도 같은 추천 HTML 제공 확인.
- 최종 `https://toolhub.ai.kr`에서 두 검증 스크립트 모두 통과. 모바일 겹침 없음·최대 확대 전체 표시·홈 진입·다크·봇 HTML까지 확인했고 JavaScript 오류 0. 검증용 8791 로컬 서버 종료.

## 배포 및 데이터

- D1 `toolhub`: `0003_theme_parks.sql` 추가 테이블 2개 적용. 기존 데이터 유지.
- Worker `toolhub-everland-collector`: `e81a1a54-2239-4311-b5d7-006b6386ccad`, 10분 Cron.
- 미리보기 `66cc4e82.salary-calculator-d6q.pages.dev`에서 전체 확장 브라우저 검사 통과.
- 첫 운영 `bee35afe.salary-calculator-d6q.pages.dev`; 최종 지도 확대 보완 운영 배포 `8b764030.salary-calculator-d6q.pages.dev`. SW v4.35.5.
- 실제 운영 D1: 롯데월드 예보 발표 16:17:46 KST/확인 17:18:48, 경주월드 발표 16:17:28/확인 17:18:59, 각각 유효 예보 구간 90개.
- **17:20:34 KST 실제 Cron이 롯데월드 운영 상태를 저장**한 것을 읽기 확인했다. 숫자 대기시간은 제공하지 않는다. 경주월드는 실시간 운영·대기 데이터 미연결을 화면에 명시한다.
- 기존 미커밋 변경과 백업 stash를 보존했다. git commit/push 미실행. 이후 원격 main만 재배포하면 이번 로컬 기능이 빠질 수 있다.

증거: `.wrangler/park-expansion/evidence/`, build/deploy 로그는 `.wrangler/park-expansion/` (ignored). 검증 실행: `node scripts/verify-theme-parks.mjs <baseURL>`, `node scripts/verify-theme-park-entry.mjs <baseURL>`.
