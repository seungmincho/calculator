# 22A 직접 등급 비교·원점수 결측 요약

2026-11-17 KST. 담당 `/root/taxi_repeat`. 21차 체크포인트 뒤 부모를 연결했다. 독립·실제 브라우저 검증은 진행 중이며 빌드·배포는 하지 않았다.

## 직접 등급 패널

`CsatGoalConditions.tsx`가 가진 같은 6개 목표와 준비/차단 상태를 `CsatDirectGradePanel`에 전달한다. 자식은 조건 없이 같은 위치에 계속 mount되며 원점수 snapshot/setter/storage는 받지 않는다. 국어·수학·영어·탐구1/2의 직접 등급과 탐구 두 과목은 자체 메모리 state에만 있다. 패널 접기·목표 CRUD/재조회·차단·언어 변경으로 초기화하지 않고 명시 초기화와 페이지 이탈 때 비운다.

직접 등급은 빈 값 또는 한 자리 1~9, 탐구는 allowlist 과목을 사용한다. 같은 과목/같은 등급은 한 영역이고 상충 등급은 제외한다. 서로 다른 탐구도 좋은 한 과목만 한 영역이며 동률은 첫 슬롯을 유지한다. 실제 사용 영역·과목을 표시하고 부족한 입력에서는 합계/충족 여부를 만들지 않는다. 국어·수학에 임의 선택과목을 붙이지 않는다.

각 결과에 사용자 직접 입력 기준을 표시한다. 공식 확인·올해 확정 성적·가짜 원점수·직접 등급의 평균/표준점수/백분위를 만들지 않는다. 기존 원점수/12개 기록/공유 URL/공유 카드와 별개임을 안내한다. 부모 상단 기준 안내의 ‘등급으로 목표 비교’ 링크가 `#csat-direct-grade-panel`로 이동하며 접힌 상태에서도 44px 열기 버튼이 바로 보인다.

원점수와 직접 등급 adapter는 숫자 등급이 준비된 이후의 정렬/필요 영역 수/합/status만 `csatGradeGoalEvaluation.ts`로 공유한다. raw adapter의 선택과목·실제 점수 상충·안내 메타데이터는 그대로 보존한다. 기존 컷·보간 엔진과 목표/원점수 저장 schema는 변경하지 않는다.

## 원점수 결측 요약

`CsatGrade.tsx`는 `summarizeCsatRawGrades`의 valid/missing/invalid 행을 과목 입력 결과·hero·평균·공유 데이터·표 강조에 함께 사용한다. missing/invalid 행에는 점수/등급/보간/다음 컷을 만들어 표시하지 않는다. 실제 `0`은 유효한 0점·기존 9등급이며, 유효한 완전 입력의 기존 결과를 유지한다.

- 전체 평균에는 국어·수학·영어·탐구 두 입력이 필요하다.
- 영어 제외 평균에는 국어·수학·탐구 두 입력이 필요하다. 한국사는 어느 평균도 막지 않는다.
- 같은 탐구 과목에 다른 점수를 넣으면 등급이 같아도 두 평균을 보류한다. 같은 과목/같은 점수는 기존 평균을 유지하며 중복 안내를 숨기지 않는다.
- 분모를 줄인 부분 평균을 만들지 않는다. 입력 부족과 입력 확인 필요를 구분한다.
- URL 파라미터 누락은 기존 기본값, 명시 빈 문자열은 미입력, `0`은 유효값, `abc`/소수/범위 밖은 무효 원문으로 구분한다. 기존 `subject/score` 링크에도 같다. 원점수 onChange도 임의 0점/반올림/상하한으로 바꾸지 않고 원문을 보존한 채 계산을 보류한다. root가 이 무효값 복원 범위를 승인했다.
- 기타 query/hash와 기존 URL 필드/원점수 기록 bytes·schema는 유지한다. 직접 패널 값을 이 경로에 추가하지 않는다.

ko/en 조각 `translations-csat-direct.json`은 통합 담당이 병합한다. 원본 messages·메타·생성물·메뉴는 직접 편집하지 않았다.

## 자체 검증

| 검사 | 결과 |
|---|---|
| `node scripts/check-csat-direct-grades.ts` | 11그룹 PASS: 등급 경계/탐구/부분 입력, generic metadata, 6,561 조합×2/3/4 기존 합산 대조, 모든 탐구 컷 raw/direct 대조, 결측/0/무효/평균 |
| `node docs/verify/2026-11-17-repeat-batch22/check-csat-direct-panel.mjs` | 실제 standalone child 3그룹 PASS: 입력/접기/목표 갱신·차단/언어/원기록 bytes·URL 불변 |
| `node docs/verify/2026-11-17-repeat-batch22/check-csat-raw-summary.mjs` | 실제 부모 5그룹 PASS: 누락/빈/0/무효/legacy, 영어·한국사, 중복 상충, typing 원문, hero/share payload·표 강조 일치 |
| `node scripts/check-csat-goals.ts` | 기존 24그룹 PASS: 기존 raw 합산·필드 라벨·CRUD/검증/저장 경계 |
| `node scripts/check-csat-grade.ts` | 기존 등급 엔진 회귀 PASS |
| 제품/유틸/도메인 검사 8파일 scoped ESLint | exit 0, 오류·경고 0 |
| 신규 UI/부모 mjs 검사 및 마지막 이동 링크 영향 scoped ESLint | exit 0, 오류·경고 0 |

8파일 명령: `npx eslint src/components/CsatGrade.tsx src/components/CsatGoalConditions.tsx src/components/CsatDirectGradePanel.tsx src/utils/csatGoals.ts src/utils/csatGradeGoalEvaluation.ts src/utils/csatDirectGrades.ts src/utils/csatGradeSummary.ts scripts/check-csat-direct-grades.ts`.

자체 부모 검사는 실제 ShareResult에 전달되는 텍스트/카드 payload를 확인했다. 실제 PNG·모바일 화면·중첩 목표 CRUD는 독립/단일 Chrome 담당이 별도로 검증하며, 이 기록만으로 완료했다고 주장하지 않는다. 전체 타입 검사는 통합 담당이 수행한다.

## 안정 selector

- `#csat-direct-grade-panel`, `[data-csat-direct-grades]`, `[data-direct-grade]`, `[data-direct-inquiry]`, `[data-direct-goal]`, `[data-direct-status]`
- `[data-csat-average="all|noEnglish"]`, `[data-csat-hero-grade]`
- `li[data-csat-score-field][data-csat-score-state="valid|missing|invalid"]`

독립/브라우저 결과와 발견 후 영향 검사는 해당 담당 보고서에 추가한다.
