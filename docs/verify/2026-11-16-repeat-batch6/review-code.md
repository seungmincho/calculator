# 6차 독립 코드 검토

검토일: 2026-11-16. 제품 코드는 변경하지 않고 구현 담당과 별도로 순수 함수 검사와 호출 경로를 확인한다. 브라우저 검증은 별도 담당이 수행한다.

## 검토 범위

- 숫자 일괄 변환: 문자열 정밀도, 원본 줄 번호, 빈줄·오류·한도, 계약서용 비지원 값, TSV/CSV 내보내기.
- 글꼴 조합: 허용된 ID·지원 굵기, 크기 범위, 공유 URL 왕복, CSS·실제 선택 일치, 제목·본문·기존 카드 간 CSS 로딩 충돌.
- 기존 단일 숫자 변환과 글꼴 즐겨찾기·고정 비교를 변경한 부분의 회귀.

## 결론

검토에서 확인한 100행 종료 개행·글꼴 스타일시트 소유권·실제 글꼴 파일 실패 안내의 세 문제는 모두 수정됐다. 독립 코드·도메인 검사와 브라우저 담당의 재검증 결과에서 재현 가능한 미해결 결함은 없다. 제품 코드는 검토자가 수정하지 않았다.

## 확인한 문제와 조치

### 1. 100행 붙여넣기의 마지막 개행을 101번째 행으로 처리 — 해결

- 최초 재현: `Array(100).fill('1000').join('\n') + '\n'` 또는 끝에 CRLF를 붙이면 `totalLines: 101`, `validRows: 0`, `limit: 'tooManyLines'`가 됐다. 스프레드시트에서 붙여넣은 정상 100행 전체가 거부됐다.
- 수정 위치: `src/utils/numberToKoreanBatch.ts:36`. 마지막 줄 구분자 한 개만 제거한다. 내부 빈줄과 추가 빈줄은 그대로 세고 원본 줄 번호를 유지한다.
- 재검증: 개행 없음·LF·CRLF 각각 100행이 모두 변환되고 제한 오류가 없음을 독립 검사했다. 구현 담당의 회귀 검사에는 CR도 포함돼 있다.

### 2. 폰트 조합과 기존 카드의 동일 CSS URL 소유권 충돌 — 해결

- 호출 경로: 조합이 CSS 링크를 먼저 만들면 기존 `ensureCss`의 문서 전체 URL 중복 검사 때문에 카탈로그는 자기 링크를 만들지 않았다. 이후 조합의 텍스트 변경으로 이전 링크가 정리되면 카탈로그의 CSS도 사라질 수 있었다.
- 수정 위치: `src/components/FontPreview.tsx:26`의 중복 검사 범위를 `[data-fp]`로 제한한다. `src/components/FontPairPreview.tsx:65`는 `[data-fp-pair]` 링크를 독립 생성·정리한다.
- 같은 조합 안에서 제목과 본문이 같은 글꼴을 쓰는 경우 `src/utils/fontPairing.ts:78`은 두 역할의 문자 집합을 합쳐 각 지원 굵기를 요청한다. 기존 카탈로그의 서브셋과 조합 서브셋은 독립적이다.
- 이 항목은 링크 생성·정리 호출 경로를 코드로 확인했다. 실제 원격 폰트 요청과 화면 표시 검증은 브라우저 담당의 결과를 따른다.

### 3. CSS 성공 후 실제 글꼴 파일이 실패하면 오류 안내가 없음 — 해결

- 별도 브라우저 담당이 `font-css-success-font-binary-failure-notice` 사례로 실제 재현했다. Noto Serif KR·Nanum Gothic CSS 응답은 모두 200으로 두고 해당 WOFF 요청만 중단했다.
- `document.fonts`에 `status: 'error'`인 선택 글꼴이 생겼지만 15초 뒤에도 실패 안내가 없었다. `src/components/FontPairPreview.tsx`가 CSS `link.onload`만으로 `ready`를 설정하는 경로와 일치한다.
- 최초 증거: `scripts/check-repeat-batch6-browser.mjs`의 `font-css` 사례, `browser/results-font-invalidfont-twofont-css.json`.
- 수정 후에는 CSS 전체 로드 뒤 선택한 family·실제 적용 굵기·문자에 해당하는 `document.fonts.load` 결과를 확인한다. 빈 결과를 성공으로 취급하지 않으며, 모든 결과가 `loaded`여야 준비 완료가 된다. API 미지원·15초 초과를 별도 안내하고, `active`·`settled`와 cleanup으로 이전 요청의 완료가 현재 상태를 덮어쓰지 못하게 한다.
- 브라우저 담당 재검증: 같은 CSS 200·WOFF 중단 조건에서 `document.fonts` 오류와 실패 안내를 함께 확인했다. 실제 두 글꼴의 CSS·WOFF 200 및 `FontFace.status: loaded` 정상 경로도 통과했다. API 미지원·15초 제한·빠른 재선택 복구는 별도 모의 API 사례에서 통과했다.
- 재검증 증거: `browser/results-font.json`의 `font-css-success-font-binary-failure-notice`, `font-two-real-webfonts-load`, `font-api-unavailable-timeout-and-recovery` 및 `browser/font-network.json`.

