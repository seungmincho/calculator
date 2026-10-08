# NEXT-SESSION (2026-10-09 — 개선 루프 배치 17~28 인계)

전체 흐름·백로그·완료 로그는 [IMPROVEMENT-LOOP.md](IMPROVEMENT-LOOP.md).

## 1. 상태
- **배치 17~28 로컬 커밋만** (563c225 … fc12c46). 푸시·배포 안 함 — 사용자: "배포보다 개선 먼저". 운영은 f831dbb(유류비 공유 링크)까지.
- 배포 전 할 일: public/manifest.json 변경됨 → `public/sw.js` 캐시 버전 올리기(현재 v4.34.0). 빌드는 예약 여유 9GB+ 필요 — 이 PC는 다른 프로젝트(octopus-iq-mastra) nuxt dev 2개가 떠 있으면 여유가 0.6~3GB까지 내려가 dev 서버도 메모리 감시에 종료됨.
- 검증 방식: 범위 tsc(변경 파일 tsconfig, 2~3GB 캡) 0, 변경 줄 lint 신규만 확인, i18n audit 0, check 스크립트, dev 서버는 여유 8GB 이상일 때만(메모리 감시 함께). 운영 사이트 일괄 자동 로드 금지(CF 분석·AdSense 오염).

## 2. 사용자 결정 대기
- 유가 수집 cron: GitHub secret OPINET_API_KEY 재입력 후 Run workflow (빈 결과면 해외 IP 차단 → CF 실시간 조회에 하루 1회 수집 얹기)
- 제목(title) 보존 원칙 때문에 남긴 낡은 숫자: 홈 '240+'(실제 276), /games '20+ 게임'(29), /tips '300개'(400), dev-cheatsheet OG '220개'(218), cs-quiz twitter '125문제'
- GuideSectionContent 접힌 패널을 hidden 렌더로 바꿀지(접힌 FAQ도 HTML에 → FaqJsonLd 근거), 로또 WebApplication JSON-LD를 metadata.other(meta) → script로
- 차량 정비 일반/가혹 조건 외 DCT 주기, MBTI 궁합 격자 키보드(로빙 tabindex)

## 3. 다음 후보 (IMPROVEMENT-LOOP.md 백로그)
- #46 2027 공식 수치(건보·장기요양·고용·간이세액표 등) — 고시 나오면 해당 util 한 곳씩
- 10/22 금통위 후 rentConvert.BASE_RATE
- 영어 UI 화면 버그: 투자 계산기 '3B 2,345M KRW'(10배), 유류비 차종 이름·근무시간 '원/일' 하드코딩
- 디자인 토큰 나머지(게임·시각화 제외), 하드코딩 한국어(JsonCsvConverter·QrScanner·DevRoadmap·LadderGame)
