# 18차 독립 브라우저 검증 계획

2026-11-17 KST. 실행 계약과 영어 복원 설계를 바탕으로 `live-verify` 절차를 적용한다. 생성물 및 runtime 최종 ready 신호 뒤 기존 localhost:3039에서 Chrome 한 인스턴스로 순차 실행한다. 제품 파일·dev 서버·빌드·전체 타입 검사는 건드리지 않는다.

| # | 실제 동작 | 확인할 근거 |
| --- | --- | --- |
| 1 | KO 메모 → 타이머 → 수능 도구를 검색 UI로 이동한 뒤 현재 도구에서 EN 선택 | 같은 document 유지, KO 동안 EN 요청 0, 현재 scope/shared만 요청하며 과거 notepad/timer EN 요청 없음, 중복 요청 없음 |
| 2 | 수능 점수·선택·목표 초안 수정 후 KO→EN→KO | 입력/기록/URL 보존, 결과·공유 버튼·동적 가이드·Header/Footer 번역, 실제 클립보드 내용 |
| 3 | 저장 언어 EN으로 새 방문 | 응답 HTML은 KO, hydration 오류 0, 초기화 후 EN과 URL 점수 복원 |
| 4 | 메모 제목/본문 편집 후 언어 왕복 | 동일 textarea와 작성 원문·저장 내용 보존, 번역된 라벨 |
| 5 | 실행 중 타이머 언어 왕복 및 pause/resume | 시간이 계속 감소하며 초기화/자동 정지 없음, 번역된 실행 제어 |
| 6 | 직접 scope 연료 계산과 달리기 계산에서 입력 변경·EN 선택 | 결과 숫자 유지, 직접 scope EN 요청, 공용 MobileResultLink/공유/가이드 갱신 |
| 7 | 실제 현재 도구 EN chunk 요청 한 번 중단 후 retry 버튼 클릭, 첫 fallback JSON은 503 실패 후 다시 명시 retry | KO fallback, 명시 실패 안내, 자동 무한 재요청 없음, 거부 캐시 해제와 같은 페이지에서 실제 영어 파일 회복/EN 적용 |
| 8 | EN 응답을 대기시킨 뒤 KO 선택하고 응답 해제 | 늦은 응답이 현재 KO 선택을 되돌리지 않음, 이후 EN 선택 정상 |
| 9 | 잘못된 언어 저장값 및 language get/set 차단, `/energy-voucher/` 등 방문 | KO 기본값과 메모리 전환 유지, en 접두사 오판 없음, 원시 키/JS 오류 없음 |
| 10 | 320px 다크에서 언어 메뉴와 실패 안내/재시도·EN 결과 이동 | 가로 넘침 없음, 메뉴/재시도 버튼 44px, 화면 캡처와 원시 키 검사 |
| 11 | InstallPrompt의 실제 mount 여부를 확인 | 현재 layout에서 사용하지 않는 기존 컴포넌트임을 확인하여 표시 검증은 제외. 명시 namespace/공용 close 키는 독립 fixture·정적 검사 근거로 분리하며 새 제품 mount를 추가하지 않음 |
| 12 | KO Markdown 화면에서 EN 예제와 동일한 내용을 사용자가 직접 입력하고 언어 왕복 | 번역된 기본 예제와 우연히 같아진 사용자 원고도 본문과 localStorage에 그대로 보존 |
| 13 | shared 본문 실패 상태에서 SPA로 연료 도구 이동, 직접 scope 본문도 실패 후 명시 retry | 새 shared 소비자 mount로 자동 재시도하지 않으며, 명시 동작 한 번으로 현재 shared/direct JSON 복구 및 입력 보존 |

EN 실패는 실제 번들 요청을 중단해 재현하고 실패 응답/재요청 URL을 기록한다. EN namespace 파일명뿐 아니라 생성된 dev 파일 내용에서 `(json, async loader)` 및 manifest를 본문 `(json)`과 구분한다. KO 요청 0은 영어 본문 데이터 기준이며 작은 로더 JavaScript 요청 0을 뜻하지 않는다. 전체 카탈로그 로딩 여부는 정적 graph 담당의 근거와 별도로 기록한다. 원본 번역의 누락·오타입·배열 fallback 및 HMR/t 참조 fixture는 독립 담당 결과로 구분한다.

각 시나리오는 JS pageerror, hydration/React 오류, EN 요청 URL, 차단한 외부 요청을 저장한다. 기존 하드코딩 예시·KO 서버 metadata/JSON-LD·이미 저장된 이전 언어 알림은 전면 영어화 완료로 판정하지 않는다. 실패는 테스트 조건 오류와 제품 결함을 분리하고 담당 수정 후 영향 사례만 다시 실행한다.
