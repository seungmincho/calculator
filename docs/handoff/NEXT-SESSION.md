# NEXT-SESSION (2026-10-09 — 개선 루프 배치 17~32 인계)

전체 흐름·백로그·완료 로그는 [IMPROVEMENT-LOOP.md](IMPROVEMENT-LOOP.md).

## 1. 상태
- **배치 17~32 로컬 커밋만** (563c225 … 60bbb26). 푸시·배포 안 함 — 사용자: "배포보다 개선 먼저". 운영은 f831dbb(유류비 공유 링크)까지.
- 배포 전 할 일: public/manifest.json 변경됨 → `public/sw.js` 캐시 버전 올리기(현재 v4.34.0). 빌드는 예약 여유 9GB+ 필요 — 이 PC는 다른 프로젝트(octopus-iq-mastra) nuxt dev 2개가 떠 있으면 여유가 0.6~3GB까지 내려가 dev 서버도 메모리 감시에 종료됨.
- 검증 방식: 범위 tsc(변경 파일 tsconfig, 2~3GB 캡) 0, 변경 줄 lint 신규만 확인, i18n audit 0, 저장소 전체 t() 키 누락 검사, dev 서버는 여유 6GB 이상일 때만(메모리 감시 함께, SW 해제 후 확인). 운영 사이트 일괄 자동 로드 금지(CF 분석·AdSense 오염).

## 2. 사용자 결정 대기
- 유가 수집 cron: GitHub secret OPINET_API_KEY 재입력 후 Run workflow (빈 결과면 해외 IP 차단 → CF 실시간 조회에 하루 1회 수집 얹기)
- GuideSectionContent 접힌 패널을 hidden 렌더로 바꿀지(접힌 FAQ도 HTML에 → FaqJsonLd 근거), 로또 WebApplication JSON-LD를 metadata.other(meta) → script로

## 3. 다음 후보 (IMPROVEMENT-LOOP.md 백로그)
- #46 2027 공식 수치(건보·장기요양·고용·간이세액표 등) — 고시 나오면 해당 util 한 곳씩
- 10/22 금통위 후 rentConvert.BASE_RATE
- 게임: 솔리테어 키보드(픽셀 드래그 구조라 출발→도착 더미 모델 필요), 오목·오델로·커넥트4 aria-label 영어 하드코딩·결과 안내 영역
- 영어 UI 남은 것: 데이터형 한국어(HttpStatus·PortReference·시각화 설명 등 — 영어 사용자 적어 후순위)
