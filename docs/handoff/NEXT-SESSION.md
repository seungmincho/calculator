# NEXT-SESSION (2026-09-16 야간 세션 종료 시점, 커밋 33a4d06 푸시됨)

## 1. 미완료 + 막힌 이유
- **GSC 재크롤 대기(사용자)**: 사이트맵 재제출(이제 331 URL — 허브 4 + salary-table 16 추가). 색인 효과 판정은 1~2주 후 스크린샷 필요. 코드 작업 없음.
- **연봉 계산기 결과 변경 사용자 확인**: `utils/netSalary.ts`에 근로소득세액공제·자녀세액공제 추가로 실수령액이 올라감(5000만 1인: 월 342만→349만). 사용자 체감 확인 대기.
- **미검증 2025 표기 3건**: 육아휴직급여(parental-leave FAQ), 도시가스 단가(gasBill), 결혼비용 통계(wedding). 2026 공식 수치 웹 검증 미완.
- **CLAUDE.md 구조 문서 미갱신**: 새 라우트(/calculators /tools /media /health /salary-table/*)·`utils/netSalary.ts`·`menuConfig.categoryHubs`·`generate-redirects-rss.js` 하드코딩 주의가 CLAUDE.md에 없음. 사용자 승인 후 `docs:` 커밋.

## 2. 재개 프롬프트
```
C:\projects\salary-calculator, 브랜치 main (origin 동기화됨). MEMORY.md의 project_seo_hubs_salary_table.md를 먼저 읽을 것.
할 일: (1) GSC "페이지 색인 생성" 스크린샷 요청 → /calculators/, /salary-table/5000/ 색인 여부 확인.
(2) CLAUDE.md 갱신: Utility Files에 netSalary.ts, 새 도구 추가 절차에 "scripts/generate-redirects-rss.js menuItems 하드코딩 배열에도 추가", 카테고리 허브(categoryHubs) 설명.
(3) 미검증 3건 웹 검증: 2026 육아휴직급여 상한(고용노동부), 도시가스 도매요금 2026(가스공사), 결혼비용 통계 2026 → src/app/parental-leave/page.tsx, messages/ko.json gasBill/wedding.
(4) 효과 확인되면 퇴직금(/severance-pay) 구간 페이지를 salary-table 패턴(lib.ts + [amount]/page.tsx + generateStaticParams)으로 검토.
(5) 다음 고도화 후보(트래픽 순): keyboard-converter(3,274) UI, image-mosaic(3,931) 브러시 UX, shipping-calculator(3,397) 2026 요금표.
배포: 빌드 후 `npx wrangler pages deploy out --commit-dirty=true --commit-message=deploy --branch=main` (Claude 직접 실행 승인됨). 로컬 검증: `python -m http.server 3040 -d out` + `MSYS_NO_PATHCONV=1 node scripts/verify-page.mjs /path/ --check-i18n --dark`.
```

## 3. 확인 대기 (사용자에게)
- 연봉 계산기에서 본인 연봉 넣어보고 실수령액이 급여명세서와 크게 다르면 알려주실 수 있나요? (세액공제 추가로 결과 바뀜)
- GSC 사이트맵 재제출(331 URL) 후 1~2주 뒤 색인 리포트 스크린샷 부탁드립니다.
- CLAUDE.md 구조 문서 갱신을 다음 세션 시작 때 바로 할까요?
