# 36차 DutchPay 실제 Chrome 검증

2026-11-17 07:02:32 KST 기준 **8/8 PASS**, 미해결 제품 결함 0건. Chrome/context를 모두 종료했다. 기존 localhost:3039 서버를 재사용했고 전체 타입·빌드·배포는 실행하지 않았다.

실행기: `scripts/check-repeat-batch36-browser.mjs`. 원시 결과: [browser/final-results.json](browser/final-results.json). 합성 fixture는 [browser-fixtures.mjs](browser-fixtures.mjs)에 있다. 정상 legacy tuple은 제품 encoder/parser를 import하지 않고 독립 생성했다.

| 흐름 | 실제 확인 |
|---|---|
| legacy10·URL·명시 기록 | 최초 읽기에서 저장 0회, 현재 d/구형 total·people 우선. 명시 불러오기와 저장 후 최근10 유지, 삭제 후9개·현재폼 유지. 새 방문 자동 기록 적용 없음 |
| 손상·미래·손실 보호 | 손상 JSON/미래 d 원본 유지. 잘못된 account JSON이 recent 저장을 막지 않음. 100항목 URL에서 실제 UI로101번째 항목 추가 후 저장 거부·101개 폼 유지 |
| 저장 실패·확인 불가 | native Storage 위 quota/readback/read 실패만 주입. quota는 원본·초안 보존, readback 불확실은 실제 기록이 저장됐어도 성공으로 표시하지 않음. rollback0·명시 재조회 쓰기0. 계좌 메모리 초안은 재시도로 확인 저장 |
| 두 실제 탭·Web Locks | native 같은 key lock과 storage event. stale 탭 저장 거부 후 재조회·명시 저장으로2개 기록 보존. 잠금 대기 load는 폼 편집으로 취소. 계좌 A→B 대기 중 최신 B만 저장·상대 탭 재조회는 자기 입력 유지 |
| ro·계좌 경계 | 합성 계좌는 ro DOM/공지/저장 UI에 노출되지 않음. 편집으로 전환한 공지에만 포함. d·recent·네트워크에 계좌 없음. 계좌 원문은 증거 JSON/로그/캡처에 기록하지 않음 |
| 복사·수동 복구 | 실제 Clipboard 금액 정수·현재 공지·ro 링크를 readText로 대조. API 부재/거절 및 legacy false/throw는 원문 복구. 전체 선택, 선택 실패 안내, native 재시도 완료 후 원버튼 초점, 닫기 초점. legacy true는 제어 포트 결과로 구분 |
| 최신 복사 수명 | parent→ShareResult·ShareResult→parent 뒤 과거 거부의 fallback0. 입력 A→B→A/KO→EN→KO에서 과거 성공·복구 부활 없음. 실제 SPA 이탈 후 거부도 fallback0 |
| 320px 다크 KO/EN | 두 언어 document/body 320px, 확인한 입력16px 이상·복구/저장/복사 버튼44px 이상. 현재 원고와 값 유지. 아래 캡처 직접 시각 검토 |

JS pageerror·hydration·unhandled rejection·원시 번역 키는 최종 실행 모두0. 광고·외부 글꼴·동의 SDK·도구 방문 통계 요청은 정책대로 차단했고 관련 fetch/리소스 console 오류는 별도 보존했다. 실제 전송/실사용자 데이터 접근은 없다.

첫 실행은5PASS/3FAIL이었다. 세 실패는 모두 검증 코드에서 수정했다: 새 about:blank에 localStorage observer를 주입한 오류, 복구 패널이 숨겨지는 중간 상태를 native 복사 완료로 본 조기 초점 assert, 페이지에 없는 `/number-to-korean/` 링크 선택. 각각 HTTP 문서에서만 주입·copied 완료 조건·실제 Header SPA 이탈로 수정하고 해당3흐름만 재실행해8PASS가 됐다. 초기 `*-failure.*` 파일은 이 경과의 증거이며 미해결 제품 결함이 아니다. 제품 파일은 수정하지 않았다.

캡처: [KO 상단](browser/dutch-320-ko-top.png), [KO 복구](browser/dutch-320-ko-panel.png), [EN 상단](browser/dutch-320-en-top.png), [EN 복구](browser/dutch-320-en-panel.png). 상단 기존 결과 요약의 긴 금액은 줄바꿈되며 가로 overflow는 없다. 개발 Issue 표시와 하단 공통 내비게이션은 제품 신규 결함으로 집계하지 않았다.

이 증거는 실제 Chrome localStorage·두 탭 Web Locks·Clipboard·DOM 흐름과 제어한 실패/지연 포트를 구분한다. 운영 브라우저 설정의 모든 quota/저장 차단·Web Locks 미지원 동시쓰기 원자성을 인증하지 않으며, 정산 내용을 자동 d URL로 유지하는 기존 동작은 그대로다. 금융기관 송금이나 실제 계좌 검증을 수행하지 않았다.
