# 16차 A — 수능 점수 기록·원점수 비교

2026-11-17. 담당 `gpa_scenarios`. 최종 제품 변경 시각 **00:38 KST**. 기존 `/csat-grade/` 안에 이름 있는 입력 기록을 추가했으며, 15차의 시험/참고 학년도·추정 안내와 공유 URL hydration 보호를 유지한다.

## 동작

- 현재 6개 원점수 입력과 국어·수학·탐구 선택과목, 시험 학년도·상대평가 참고 학년도를 이름을 붙여 저장한다. 이름은 앞뒤 공백을 제거한 1~40자, 기록은 최대 12개다. 저장·불러오기·삭제는 각각 별도 확인을 거친다.
- 기록을 선택하면 현재 입력과 나란히 원점수만 비교한다. 같은 입력 영역의 선택과목이 같고 두 값이 유효하며 비어 있지 않을 때만 `현재 - 저장` 차이를 계산한다. 탐구 1·2를 자동 맞바꾸거나 합치지 않는다.
- 미입력 문자열과 실제 `0`, `090` 같은 원래 문자열을 구분해 보관한다. 잘못된 점수는 정규화하거나 잘라 저장하지 않고 오류를 안내한다. 비교에서도 빈값·다른 선택과목·유효하지 않은 입력의 차이를 만들지 않는다.
- 기록 선택은 현재 입력을 바꾸지 않는다. 명시적으로 불러오기를 확인하면 점수와 선택과목만 교체한다. `minN`·`minSum`과 현재 계산기의 시험/참고 연도는 유지한다. 다른 연도의 기록을 불러온 뒤에는 현재 참고 자료로 등급이 다시 계산됨을 알린다. 당시 등급을 저장하거나 복원한 것처럼 표시하지 않는다.
- 공유 URL을 먼저 한 번 복원하고 기록은 자동 적용하지 않는다. 공유에서 복원한 입력을 기록으로 교체할 때 확인 문구를 표시한다.
- 빈 기록 복원 후 공유 링크에서 0점으로 바뀌던 기존 경계를 함께 보완했다. `?kor=`는 빈칸, `kor` 파라미터 미존재는 기본 입력, `?kor=0`은 실제 0점이다. 구형 `?subject=english&score=`도 빈칸을 보존한다. 다른 query/hash와 `history.state`는 유지한다.
- 16px 입력·선택, 44px 버튼, 320px에서 한 열로 쌓이는 비교 카드를 사용한다. 모든 새 문구는 ko/en 번역 조각을 통해 제공한다.

## API·저장 계약

저장소 key와 Web Lock 이름: `toolhub-csat-score-records-v1`.

```ts
{
  version: 1,
  revision: string,
  records: [{
    id: string,
    name: string,
    createdAt: string,
    snapshot: {
      examYear: number,
      referenceYear: number,
      scores: { kor: string, math: string, eng: string, hist: string, inq1: string, inq2: string },
      selection: { kor: 'lm' | 'hj', math: 'prob' | 'calc' | 'geo', inq1: string, inq2: string }
    }
  }]
}
```

- 목록·기록·snapshot·점수·선택 객체의 필드를 정확히 검사한다. 알 수 없는 필드를 조용히 버리지 않는다. 전체 목록의 한 항목이라도 잘못되면 쓰기를 막는다.
- ID/revision은 영문·숫자·`_`·`-` 1~80자이며 ID 중복을 거부한다. 이름 중복은 별도 기록으로 허용한다. `createdAt`은 유효한 정규 UTC ISO 문자열이다.
- 연도는 네 자리 정수(1000~9999)로 검증한다. 이 범위가 실제 해당 연도 시험·자료의 존재를 보증하지는 않는다. 연도는 저장 당시 기준을 표시하는 메타데이터다.
- 점수는 `''` 또는 1~3자리 숫자 문자열이며 국어·수학·영어 0~100, 한국사·탐구 0~50 범위를 적용한다. 선택과목은 현재 지원하는 국어 2개·수학 3개·탐구 17개만 허용한다.
- 전체 raw 문자열은 **64KiB UTF-8** 상한을 적용한다. 최대 정상 12개 기록은 이 상한 안에서 왕복한다. 저장소 손상·미지원 버전·용량 초과 시 원래 raw를 지우거나 덮어쓰지 않는다.
- 읽기 API: `parseCsatScoreRecords`, `readCsatScoreRecords`. 변경 API: `appendCsatScoreRecord`, `removeCsatScoreRecord`, `writeCsatScoreRecords`, `withCsatScoreRecordsLock`. 비교: `compareCsatScoreSnapshots`. 대기 작업 보호: `createCsatScoreActionGuard`.