## 마지막 상태 보존 검토

조합 패널을 접을 때 자식이 unmount되는 최종 구조를 추가 확인했다. `FontPreview`의 `pairDraft`는 부모에 남고, 모든 입력 변경·글꼴 교환이 같은 `next` 객체를 자식 상태와 부모 draft에 전달한다. 다시 열면 `savedState`로 초기화하고 URL 복원을 건너뛴다. 최초 URL 복원만 수행하는 마이크로태스크에는 cleanup의 `active` 검사가 있어 이미 닫힌 패널이 뒤늦게 부모 draft를 덮어쓰지 않는다. 자식의 객체 갱신은 기존 객체를 변경하지 않으며 부모 callback은 안정적인 `setPairDraft`이므로 복원 effect의 반복 실행 경로도 없다. 이 코드 경로에서 stale state에 의한 입력 덮어쓰기 문제를 찾지 못했다. 접기·재열기 실제 클릭 검증은 브라우저 담당의 최종 추가 assertion을 따른다.

## 독립 검사

새 테스트 파일을 제품 영역에 추가하지 않고 `node --input-type=module`로 모듈을 직접 불러 독립 assertion을 실행했다.

### 숫자 일괄 변환 — 34개 통과

- 1~20자리 정수 각각의 정규 문자열을 유지하고 TSV·CSV를 다시 파싱해 정규 숫자와 원본 칸이 그대로 복원됨을 확인했다.
- 항목명·원본·정규 숫자에는 작은따옴표 접두사가 붙는다. 20자리 값의 자동 숫자 변환과 사용자 입력의 수식 실행을 방지하는 텍스트 표현이다.
- 오류 행, `=SUM(1,1)`·`+`·`@`로 시작하는 항목명, 따옴표·쉼표·탭이 든 원본을 포함해 내보내기 열 수 7개와 원본 줄 번호·순서를 확인했다.
- 0·음수·소수에는 읽기 결과가 있고 계약서용 표기는 없다. 일부 오류와 계약서용 비지원 건수가 구분된다.
- 잘못된 쉼표 묶음, 21자리 숫자, 101행, 전체 30,001자 입력을 거부한다.

### 글꼴 조합 — 345개 조합 검사 통과

- 카탈로그 38종 × 요청 굵기 9개(342개)에 대해 공유 URL 왕복, 기존 `f`·`t` 파라미터 보존, 실제 적용 굵기와 CSS 일치, 두 번 교환 시 원상복원을 확인했다.
- 같은 글꼴의 요청마다 제목과 본문의 고유 문자가 모두 들어가는지 확인했다.
- 로컬/알 수 없는 ID, `Infinity`·`NaN`, 크기·굵기 경계값은 기본값 또는 허용 범위로 복구된다.
- HTTP(S)가 아닌 공유 URL과 길이 한도를 넘는 URL은 거부된다.

## 기존·구현 담당 검사 재실행

- `node scripts/check-number-to-korean-batch.ts`: 18개 통과.
- `node scripts/check-number-to-korean.ts`: 기존 검사 전부 통과.
- `node scripts/check-font-preview.ts`: 카탈로그 38종을 포함한 기존 검사 통과.

## 검토 범위의 한계

- 브라우저·전체 타입 검사·빌드·배포는 이 검토에서 실행하지 않았다.
- CSV·TSV의 셀 표현을 파싱해 확인했으며 특정 버전의 Excel이나 Google Sheets 앱에서 직접 붙여넣지는 않았다. 작은따옴표의 화면 표시 방식은 프로그램마다 다를 수 있다.
- 공유 링크의 로컬 업로드 글꼴 제외는 선택 목록·ID 허용 목록·URL 생성 경로에서 확인했다. 파일 자체는 이 경로에 들어가지 않는다.
