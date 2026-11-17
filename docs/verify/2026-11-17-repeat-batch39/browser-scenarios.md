# 39차 정규식 실제 브라우저 검증 계획·실행 범위

실행 완료: 2026-11-17 08:07:42 KST,8/8 PASS·Chrome 종료. 실제 결과와 최초 import 결함·검증기 정정·성능 한계는 `review-browser.md`와 `browser/final-results.json`을 따른다.

제품 final ready·canonical 통합 전 실행하지 않는다. 기존3039 서버·단일 Chrome·격리 context·외부 요청/SW 차단을 유지하며 원문은 검증용 합성 텍스트만 사용한다. 위험 정규식은 실제 module Worker 안에서만 실행하고 브라우저 메인 스레드/검증 Node에서 직접 평가하지 않는다. 전체 타입은 통합 담당 소유다.

1. **실제 Worker·기존 의미:** URL 첫 복원과 native Worker chunk/request/종료를 관측한다. nonglobal 캡처 추출, CRLF grep, replacement 토큰 결과를 독립 JS oracle와 대조한다. 빈 일치의 끝 위치·Unicode astral 전진을 실제 Worker에서 확인한다.
2. **역추적·취소·재시도:** `(a+)+$`와 합성 입력을 Worker에서 실행한다. UI heartbeat/버튼 동작과 실제 terminate를 확인하고, 중지한 같은 입력이300ms 뒤 자동 재실행되지 않음·명시 재시도·입력 변경으로 새 Worker 시작을 확인한다. 별도1회 foreground5초 timeout을 확인하되 모든 기기의 엄격한 wall-clock SLA라고 주장하지 않는다.
3. **늦은 작업·숨김·실패:** 실제 Worker 종료와 메시지/생성 실패 주입을 구분한다. A→B·오래된 완료·pagehide/제어 visibility→복귀에서 이전 결과 보존·자동 재시작0, 현재 입력 편집/명시 재시도만 실행. main-thread fallback0을 관측한다.
4. **스마트 처리·스냅샷·이력:** capitalize·여러 글자 구분자·dedupe 후 옛 예약의 덮기0. 결과와 현재 입력이 다르면 이전 결과 표시·현재 저장/공유 제한. 현재 성공 snapshot과 replacement의 기존 이력 저장/복원 및 실패 보존을 확인한다.
5. **큰 결과·실제 TXT·한도:**50,000 UTF-16 preview와 전체 결과를 구분해 실제 TXT/native Clipboard 전체 bytes를 독립 대조한다. 긴 입력/많은 일치/출력 확장 초과는 부분 성공0. 복구 원문도 전체이고 입력/복구 렌더 heartbeat를 Worker 계산과 혼동하지 않는다. 한도 수준의 대형 작업은 필요한1회만 실행한다.
6. **파일 세대·복사 수명:** native FileReader 완료 전달만 보류해 역순 선택/편집/취소/오류·같은 파일 재선택을 검사한다. output↔link 지연 복사, native success/legacy false·throw, 수동 선택/재시도, locale/input ABA를 확인한다.
7. **URL·공유·재방문:** 기존 이중 인코딩·malformed percent·replacement·smart 복원, 무관 query/hash/history 보존. 너무 긴 URL은 잘라 공유하지 않고 명시 제한하며 전체 TXT와 구분한다. 원문이 URL에 포함되는 기존 정책을 비저장으로 설명하지 않는다.
8. **320px 다크 KO/EN:** 현재 실행/이전 결과/오류·복구·취소 상태, 입력16px/조작44px·가로 overflow와 raw key/JS/hydration를 확인한다. 캡처는 짧은 viewport/패널 위주로 남긴다.

Worker 번들/native 계산·Clipboard·파일/TXT와 제어한 callback/실패/visibility 포트는 최종 보고서에서 분리한다. 검증용 heartbeat·timer 수치는 해당 Chrome 실행의 관측값이며 일반 모바일 성능 보장이 아니다.
