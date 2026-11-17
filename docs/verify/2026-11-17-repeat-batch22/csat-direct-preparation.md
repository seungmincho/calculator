# 22A 직접 등급·원점수 결측 — API와 준비 검증

2026-11-17 KST. 담당 `/root/taxi_repeat`. 아래는 21차 체크포인트 전 신규 파일만 준비한 기록이다. 이후 부모 연결을 승인받아 구현했으며 최신 범위는 [구현 기록](./csat-direct-implementation.md)에 있다. 컷과 원점수 기록 schema는 변경하지 않았다.

## 작은 API

- `csatGradeGoalEvaluation.ts`의 `evaluateCsatGradeAreas<T>(available, condition)`은 이미 유효한 숫자 등급과 area id를 받은 뒤 정렬/필요 영역 수/합계/status만 계산한다. 원래 T의 과목·필드 메타데이터를 보존하며 원 배열을 정렬하지 않는다. 조건은 2/3/4영역, 영역 수~영역 수×9의 정수 상한이다. 부족하면 sum/over가 null이다. 기존 raw adapter 연결은 아직 하지 않았다.
- `csatDirectGrades.ts`의 `emptyCsatDirectGrades()`는 국어·수학·영어·탐구1/2 등급과 탐구 두 과목을 모두 빈 문자열로 만든다. `evaluateCsatDirectGoal(input, condition)`은 한 자리 `[1-9]`만 유효한 등급으로 센다. 탐구는 allowlist 과목이 필요하며 동일 과목 상충 등급은 제외한다. 같은 과목/같은 등급은 한 영역, 서로 다른 두 과목도 좋은 한 과목만 한 영역이다. 동률은 첫 슬롯을 유지한다. 국어·수학에 임의 선택과목을 부여하지 않는다.
- `csatGradeSummary.ts`의 `csatRawGradeRow(snapshot, field)`는 `valid | missing | invalid` 행을 만든다. missing/invalid는 score·grade·est·next가 모두 null이다. 실제 `0`, `00`, `000`은 기존 원점수 계약처럼 유효하다. 숫자/컷/보간은 기존 엔진을 재사용한다.
- `summarizeCsatRawGrades(snapshot)`는 전체 평균/영어 제외 평균을 독립 nullable 값으로 반환한다. 둘 다 국어·수학·탐구 두 입력이 필요하고 전체에만 영어가 필요하다. 한국사는 두 평균을 막지 않는다. 동일 탐구 과목의 서로 다른 원점수는 등급이 같더라도 두 평균을 막는다. 동일 과목/같은 원점수는 기존 숫자를 유지하며 duplicate 표시를 반환한다. 분모를 줄인 평균은 만들지 않는다.

## 자식 UI

`CsatDirectGradePanel({ goals, ready, blocked })`은 같은 목표 목록을 읽기 전용으로 받는다. raw snapshot/setter/storage를 전달받지 않는다. 처음 접힌 상태의 명시 버튼으로 열고, 다섯 등급과 탐구 두 과목을 자체 state에 유지한다. 접기·언어·목표 CRUD/재조회 props 변경은 입력을 지우지 않으며 명시 초기화만 비운다. blocked/준비 중에는 목표 결과를 노출하지 않는다.

사용한 유효 영역·실제 탐구 과목·등급과 현재 입력 기준을 표시한다. 각 목표 결과의 기준은 ‘사용자가 직접 입력한 등급’이며 공식 검증·올해 확정·가짜 원점수·표준점수·백분위·평균을 만들지 않는다. 원점수 12기록/공유 URL/공유 카드에 포함되지 않는 범위를 안내한다. 선택 16px/제어 44px/단일 모바일 열을 사용한다.

`translations-csat-direct.json`은 ko/en `csatGrade.directGrades` 및 향후 결측 요약 연결에 필요한 `rawSummary` 조각이다. 공용 원본 병합은 21차 체크포인트 이후 통합 담당이 진행한다.

## 준비 검증

- `node scripts/check-csat-direct-grades.ts`: 11그룹 PASS. 직접 등급 경계/부분 입력/allowlist/탐구 중복·상충·동률, invalid condition, 원 메타데이터/불변성, 모든 6,561개 4영역 등급 조합의 2/3/4 합산과 기존 bestSum 대조, 모든 탐구 컷 경계 raw/direct 결과 대조, 완전 입력 숫자, 빈/0/무효, 한국사·영어 결측, 중복 탐구 상충 평균 보류.
- `node docs/verify/2026-11-17-repeat-batch22/check-csat-direct-panel.mjs`: standalone actual child 3그룹 PASS. 미입력 출발/명시 열기·원기록 bytes/URL 불변, 접기·목표 수정/삭제·blocked/KO↔EN 입력 보존, 탐구 과목 미선택/상충 안내.
- `npx eslint src/utils/csatGradeGoalEvaluation.ts src/utils/csatDirectGrades.ts src/utils/csatGradeSummary.ts src/components/CsatDirectGradePanel.tsx scripts/check-csat-direct-grades.ts`: exit 0, 오류·경고 0.
- 준비 UI 검사 mjs scoped lint exit 0.

부모의 hero/share/table에 결측 helper를 연결하고 raw/direct 목표 합산 helper를 연결하는 작업은 아직 미완료다. 따라서 실제 페이지 개선/공유 이미지·브라우저 검증 완료로 해석하지 않는다. 전체 tsc/브라우저/빌드/배포는 실행하지 않았다.
