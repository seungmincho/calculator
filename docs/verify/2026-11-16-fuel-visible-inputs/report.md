# 유류비 계산기 입력·버튼 개선 검증 — 2026-11-16

사용자 피드백에 따라 차종·연료·지역·기준일을 접힘 없이 표시하고 연비를 바로 입력하게 했다. 보정 계수는 연비 아래 기본 입력 영역으로 옮겼다. 차량 저장, 정산, 주행일지, 계산 이력, CSV·공유는 기존 동작을 유지한다. 계산 이력 저장·내보내기에는 배경·테두리·포커스 표시를 적용했다.

유가 선택지에는 선택 지역·일자의 조회 가격과 출처가 표시된다. 실패 시 예시 가격임을 구분한다. `next dev`에서는 Pages Function이 실행되지 않아 404였으므로 개발 환경에만 공개 운영 유가 프록시를 연결했다. 프로덕션 정적 export 설정은 유지한다.

번역 원본과 생성본에는 신규 연비 문구가 있었지만, scoped 번역 훅의 메모가 Fast Refresh 이후에도 이전 조회 함수를 유지할 수 있었다. 현재 번역 함수가 바뀌면 메모도 갱신하고, 이미 영어를 읽은 화면도 새 영어 목록을 다시 반영하도록 수정했다.

## 검증

- `check-fuel-experience-browser.mjs`: 8개 PASS. 직접 연비/초기화, 보정 계수·별도 비용·재방문·URL 복원, 한국어↔영어, 함께 정산·저장·CSV·공유, 과거 유가 fallback, 모바일 320/390px, 실제 API 응답 렌더링.
- `check-lazy-i18n-refresh.mjs`: React 훅 상태를 유지한 한국어 목록 교체, 이미 로드한 영어 목록 교체, 언어 재전환 PASS.
- 실제 localhost API/UI 확인: 경기 휘발유 1,851원/L, 50km·14.5km/L 결과 6,383원. 연비 라벨 번역과 보정 계수 노출 확인 (`local-live-ui.json`, `fuel-local-live-dark.png`).
- `check-fuel-prices-live.mjs`: 전국·서울·과거 날짜 실제 API 3개 PASS.
- 전체 TypeScript 검사, 변경 TS/TSX ESLint, messages:check 통과. namespace audit 미해결 0.
- 빌드·배포는 실행하지 않았다. 모바일 검증은 Chrome의 320/390px 뷰포트이며 실제 휴대기기 검증은 아니다.

재실행:

```powershell
node scripts/check-fuel-experience-browser.mjs http://127.0.0.1:3039 docs/verify/2026-11-16-fuel-visible-inputs chrome
node scripts/check-lazy-i18n-refresh.mjs
```