## 실패·동시성 보호

쓰기 직전 예상 raw와 실제 값을 대조하고, 쓰기 후 같은 raw가 읽히는지 확인한다. 읽기 실패·할당량 초과·다른 탭 변경에서는 성공을 표시하지 않는다. 쓰기 후 읽기 실패 또는 값 불일치는 별도 `unverified` 상태로 **이미 반영됐을 수 있고 rollback을 보장하지 않음**을 알리며 명시적인 목록 재조회를 요구한다.

지원 브라우저에서는 Web Locks로 같은 도구의 쓰기를 직렬화한다. 미지원 브라우저에서도 raw 비교와 readback은 수행하지만 localStorage 자체에 원자적 CAS가 없으므로 완전히 동시인 여러 탭 쓰기를 보장할 수 없다. 브라우저 계정·서버·동기화 서비스는 추가하지 않았다.

현재 입력/준비 상태 변경, 취소, 목록 재조회, storage 이벤트, 새 확인 또는 unmount 시 이전 작업 세대를 무효화한다. 잠금 대기 중에도 취소할 수 있다. 이전 작업이 나중에 잠금을 얻어도 저장·불러오기를 실행하지 않으며 최신 확인 상태를 지우지 않는다. 다른 탭 변경은 자동으로 목록을 갈아 끼우지 않고 재조회 안내를 표시한다.

## 파일·검증

- 제품: `src/utils/csatScoreRecords.ts`, `src/components/CsatScoreRecords.tsx`, `src/components/CsatGrade.tsx` 최소 연결.
- 번역: `translations-csat-records.json`의 ko/en `csatGrade.records` 하위 조각. 원본·생성본·메타데이터는 공용 통합 담당자가 병합했다.
- `node scripts/check-csat-score-records.ts`: **35그룹 PASS**. 정확한 스키마/범위, 원본 문자열, 12개 한도, UTF-8 크기, 비교, quota/CAS/readback 불확실성, 세대 가드·잠금 대기 검증.
- `node scripts/check-csat-grade.ts`: 기존 계산 회귀 PASS.
- `node scripts/check-csat-grade-context.ts`: **14그룹 PASS**. 15차 기준·공유 데이터·수치 해시·KST·hydration 첫 렌더를 유지하며 명시 빈 query/기본값/0/구형 빈 query를 추가 검증했다. 이 검사는 점수 기록 자식 UI를 stub 처리하고 기존 계산 화면의 범위만 확인한다.
- 범위 lint: `CsatGrade.tsx`, `CsatScoreRecords.tsx`, `csatScoreRecords.ts`, `check-csat-score-records.ts`, `check-csat-grade-context.ts` **exit 0**. 마지막 빈 URL 보완 후 부모·관련 검사 파일 lint도 exit 0.
- 독립 `writing_versions`: 도메인 6그룹·실제 자식 9그룹·부모 4그룹·빈 URL 추가 2그룹, 수능 기록 합계 **21그룹 PASS** 수신. 선택과목 593조합, 64KiB 경계, 상태 변경/취소/늦은 잠금, URL 우선, 기준 연도 및 minN/minSum 보존을 확인했다. 마지막 빈 URL 왕복 보완에서 `''`/`0`/`00`, 없는 파라미터, 구형 쿼리와 기타 query/hash 보존도 확인했다.
- 독립 `batch5_verify`: 수능 기록 **6/6 PASS, JS/hydration 오류 0**. 빈칸 기록 복원→실제 링크 복사→새 탭의 빈값 유지, 명시 0/빈 query/구형 빈 query/없는 파라미터 기본값, 선택과목·연도 차이, quota·접근 실패·readback 불확실성, 실제 두 탭·늦은 작업 취소를 확인했다. 증거는 `browser/final-results.json`과 `review-browser.md`에 기록한다.
- 실제 브라우저는 `batch5_verify`, 전체 타입 검사는 `batch5_integrate` 전담으로 결과를 별도 기록한다. 작성자는 Chrome·전체 tsc·빌드·배포·커밋을 실행하지 않았다.

## 남은 범위

이 기능은 원점수 기록·비교이며 시험 난이도 보정·성적 향상 판단·합격 가능성·학교별 예측을 추가하지 않았다. 기존 등급 계산이 미입력을 0점으로 취급하는 부분은 기록과 비교에 사용하지 않는다. 조건별 수능최저의 미입력·탐구 중복 처리 개선은 root가 별도 17차 계약으로 분리했다.
