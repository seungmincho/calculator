# 30차 포모도로 실제 브라우저 검증

최종 **8/8 PASS**, 2026-11-17 05:55:19 KST (`2026-11-16T20:55:19.028Z`). 이 실행의 Chrome은 닫혔다. 이어지는28차 검사와 전체 타입 검사는 별도 집계한다.

실행기: `scripts/check-repeat-batch30-browser.mjs`. 최종 개별 결과와 합계는 `browser/final-results.json`이다. 기존3039 개발 서버를 재사용했고 새 서버/빌드/배포/실사용 저장소를 조작하지 않았다. 시나리오별 새 context, 외부 요청 및 service worker 차단을 적용했다.

## 실제 확인한 범위

| 흐름 | 근거 |
|---|---|
| 밀리초·체크포인트 | 1,400ms tick 후125.5ms의 표시 사이 시간을 pause에서 확정해58,474.5ms/표시59초를 보존. pause 중30초 진행은 차감0. 재개 후137.25+112.75+444.4+555.6ms를 차감해57,224.5ms. tick 저장0, pagehide 체크포인트는 정확한 ms 저장. legacy 읽기0쓰기→정상 동작 시 version1 호환 저장. |
| 완료·자동 다음 단계 | 집중 완료1회에 통계1/선택 할 일1/완료수1. 이전 callback4번과 pageshow로 중복0. 휴식 완료는 집중 통계 불변. 일반 skip은 기존 소리 정책을 유지하고 알림·집중 집계0. 전체 초기화는 세션 수만 초기화하며 일일 기록 보존. |
| 두 시계 차이 | wall만2,000ms는 허용,2,001ms는57,999ms에서 정지. wall rollback은56,999ms로 보수적 정지하며 시간 증가0. wall70초/mono100ms의 만료는 자동집계0·명시 다음 단계. 두 시계가 함께180초 진행한 정상 지연은 현재 집중1회만 집계. |
| 재방문 | 만료 legacy 원문은 초기 읽기에서 그대로 유지, 집계·할 일·소리·알림0. 명시 다음 단계 후 running 저장본을1,234ms 뒤 reload하면58,766ms. 다시 만료 후 reload는 복귀 안내/집계0. |
| 실제 Web Locks | timer 키를 native lock으로 잡은 채 완료를90초 지연. 승인 후 저장 `lastTickTime`과 다음 단계 시작이 일치하며60,000ms부터 시작. 대기 작업 취소 후 늦은 승인 집계0. native write 이후 영수증 전달만1,250ms 지연하면58,750ms를 적용. |
| 저장·두 탭 | 손상 settings/tasks·미지원 timer 원문 보존과 키별 경고. 명시 timer 폐기는 다른 두 키를 보존. quota에서 메모리 실행 유지. 쓰기 성공 후 확인 읽기 실패는 unconfirmed 정지. 정상 재조회 후 두 탭의 실제 storage event로 오래된 실행 정지·명시 재조회·상대 탭 pause 반영, 집계0. |
| 기존 목표·CSV | 실행 중 목표6 저장은 phase ID/남은 ms/timer bytes를 유지. pause/resume 후 완료가 기존 일일1회에 더해2회26분, 할 일1회. 실제 `pomodoro-2026-11-17-7days.csv`는 UTF-8 BOM·quoted CSV·7일+헤더8행이며 이전 날2회50분도 보존. |
| 320px 다크 KO·EN | document/body 모두320px, 입력16px 이상, 주요 조작44px 이상. 실행 중 언어 변경은 phase ID/58,474.5ms/원문을 유지하고 이후474.5ms 진행도58,000ms로 정확. 원시 키0. |

`browser/native-pomodoro-7days.csv`와 `pomodoro-320-{ko,en}-{top,panel}.png`를 남겼다. KO 타이머 패널을 직접 시각 검토했으며 버튼·안내가320px 안에 표시됐다.

## 실제 엔진과 제어 포트 구분

React 부모/controller, 브라우저 localStorage, 두 탭 storage event, Web Locks, 사용자 조작, CSV Blob 다운로드, KO/EN 전환과 레이아웃은 실제 Chrome이다. `Date.now`와 `performance.now`를 독립 제어하고 실제 등록된250ms callback을 직접 발화했다. sleep/rollback은 이 제어 입력의 상태 전이 증거이며 실제 OS 절전 시험은 아니다.

AudioContext와 Notification은 가짜 포트다. 집중·휴식 완료 알림2회와 일반 skip을 포함한 소리 호출3개(각3 oscillator)를 확인했지만 실제 스피커/OS 알림/권한 요청0이다. 배경 탭의 정시 알림, 기기 강제종료 시3키 동시 원자성, Web Locks 미지원 환경의 완전한 동시 쓰기는 검증·보장하지 않는다. 저장 접근 불가/폐기 중 CAS 변경/설정 적용·unmount 세대의 더 세부 조합은 작성자·독립 검사 범위이며 이8흐름에 합산하지 않는다.

JS page error·hydration·unhandled rejection·원시 번역 키는 모두0. 외부 통계·글꼴 요청 차단에 따른 console 오류는 예상한 네트워크 경계로 별도 원문 기록했다.

## 검증기 수정 및 판정

새 제품 결함은 발견하지 않았다. 첫 실행은 `/pomodoro-timer/`라는 검증기 경로 오타로404에 진입했으며 정확한 `/pomodoro/`에서 실제8흐름을 실행했다. 이때6PASS 뒤 두 fixture 오류를 수정했다: 새 탭의 가상 wall을 이전 탭보다1초 과거로 만든 탓에 정상 rollback 정지가 발생한 경우, 기존 CSV의 quoted 필드를 unquoted로 기대한 경우다. 두 탭 가상 clock을 같은 장치 시각으로 맞추고 CSV 인용부호 기대를 고친 뒤 해당2흐름만 재실행해8PASS를 확정했다. 과거 `*-failure.*`는 이러한 fixture 진단이며 최종 판정은 evidence/final-results를 따른다.

두 전용 실행기 범위 ESLint 최종 오류0/경고0. EN 상단 캡처도 직접 확인해 현재59초/일시정지/단계 탭·가이드가320px 안에 유지됨을 확인했다. 하단 개발 Issue 표시는 외부 차단/개발 UI이며 제품 오류 판정으로 합산하지 않았다.
