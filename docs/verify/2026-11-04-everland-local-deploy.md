# 에버랜드 로컬 직접 배포 (2026-11-04)

- 원격 `feat/everland-wait-times`의 `e11e7f74`를 로컬 `main`으로 fast-forward했다. 원격 `main`은 `f3c8c31c`이며 이번 작업에서는 push하지 않았다.
- 기존 택시·택배·TTS·메뉴 룰렛 등의 미커밋 변경을 보존했다. 백업은 `stash@{0}`의 `codex backup before everland local deployment 2026-11-04`. 번역 생성본과 RSS 충돌만 정본에서 재생성해 해결했다.
- 병합 후 lockfile 정합성 검사에서 옛 Windows 전용 직접 의존성이 다시 남은 것을 발견했다. 기존 lockfile을 `.wrangler/everland-local/package-lock-before-sync.json`에 보존하고 `npm install --package-lock-only --ignore-scripts --offline --no-audit --no-fund`로 정리했다. 배포 산출물과 기존 node_modules는 바꾸지 않는 작업이다.
- 기존 D1의 실제 이름은 `toolhub`, ID는 `0c60527d-f048-4d7c-ae52-dd050dd02992`. 테이블 `everland_snapshots`가 존재했고 배포 전 기록은 0건이었다. 새 DB 생성이나 migration 재실행은 하지 않았다.
- Worker와 Pages 추가 바인딩에 `database_name`을 보완하고 루트 Wrangler 설정에 기존 값을 유지한 채 `EVERLAND_DB` 기본·production·preview 바인딩을 추가했다.
- 수집 Worker: `toolhub-everland-collector`, version `857809bb-404d-4862-9ac9-16a2c205ee84`, Cron `*/10 * * * *`. Workers Logs 활성화. 설치된 Wrangler 3.114.17은 traces 설정을 지원하지 않아 추적 옵션 추가나 버전 업그레이드는 하지 않았다.
- 미리보기: https://234c5f52.salary-calculator-d6q.pages.dev
- 운영 배포: https://dcf97f72.salary-calculator-d6q.pages.dev
- 운영 페이지: https://toolhub.ai.kr/everland-wait-times/

## 검증

- 전체 `npx tsc --noEmit`, 별도 Function/Worker 타입 검사, 에버랜드 파일 및 next.config ESLint 통과.
- 번역 710개 일치, namespace audit unresolved 0. 기존 동적 namespace 주의 56건은 동일.
- 정규화·0/결측·상태·KST·SQLite 원자성/중복/보관·429 이전 데이터 보존·HTML 이스케이프 테스트 통과.
- Chromium 합성 데이터의 모바일/데스크톱 검색·필터·정렬·지도 선택·추이·영문·가로 넘침/JS 오류 검사 통과.
- Worker dry-run과 바인딩 타입 생성 통과. 기존 Wrangler 3.114.17 사용, 원격 명령은 Windows에서 안정적인 기존 Node 22.22.1로 실행했다.
- 타입 검사 통과 후 `SKIP_BUILD_TYPECHECK=1 LOW_MEMORY_BUILD=1 npm run build` 성공, 772/772 페이지 생성. 메모리 여유가 적을 때만 워커 1개를 쓰는 선택 옵션을 추가했으며 기본 4개는 유지했다.
- static HTML 771개 검사, 기존 noindex 팁 400개의 h1 누락만 검출. 400개 모두 noindex 재확인. 에버랜드 본문·canonical·iframe·JSON-LD·sitemap·OG 확인.
- PWA 캐시 v4.35.3. public/sw.js와 out/sw.js가 동일함을 확인했다.
- 실제 미리보기 D1 연결 및 기록 준비 상태의 모바일/데스크톱·영문 검증 통과, JS 오류 0. 운영 페이지·현황판·홈·sw.js HTTP 200 및 새 메뉴·캐시 확인. 정적 도구 페이지는 색인 가능하고 현황판만 noindex이다.

## 첫 자동 수집 확인

- Cloudflare 예약 실행 로그 `outcome: ok`, exceptions 없음, wall time 567ms / CPU 4ms를 확인했다. 활성 Worker 버전은 위 배포 버전과 일치하며 트래픽 100%다. 원격 schedules에서도 `*/10 * * * *` 확인.
- 첫 정상 저장 시각: **2026-11-04 15:10:34 KST** (`2026-11-04T06:10:34.421Z`). 시설 57개, 대기시간 제공 34개, 관측 중앙값 10분. 수동 가짜 데이터나 수집 트리거 없이 실제 Cron이 생성한 기록이다.
- 15:12 KST 운영 도메인에서 57개 시설 표시, 검색·결과 없음·대기시간 정렬·지도 선택·영문 응답·모바일/데스크톱 가로 넘침 없음·JS 오류 0을 확인했다. 분석·광고 요청은 브라우저 검증 중 차단했다.
- 추이 그래프는 당일 정상 기록이 2개 이상 생긴 뒤 나타나는 설계다. 이번 원격 확인 시점은 첫 기록 1개이며, 2개 이상 렌더링은 합성 데이터 테스트에서 확인했다.
- 증빙: `.wrangler/everland-local/collector-tail.log`, `evidence/production-results.json`, `evidence/mobile-production.png`, `evidence/desktop-production.png`.

## 남는 사항

- 원격 main 반영은 별도다. 현재 운영은 최신 기능 브랜치 + 보존된 로컬 개선 + 이번 배포 설정 변경을 빌드한 결과다.
- 위치 참고도이며 공식 내부 안내도 이미지는 포함하지 않는다. 상세한 한계는 `docs/everland.md` 참조.
- 기존 baseline-browser-mapping 갱신 안내와 Wrangler의 기존 analytics_engine 필드 경고가 남아 있으나 빌드·배포는 성공했다.
- 로그와 화면 증빙: `.wrangler/everland-local/` (Git 제외). 기존 미커밋 파일과 `.claude`, `.github` 작업을 유지했다.
