# 에버랜드 방문 추천 전환 및 직접 배포

2026-11-04. 사용자가 툴허브 내부 구축을 승인했고, 날씨·예상 혼잡도·추천 이유를 주 기능으로 확정했다.

## 반영 결과

- 운영: <https://toolhub.ai.kr/everland/>
- 지도: <https://toolhub.ai.kr/everland/map/>
- Pages 운영 배포: `82f1d5a8` / <https://82f1d5a8.salary-calculator-d6q.pages.dev>
- 앞선 미리보기: `e7d9b0a5` (최종 지도 범례 검수 전 37개, 운영은 39개)
- 수집기 버전: `9ae18cbf-ab8a-4c76-83d4-1d6779febe3e`; 기존 10분 Cron 유지.
- D1에 `0002_visit_planner.sql` 적용: `everland_weather`, `everland_daily` 추가.
- 실제 날씨: MET Norway 발표 `2026-11-04T07:17:28Z`, 서버 확인 `07:28:48.144Z`, 유효 예보 구간 91개.
- 새 Cron의 실제 실행 결과: `07:30:34.911Z` 대기시간 스냅샷과 일 집계 저장. 해당 날짜 집계 관측 9개, 관측 중앙값 평균 10분. 혼잡도 예측 모델의 검증 값이 아니다.

추천 3일, 방문 목적 3종, 주말·공휴일 필터, 날짜별 비교·상세 예보·이유, 공유 이미지·URL 복원, 서버 HTML 및 날짜별 canonical·사이트맵을 제공한다. 지도에는 원본 범례와 대조한 39개 위치를 연결했다. 전체 보기는 8개 주요 시설, 확대·검색 시 전체 확인 위치를 표시한다. 아마존은 범례 206번으로 정정하고 사파리월드 205번·로스트 밸리 207번을 추가했다.

## 검증

- 전체 `tsc --noEmit` 통과. Pages Function·Worker는 별도 범위 tsconfig로 통과(루트 설정에서 functions 제외되기 때문).
- 변경 파일 ESLint 통과. `messages:check` 712개 생성본 일치, namespace audit 미해결 0개. 기존 동적 네임스페이스 안내 56개는 동일.
- `npm run build` 성공: 정적 생성 773개. 타입 별도 통과 후 `SKIP_BUILD_TYPECHECK=1`, `LOW_MEMORY_BUILD=1` 사용.
- 정적 HTML 검사: 대상 772개, 기존 `tips/*`의 알려진 h1 누락 400개 외 새 문제 없음. 에버랜드 실제 서비스 본문은 별도 서버 HTML 검증.
- 순수 로직·SQLite 테스트 통과: KST 경계, 시간대 중첩 강수량, 결측·단위 오류, 예보 유효기간, 위험 날씨 상한, 주말 필터, 날짜별 달력 추정, 시간당 캐시, 429 후 정상 기록 보존, 일별 집계·원시 자료 보관, 출력 이스케이프.
- 로컬 Pages 및 Cloudflare 미리보기 통과: SSR 본문, 초기 추천, 목적 전환, 주말 필터, 날짜 URL 복원, 고유 날짜 페이지, 공유 PNG 저장, 지도 이미지·핀 선택·확대·검색, sitemap·301.
- 최종 운영 도메인에서도 위 브라우저 검증 통과. 모바일 320·390px 화면 넘침 없음, 브라우저 실행 오류 0개, 최종 39개 핀/8개 개요 표시 확인.
- 운영 홈 검색 → Next 내부 링크 → 실시간 서버 페이지 진입 확인. 다크 모드 확인, OAI-SearchBot User-Agent 요청에 추천 본문을 포함한 200 HTML 응답 확인(실제 색인 여부 검증은 아님).
- React browser SSR의 MessageChannel 런타임 오류는 로컬에서 발견해 `react-dom/server.edge`로 해결했다. Node 단발 테스트는 완료 후 명시 종료하도록 정리했다.

검증 실행 파일: `scripts/check-everland-planner.ts`, `scripts/check-everland.ts`, `scripts/verify-everland-planner.mjs`.
화면·공유 PNG·결과 JSON: `.wrangler/everland-replan/evidence/` (git 제외).

## 해석과 인계

- 예상 혼잡도는 초기 요일·공휴일 규칙이며 실제 입장객 수나 검증된 예측 정확도가 아니다. 화면에 명시했다.
- 예보는 MET Norway의 전 세계 수치예보이며 기상청 특보를 대신하지 않는다. 5일 이후·시간 간격이 큰 예보는 변동성 표시, 24시간 이상 지난 데이터는 추천 중단.
- 지도는 사용자가 지정한 2023년 PDF의 지도 영역 발췌다. 현재 시설이나 정확한 입구를 보장하지 않는다. 원본 저작권·별도 이용 허락 확인 상태와 좌표 근거는 [개발 안내](../everland-planner.md)에 기록했다.
- AI 검색을 위한 읽을 수 있는 본문·출처·날짜별 주소를 제공했다. 실제 색인·인용은 검증하거나 보장하지 않았다.
- 기존 미커밋 작업과 통합 전 stash를 보존했다. 이번 기능은 **로컬 직접 배포**했으며 Git 커밋·원격 push는 하지 않았다. 원격 main만 재배포하면 현재 로컬 기능이 빠질 수 있다.
