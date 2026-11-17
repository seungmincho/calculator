# 20A 음력 기념일 독립 검토

2026-11-17 KST · 담당 `gpa_scenarios`. 제품 파일은 변경하지 않았다. [계약](plan.md)과 실제 `lunarSavedAnniversaries.ts`, `LunarSavedAnniversaries.tsx`, `LunarConverter.tsx`, `LunarAnniversaryCalendar.tsx`, `LunarCopyRecovery.tsx`를 대조했다. Chrome·전체 타입 검사·빌드는 실행하지 않았다.

## 확인한 결과

독립 [실행 검사](check-lunar-independent.mjs) **총 8그룹이 통과했다**. 첫 7그룹 통과 후 마지막 경계에서 P2를 재현했고, 담당자의 최소 수정 뒤 영향 1그룹만 다시 실행해 통과했다. 원 날짜를 저장하고 다음 기념일의 대체 날짜를 별도로 계산하는 도메인·기존 입력/공유 URL 우선·명시 불러오기·저장 충돌/실패·복사 복구는 아래 범위에서 계약과 일치한다. 추가 수정 요청은 없다.

| 검사 | 근거 |
| --- | --- |
| 원 날짜 보존 | 1900~2050년의 일반 월말/윤달 월말 **357개** 유효 날짜를 기존 엔진으로 왕복 확인했다. 다음 기념일을 계산해도 원 연도·월·일·윤달 값이 변하지 않는다. 지원 끝을 넘는 날짜는 저장할 수 없다. |
| snapshot 분리 | 반환 목록이나 불러온 객체를 외부에서 바꿔도 다음 rename/load는 저장 원문에서 다시 검증한 원 날짜를 사용한다. 마지막 삭제 후 revision이 있는 빈 목록은 과거 `null` snapshot의 쓰기를 거부한다. |
| 대기 작업 | 입력 변경/취소/언마운트가 대기 lock의 AbortSignal을 취소하고 load를 적용하지 않는다. 예전 작업의 늦은 rejection이 새 이름 변경 확인을 지우지 않는다. |
| 다른 탭 | storage 이벤트가 있는 경우와 없는 경우 모두 오래된 load/delete를 거부한다. 재조회는 최신 이름을 표시하고 명시 동작을 다시 허용한다. |
| 저장 실패 | 쓰기 뒤 readback 실패는 성공 대신 확인 불가로 표시하고 이름 초안을 보존한다. 재조회 후 실제 저장본을 확인한다. 손상/null/future/잘못된 윤달 저장본은 자동 쓰지 않는다. |
| 부모·ICS 연결 | 양력 공유 URL에서도 실제 변환 쌍의 원 음력 날짜를 저장 후보로 전달한다. 명시 load는 원 음력 날짜·모드와 제목을 적용하고 load revision을 바꾼다. 새 ICS child는 연도 미선택이며, 이후 사용자 제목 편집은 일반 부모 재렌더로 지워지지 않는다. |
| 복사 복구 | 이전 대상의 늦은 Clipboard 거부는 fallback을 실행하지 않는다. 새 대상의 성공을 구분하고, 실제 `execCommand(false)`는 실패 복구로 이어진다. 복구 textarea는 현재 실패 대상의 전체 텍스트/readOnly이며 명시 선택 실패도 안내한다. |
| 캘린더 편집과 늦은 load | 대기 중 제목/연도 편집 각각 lock의 AbortSignal을 취소한다. 원 변환 입력과 새 제목/선택은 보존되고, 오래된 완료 뒤에도 새 명시 불러오기 확인은 정상 동작한다. |

## 발견한 경합 — P2, 수정·재검증 완료

저장본의 ‘불러오기 확인’이 Web Lock을 기다리는 동안 사용자가 캘린더 제목을 편집하면 부모 `inputKey`에 반영되지 않았다. lock 해제 후 오래된 load가 원 날짜를 교체하고 ICS key를 바꿔 새 제목을 잃는다. 실제 부모/저장 패널/ICS 컴포넌트 이벤트를 연결한 8번째 그룹에서 재현했으며 원 날짜 `2024-02-30 일반월`이 원치 않은 `2025-06-10 윤달`로 바뀌었다.

담당 `taxi_repeat`가 `LunarAnniversaryCalendar`의 선택적 `onEdit` callback을 제목·연도의 명시 편집 경로에 추가하고 부모 `calendarEditRevision`을 `inputKey`에 포함했다. 초기 렌더/정상 load는 callback을 호출하지 않는다. 독립 영향 재검사에서 제목과 연도 선택 두 경우 모두 취소·현재 편집 보존·이후 새 명시 확인 성공을 확인했다. 제품 파일은 원 담당자만 수정했다.

실행 명령: `node docs/verify/2026-11-17-repeat-batch20/check-lunar-independent.mjs`(최초 7 PASS + P2 재현). 수정 후 `node docs/verify/2026-11-17-repeat-batch20/check-lunar-independent.mjs Editing`는 **exit 0, 1그룹 PASS**. `npx eslint docs/verify/2026-11-17-repeat-batch20/check-lunar-independent.mjs`도 **exit 0, 오류/경고 0**이다. Node는 기존 package module type 설정에 대한 경고를 출력했으며 실행 실패는 아니다.

## 검증 한계

React hook/event harness는 실제 제품 코드를 실행하고 Web Lock·Storage·Clipboard I/O를 제어한다. 실제 브라우저의 DOM focus, 플랫폼 Clipboard, Web Locks 직렬화, 다운로드 및 320px 배치는 별도 브라우저 담당의 결과다. 이 보고서는 기존 음력 테이블 자체의 천문학적 정확성을 새로 검증한 결과가 아니다. Web Locks를 사용하지 않는 탭까지 localStorage 원자성을 보장하지 않는다.
