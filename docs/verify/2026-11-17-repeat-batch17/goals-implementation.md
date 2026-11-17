# 17차 A — 수능 사용자 목표 조건 비교

2026-11-17, 담당 `gpa_scenarios`. **00:52 KST 제품 안정 상태 확인** 후 전체 타입 검사 담당자에게 전달했다. 원래 수능 등급 계산·16차 점수 기록을 유지하면서 사용자 목표 조건과 입력 준비 상태를 추가했다.

## 제품 동작

- 이름 1~40자, 상위 2·3·4개 영역, 등급 합 상한으로 구성한 목표를 최대 6개 저장한다. 새 저장·수정 저장·삭제는 명시적인 확인을 거친다. 수정은 같은 ID와 생성 시각을 유지한다.
- 목표 목록은 이 브라우저의 별도 저장소에만 보관한다. 점수 기록을 덮어쓰거나 공유 URL에 자동 포함하지 않는다. 저장된 목표를 읽는 것만으로 원점수·선택과목·기존 일회성 조건을 바꾸지 않는다.
- 저장 목표 카드와 기존 `#csat-minimum-result`가 **같은 평가 함수와 결과 컴포넌트**를 사용한다. 결과에는 현재 유효 입력 영역 수와 실제 합계에 사용한 선택과목·등급을 표시한다.
- hero의 3합과 공유 텍스트도 같은 함수의 합계를 사용한다. 유효 영역이 부족하면 숫자 대신 `입력 필요`를 표시하고, 일부 입력만으로 합계를 구한 경우에도 현재 유효 입력 기준이라고 명시한다.
- 대학별 필수 영역·탐구 평균·반올림·한국사 별도 기준을 적용하는 엔진이나 지원 가능성·합격 판정으로 설명하지 않는다. 2026학년도 상대평가 참고 추정과 영어 절대평가 구분은 유지한다.
- 입력·선택 16px, 버튼 최소 높이 44px, 모바일 한 열 배치를 사용한다.

## 평가 계약

`evaluateCsatGoal(snapshot, { areas, maxSum })`의 상태는 `needsInput | within | over | invalidCondition`이다.

1. 국어·수학·영어·탐구의 최대 네 영역을 센다. 한국사는 포함하지 않는다. 빈 문자열은 영역을 채우지 않으며 실제 `0`은 유효한 9등급 점수다.
2. 유효 원점수 문자열과 영역별 선택과목을 검사한 후 기존 `gradeOf`를 호출한다. 범위 초과·소수·잘못된 선택과목을 조용히 반올림하거나 clamp하지 않는다. 탐구 키는 사회·과학탐구 17개 allowlist로 한정한다.
3. 탐구 두 슬롯은 최대 한 영역이다. 서로 다른 탐구 과목이면 더 좋은 등급을 선택하고 실제 선택된 과목을 결과에 표시한다. 같은 등급의 동점은 첫 슬롯을 선택한다.
4. 같은 탐구 과목을 중복 입력해도 한 과목·한 영역이다. 둘 다 유효하지만 원점수가 다르면 모순된 입력으로 보아 탐구 영역을 제외하고 수정 안내를 표시한다. 숫자가 같은 `044`와 `44`는 동일 점수다. 한 슬롯만 유효하면 해당 한 과목을 표시한다.
5. 유효 영역 수가 목표 `areas`보다 적으면 합계·초과량은 `null`이며 `needsInput`이다. 이 상태를 미충족 또는 충족으로 표시하지 않는다. 다른 영역이 충분하면 그 유효 영역들로만 참고 비교한다.
6. 충분한 유효 영역의 등급을 좋은 순서로 합산한다. 네 영역이 모두 유효하면 기존 `bestSum`을 그대로 호출한다. 실제 사용 영역 등급의 합과 결과 합계는 같다.
7. `areas`는 정수 2·3·4, `maxSum`은 `areas` 이상 `areas × 9` 이하의 정수다. 범위 밖인 기존 공유 조건도 `invalidCondition`으로 안내하고 결과를 단정하지 않는다.

반환값에는 `available`, `used`, `sum`, `over`, `invalidFields`, `inquiryConflict`, `duplicateInquiry`, `singleInquiry`를 포함한다. 저장된 조건 객체와 일회성 조건 객체가 동일한 조건값일 때 같은 결과를 낸다.

## 저장·복구 계약

저장 key와 Web Lock 이름: `toolhub-csat-goals-v1`.

```ts
{
  version: 1,
  revision: string,
  goals: [{ id, name, areas, maxSum, createdAt, updatedAt }]
}
```

ID/revision은 영숫자·`_`·`-` 1~80자, 시각은 유효한 정규 UTC ISO 문자열이다. 이름 중복은 별도 목표로 허용하지만 ID 중복은 거부한다. 목록과 각 항목의 정확한 필드, 전체 6개 한도와 32KiB UTF-8 상한을 검증한다. 원점수·선택과목을 이 저장소에 추가하지 않는다.

