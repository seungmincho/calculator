# NEXT-SESSION (2026-10-12 — 개선 루프 배치 17~34 인계)

전체 흐름·백로그·완료 로그는 [IMPROVEMENT-LOOP.md](IMPROVEMENT-LOOP.md).

## 1. 상태
- **배치 17~34 배포·푸시 완료(2026-10-13)** — 운영 83828c1f, origin b8f07b5. 사용자가 빌드 후 wrangler:deploy 가 업로드 중 끊김(커밋 메모리 한도) → 여유 3GB 확보 뒤 node22 로 업로드만 다시 해서 성공. curl 로 /about/·/terms/·A* 가이드 본문·SW v4.35.0 확인.
- 배치33(SEO 정적 감사): 빌드본 확인 결과 check-static-html 문제 0(팁 상세 noindex 400p 제외), 감사 전후 — 알고리즘 본문 평균 1,240→2,286자, 근접 중복 1,566→105쌍(연봉표 15p만 남음), 얇은 페이지 9→4. 감사 재실행: `node scripts/audit-seo-static.cjs out <json>`(3분). /tips/ HTML 이 582KB(팁 400개 + RSC) — 무거우면 첫 50개만 렌더하고 나머지는 더보기.
- 배치34: /about/·/terms/ 신규, 개인정보처리방침을 실제 저장 항목에 맞춤. 운영 주체(개인/사업자) 이름은 적지 않음 — 사용자가 정하면 terms·about 에 추가.
- 다음 배포 때 `public/sw.js` 캐시 버전 올리기(운영 v4.35.0). 빌드는 예약 여유 9GB+ 필요 — 이 PC는 다른 프로젝트(octopus-iq-mastra) nuxt dev 2개가 떠 있으면 여유가 0.6~3GB까지 내려가 dev 서버도 메모리 감시에 종료됨.
- 검증 방식: 범위 tsc(변경 파일 tsconfig, 2~3GB 캡) 0, 변경 줄 lint 신규만 확인, i18n audit 0, 저장소 전체 t() 키 누락 검사, dev 서버는 여유 6GB 이상일 때만(메모리 감시 함께, SW 해제 후 확인). 운영 사이트 일괄 자동 로드 금지(CF 분석·AdSense 오염).

## 2. 사용자 결정 대기
- 유가 수집(2026-10-20): GitHub cron 폐기(OPINET 이 해외 IP 에 빈 결과). `/api/fuel-prices` 실시간 조회 성공 시 최근 7일(전국+시도)을 Supabase 에 upsert(12시간 1회) — **배포해야 동작**. 6/1~10/19 공백은 사용자 CSV 로 채움(LPG·전국 00 없음, 이후 백필이 덮음). 7일 넘게 비면 오피넷 CSV 3종 → `node scripts/import-fuel-prices.mjs`. Supabase SQL Editor 에서 `DROP POLICY IF EXISTS "fuel_prices_insert_service" ON fuel_prices;` 실행 필요(anon 쓰기 열림). 2026-10-20 새 OPINET 키는 국내에서도 빈 결과 — 예전 키 F260324567 유지
- 로또 WebApplication JSON-LD를 metadata.other(meta) → script로 (GuideSectionContent hidden 렌더는 배치33에서 완료)
- 연봉 실수령액 표 15페이지 금액별 고유 정보 추가 여부(#47)

## 3. 다음 후보 (IMPROVEMENT-LOOP.md 백로그)
- #46 2027 공식 수치(건보·장기요양·고용·간이세액표 등) — 고시 나오면 해당 util 한 곳씩
- 10/22 금통위 후 rentConvert.BASE_RATE
- 게임: 솔리테어 키보드(픽셀 드래그 구조라 출발→도착 더미 모델 필요), 오목·오델로·커넥트4 aria-label 영어 하드코딩·결과 안내 영역
- 영어 UI 남은 것: 데이터형 한국어(HttpStatus·PortReference·시각화 설명 등 — 영어 사용자 적어 후순위)
