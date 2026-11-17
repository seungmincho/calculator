# 30차 남은 시간·복귀 브라우저 준비

부모 final ready·최종 번역 생성 전 Chrome은 열지 않는다. 독립 순수/부모 리뷰는 team 담당이며 이 문서는 실제 UI·native Web Locks·다운로드 증거에 집중한다.35 임시SW 서버는 재사용하지 않고 기존3039에서 순차 진행한다.

1. **정확한 밀리초·반복 pause/resume** —1.4초 반복 tick과0.5초 미만 일시정지를 독립 누적 실행시간 oracle와 비교한다. 표시 ceil과 저장 remainingMs를 구분하고250ms callback은 표시만 한다. 시작/정지 checkpoint는 저장하되 단순 tick은 매번 쓰지 않는지 확인한다.
2. **완료 exactly once·skip/reset·autoStart** — 합성 할 일을 선택해 현재단계 완료1회에만 통계/할 일/완료수·가짜 알림/음향이 증가한다. 늦은 tick/visibility/옛callback·StrictMode 후 중복0. skip/휴식은 집중 통계0, 큰 정상 동행 점프도 현재단계만 완료하고 다음 전체시간으로 간다.
3. **wall/mono 불일치** — 벽시계만 진행/rollback·2000ms 정책 경계에서 보수적 남은 값/정지 안내를 확인한다. 남은 시간 증가0, 만료 gap의 자동집계/알림0, 명시 다음 단계만 진행. 실제 OS 절전이라고 주장하지 않는다.
4. **새로고침·legacy 복원** — 정상 legacy를 읽기만 할 때 원문0쓰기, 양수 running은 정확히 복원. 만료/정지0은 복귀 안내·집계0이며 명시 다음단계가 기존 skip 의미로 시작한다. 본문/큰estimate·회차가 보존되는지 확인한다.
5. **실제 Web Lock 대기·세대** — timer 키 lock을 다른 탭/호출로 잡고 만료를 관찰. 기다리는 동안 reset/skip/이탈하면 늦은 승인이 무효다. 승인되는 경우 저장 lastTickTime과 새단계 실행 기준이 동일하고 긴 전달 지연은 부재 단계 자동집계0이다.
6. **저장 손상/실패/두 탭** — settings/tasks/timer 각각 손상·미래버전·접근 거부/quota/readback unknown의 raw 보존과 키별 차단을 확인한다. 실제 storage event는 실행을 보수적으로 정지하고 명시 재조회 전 덮지 않는다. 명시 폐기 도중 raw변경도 거부한다.
7. **기존 목표·7일 CSV·할 일** — 실행 중 목표 변경/CSV 반출이 남은 시간과 단계에 간섭하지 않는다. 실제 BOM CSV를 독립 파싱하고 완료/skip 통계·할 일 이름 비포함을 확인한다. 기존 통계 정상 bytes를 불필요하게 다시 쓰지 않는다.
8. **320px KO/EN·초점** — 실행/정지/복귀/저장 안내·현재 할 일 원문을 유지한 언어 전환,16px/44px/overflow0, 기본 키보드 조작. 제어 시계 및 가짜 알림·AudioContext 로그를 실제 OS 엔진과 구분한다.

모든 데이터는 합성이며 실제 마이크·스피커·알림을 사용하지 않는다. native 알림 권한 요청도 fake Notification 포트에서만 수행한다. 모노/벽시계는 독립적으로 제어하되 실제 앱 timer/controller/저장·Web Locks를 통과시킨다. 브라우저/OS 강제종료의3키 원자성이나 백그라운드 정시 알림을 보장하지 않는다. 마지막 Chrome 종료 후 타입 검사와 조율한다.

실행 완료: 2026-11-17 05:55 KST, 8/8 PASS. 실제 실행 범위와 제어 포트·계획 중 독립 검사에 남긴 경계는 review-browser.md를 기준으로 한다.
