# 52차 실제 브라우저 검증

2026-11-17 09:59 KST. **첫 실행 8/8 PASS**, Chrome 종료. 새 제품 결함이나 fixture 수정 재실행은 없었다. 전체 타입도 2026-11-17 10:15:57 KST 시작 검사에서 첫 실행 PASS했다.

`scripts/check-repeat-batch52-browser.mjs`를 기존 localhost:3039에서 실행했다. Chrome 한 개, 격리 문맥, 합성 입력, Service Worker·외부 요청 차단을 사용했다. 서버·제품 코드·사용자 저장소는 변경하지 않았다. 실행기/fixture의 문법 및 범위 ESLint는 오류·경고0이다.

| 실제 흐름 | 확인한 결과 |
|---|---|
| 8종 계산·단위 | 별도 수계산과 화면/실제 Clipboard를 대조:30,12.5%,+25%,8500,10000,31.6%,+1.5%p,10000. |
| 6개 비교 목록 | raw `00120`과 당시 설정/수식을 유지. 중복/7번째 거부, 기존 항목 제거 없음. 계산 reset·목록 clear는 서로 독립. |
| 전체 TXT·복사 | 실제 `percent-comparison.txt` **638 bytes**, UTF-8/no BOM. Clipboard 제출값과 파일 bytes가 일치하고 현재 입력을 바꿔도 snapshot 출력이 유지됨. |
| 실패·교차 소유 | API 없음/legacy false는 전체 readonly 복구, 전체 선택. 거부→legacy true는 제어 성공. 카드→목록→다른 카드→TXT 뒤 오래된 거부의 fallback0. |
| 초기 편집·ABA | 해당 복원 microtask만 보류. ready 전 copy 차단, 초기 사용자 입력 전체 우선. 입력 A-B-A·KO-EN-KO 후 옛 성공/실패 안내0. |
| URL·새 방문 | 14필드/5단계/소수4/한국어 표시 복원. 초기 URL 쓰기 없음. 명시 빈 입력·무관 중복 query/hash/history.state 유지. 실제 새 탭에는 비교 목록 자동 복원0. |
| 오류·기존 동작 | finite overflow5경로의 숫자/copy/add 없음. 실제0·빈칸·기준0 구분, 큰 유효1e300·선택 가격 오류 무시·기존 한 줄 질문·5단계 유지. |
| 320px KO/EN | body/document 모두320px, 관련 입력16px·버튼44px, Enter 전체 선택·비교 앵커 통과. 캡처를 직접 열어 확인. |

실제 Clipboard 읽기의 Windows CRLF는 제출 LF와 구분해 정규화 비교했다. 거부·legacy true/false·지연 microtask는 제어 포트이며 실제 OS 권한 거부 대화상자를 검증한 것은 아니다. 목록은 메모리만 유지하며 local/session에 snapshot을 쓰지 않은 것을 확인했다. 금융 정밀 연산이나 모든 IEEE754 수를 전수 검사한 결과는 아니다.

모든 흐름 JS pageerror·hydration·unhandled rejection·React caught runtime error0, 원시 번역 키0. 차단된 외부 폰트/광고/동의/방문통계 요청의 console 오류는 예상 차단 기록이다. 캡처의 개발 Issue 배지만으로 내부 원인을 확정하지 않았다. 긴 element 캡처에 고정 Header/하단 메뉴가 겹치는 부분은 캡처 방식의 흔적이며 실제 가로 overflow는 없었다.

근거: [최종 결과](browser/final-results.json), [실제 TXT](browser/percent-native-whole.txt), [KO](browser/percent-comparison-320-ko-panel.png), [EN](browser/percent-comparison-320-en-panel.png).


최종 공통 타입 근거: preflight 2026-11-17T01:15:57.458Z(10:15:57 KST), 여유3.09GiB, heap2048MiB, session68215, 최종 chunk24ecd5, exit0·진단0. 모든 Chrome 종료 및 writer freeze 뒤 통합 담당이 실행했다. 53 제품 EOF 빈줄1개만 무동작 포맷 보완됐으며 실제 동작 변경이 없어 native 재실행은 하지 않았다.

