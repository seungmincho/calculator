# 22A 직접 등급·원점수 결측 독립 검토

2026-11-17 KST · 담당 `gpa_scenarios`. [22차 계약](plan.md)과 최종 부모/자식/유틸 연결을 읽고 실제 제품 코드를 실행하는 [독립 검사](check-csat-independent.mjs)를 추가했다. 제품 파일·기존 검사·번역 원본은 수정하지 않았다. Chrome·전체 tsc·빌드도 실행하지 않았다.

**6그룹 PASS이며 추가 수정 요청은 없다.** 실제 ShareResult PNG와 브라우저 입력/모바일은 브라우저 담당 결과로 분리한다.

| 그룹 | 독립 확인 |
| --- | --- |
| 원점수 유효성 | 6개 영역 × 빈칸/0/00/문자/음수/범위초과/소수/공백/지수표기 **54개**를 대조했다. missing/invalid의 score/grade/est/next는 모두 null이고, 0/00은 유효 0점·9등급이다. 한국사는 두 평균을 막지 않고 영어는 전체 평균만 막는다. |
| 기존 완전 입력 | 12개 완전 점수 조합을 기존 gradeOf와 원래 산술식(탐구 두 과목 평균을 한 영역으로)의 독립 계산에 대조했다. 동일 탐구의 다른 점수는 같은 등급이더라도 평균을 보류한다. 44/044는 같은 점수로 인정하며 중복 안내를 유지한다. |
| 직접/원점수 adapter | 모든 탐구 과목의 0/25/50점에서 얻은 등급과 직접 입력의 2/3/4영역 목표를 대조했다. 같은 과목 두 슬롯은 한 영역이고, 직접 등급 상충 시 탐구를 제외한다. CUTS에 존재해도 탐구가 아닌 `english`와 빈 선택은 탐구로 세지 않는다. |
| 실제 원점수 부모 | 6개 영역 × 빈칸/0/무효 **18사례**에서 hydration 전 주소 미변경, 복원된 raw spelling, 행·hero·ShareResult payload·표 강조를 대조했다. 기타 query/hash와 기존 원점수 기록 bytes를 보존했다. |
| 실제 목표 CRUD 연결 | 실제 `CsatGrade → CsatGoalConditions → CsatDirectGradePanel`을 연결했다. 목표 수정은 즉시 직접 판정에 반영되고, 삭제/새 저장 뒤에도 직접 입력이 남는다. 오직 목표 저장 키만 명시 CRUD로 쓰였으며 원점수 snapshot/기록 bytes/URL은 변하지 않았다. |
| 실패·상태 분리 | 다른 탭 conflict, 재조회, 손상 목표 저장본, 정상 복구, 접기/재열기, ko/en 변경, 원점수 기록 복원 중에도 직접 입력을 유지했다. blocked일 때 판정을 숨기고 최신 목표로 재조회한 뒤 다시 계산한다. 직접 등급은 원점수 URL·공유 payload에 들어가지 않는다. |

## 코드 경계

`CsatDirectGradePanel`은 기존 목표와 ready/blocked만 받고 원점수 setter·저장소를 받지 않는다. `CsatGoalConditions`는 자식을 조건 없이 같은 위치에 유지한다. 원점수는 `summarizeCsatRawGrades`의 같은 행을 표시·공유·표에 사용한다. 원점수/직접 등급 adapter가 검증한 등급 뒤의 정렬·영역 수·합/status만 generic helper로 공유하므로 직접 입력에서 원점수를 역산하지 않는다.

raw 동일 탐구는 **점수** 상충을, direct 동일 탐구는 **입력 등급** 상충을 판단한다. 같은 등급이어도 서로 다른 원점수의 raw 충돌을 direct와 강제로 같게 만드는 오류는 없다. 두 adapter는 서로 다른 사용자가 제공한 자료를 평가하는 구조다.

상단 `#csat-grade-context`의 44px 링크와 항상 존재하는 `#csat-direct-grade-panel`/명시 열기 버튼도 최종 코드를 확인했다. 이는 실제 화면의 위치·발견성 검증을 대신하지 않는다.

## 명령·한계

`node docs/verify/2026-11-17-repeat-batch22/check-csat-independent.mjs` → **6그룹 PASS, exit 0**. Node의 기존 package module type 안내는 실패가 아니다. `npx eslint docs/verify/2026-11-17-repeat-batch22/check-csat-independent.mjs`도 **exit 0, 오류/경고 0**이다.

이 검사는 실제 React 컴포넌트 코드를 hook/event harness로 실행하며 Storage·URL·시간을 제어한다. native number input의 표시/IME, 실제 저장소 탭 이벤트, ShareResult PNG, 320px·접근성 DOM 검증은 포함하지 않는다. 기존 추정컷의 수치나 외부 입시 제도를 새로 검증했다고 주장하지 않는다.
