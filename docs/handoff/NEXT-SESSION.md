# NEXT-SESSION (2026-09-30 세션 종료 시점, 로컬 커밋 428b773 — 미푸시)

## 이번 세션에서 한 것 (전부 배포됨)
- GSC: robots.txt `/_next/` 차단 해제, 도구 페이지 HTML 590KB → 약 95KB (ToolsShowcase 경량화)
- 디자인 전면 개편: 토스 스타일 + 흰 배경, 전역 토큰/`ui-*` (CLAUDE.md "디자인 시스템"), 코드모드 `scripts/codemod-design-tokens.py`
- 이모지 → 라인 아이콘 `ToolIcon`/`src/config/toolIcons.ts`, 새 로고(2x2 타일) + `pnpm icons`(파비콘·OG 재생성)
- 헤더 메가메뉴·홈·인기도구 대시보드 재작성
- 결정 도구 분리: `src/config/decisionTools.ts`, 신규 URL 9개, 공통 전환 바 (메모리 project_decision_tools_split)
- 도구 개선 19개 (조회수 상위순): 숫자한글·보금자리론·유류비·학점변환·한영타자·사진모자이크·택배비·인감도장·주민번호·근무시간·학점계산·석차등급·카드할부·음력변환·시급 + 사다리/순서/메뉴 정리
- 정확성 수정: 2026 최저임금 10,320 전역, 실업급여 상한 68,100/하한 66,048, 음력 KASI 테이블(기존 중국 음력), 공휴일 2027·2030 추석, 보금자리론 우대금리, 카드할부 계산식, 한자 갖은자
- 회귀 체크 스크립트 8종: `for f in scripts/check-*.ts; do node $f; done`

## 1. 확인 필요 (사용자)
- 사이트 전체 새 디자인 체감, 특히 모바일
- GSC: 신규 9개 결정 도구 URL 색인, "발견됨-미색인" 추이 (2~3주 뒤)
- 택배비 요금 중 `// 미검증:` 주석 항목(CJ 전 구간, 한진, CU 일반 등)
- 푸시 여부 (`git push` 안 함)

## 2. 다음 후보
- 남은 트래픽 상위: taxi-fare, hangman, pc-electricity, salary-calculator(세금 로직 주의), crossword, aspect-ratio, bonus-calculator, water-bill, presentation-timer, gas-bill, pyeong-calculator, salary-rank
- 개별 도구 내부의 남은 차트 색·결과 강조색 정리 (라이트/다크)
- 쓰지 않게 된 i18n 키 정리 (각 에이전트 보고서 참고: residentNumber.verify 등, gpaConverterCalc.grades)

## 3. 작업 방식 메모
- 도구 개선은 에이전트 병렬(컴포넌트만) → i18n은 메인에서 `python scripts/merge-i18n.py <namespace> <keys.json> [--overwrite]`로 원본 서식 유지 병합 (json.dumps 전체 재작성 금지: 배열 서식이 바뀌어 diff 폭증)
- 빌드는 `out/`을 덮어써 dev 서버(`out/dev`)가 깨짐 → 빌드 후 dev 재시작, localhost SW 캐시 unregister
- 배포: `pnpm build && cp public/rss.xml public/_redirects out/ && npx wrangler pages deploy out --commit-dirty=true --commit-message=... --branch=main`