손상·미지원 버전·용량 초과 데이터는 보존하며 쓰기를 중단한다. 읽기·쓰기 접근 실패, quota, 다른 탭 변경은 거짓 성공 없이 안내한다. 쓰기 전 raw 비교, 쓰기 후 readback을 적용하며 확인 불가에서는 이미 저장됐을 수 있고 rollback을 보장하지 않음을 알린다. 재시도 전 사용자가 목록을 다시 읽어야 한다.

Web Locks 지원 브라우저에서는 같은 도구의 쓰기를 직렬화한다. 미지원 환경의 raw 비교/readback은 완전히 동시인 탭 쓰기의 원자성을 보장하지 않는다. 추가 서버·계정·패키지는 없다.

점수/선택과목·목표 편집 내용·준비 상태가 바뀌거나 사용자가 취소·재조회하거나 storage 이벤트/unmount가 발생하면 대기 작업 세대를 무효화한다. 취소 버튼은 잠금 대기 중에도 작동한다. 이전 작업은 나중에 잠금을 얻어도 저장하지 않으며 새 확인 상태를 지우지 않는다. 기존 16차의 검증된 액션 가드를 재사용한다.

## 소유 파일

- `src/utils/csatGoals.ts`: 입력 준비 상태 평가, 조건 검증·CRUD·저장 보호.
- `src/components/CsatGoalConditions.tsx`: 목표 편집/목록/확인과 공통 `CsatGoalEvaluationView`.
- `src/components/CsatGrade.tsx`: 목표 목록 연결, 기존 일회성 결과·hero 3합·공유 3합의 공통 평가 사용.
- `scripts/check-csat-goals.ts`: 목표 도메인 검사. 선택 문자열을 인수로 주면 해당 이름의 그룹만 실행한다.
- `scripts/check-csat-grade-context.ts`: 기존 SSR/공유 검사에 최신 번역 조각을 함께 반영.
- `translations-csat-goals.json`: ko/en `csatGrade.goals`와 hero/share 문구 2키. 원본·생성 메시지·페이지·메뉴는 통합 담당자가 편집한다.

## 검증

- `node scripts/check-csat-goals.ts`: **24그룹 PASS**. 누락 입력 32조합 × 영역 수 2·3·4, 기존 합계 일치, 0/빈칸, 탐구 1·2과목과 중복/충돌, 부분 입력, 실제 사용 영역, 조건 경계, 6개 한도·수정·삭제, strict schema·UTF-8 크기·CAS/quota/readback을 확인했다.
- root 검토의 추가 경계인 `inq1='english'` / `inq2='korLm'`를 거부하도록 탐구 allowlist를 보완했다. `node scripts/check-csat-goals.ts 'invalid scores'`: 대상 **1그룹 PASS**. 부모 URL/점수 저장 parser가 이미 막는 경계지만 순수 평가 API도 같은 계약으로 제한했다.
- `node scripts/check-csat-grade-context.ts`: 실제 React SSR·공유 props·학년도/추정·원래 CUTS 해시·KST·hydration·빈 공유값 **14그룹 PASS**.
- `node scripts/check-csat-grade.ts`: 기존 계산 회귀 PASS.
- 범위 lint: 부모/새 자식/새 유틸/새 도메인 검사 4파일 **exit 0**. 마지막 allowlist 변경 후 유틸·도메인 검사·기존 context 검사 3파일도 **exit 0**.
- 독립 브라우저 `batch5_verify`: **17A 6/6 PASS, JS/hydration 오류 0**. 빈 입력부터 부분 2·3·4영역, 탐구 중복/충돌, 실제 0과 잘못된 URL 점수, 기존 최소합·usedAreas 일치, CRUD·6개/40자·320px, 점수 기록/URL 보존, quota/readback·실제 두 탭·취소·점수 변경 stale 작업을 확인했다.
- 독립 `writing_versions`: **17A 15그룹 PASS**(도메인 4·탐구 allowlist 경계 1·실제 자식 6·부모/공통 view ko/en 4). CRUD 확인, 입력 변경/취소/unmount/늦은 작업과 저장 오류·두 reader, 일회성·저장 목표·hero/share 일치, 16차 기록 복원과 목표 URL 제외를 확인했고 추가 수정 요청은 없었다.

전체 타입 검사 결과는 통합 보고서에 별도로 기록한다. 작성자는 Chrome·전체 tsc·빌드·배포·커밋을 실행하지 않았다. 기존 등급 평균 계산은 이번 범위 밖으로 유지했으며, 새 목표 결과가 공식 성적 또는 대학별 수능최저 판단을 대체하지 않는다.
