# 43차 순수 계산·반출 준비

2026-11-17 KST. root 소유 신규 `src/utils/unitBatch.ts`와 `scripts/check-unit-batch.ts`를 작성했다. **부모 미연결·화면 기능 미완료**다. writing_versions가 신규 UI/복사 actions·KO/EN fragment를 이어 소유한다.

- 도메인10그룹 PASS, 기존 check-units 회귀 PASS, 신규2파일 ESLint 오류0·경고0. 첫 도메인 검사는1e-9×100의 부동소수 표현을 exact equality로 비교한 fixture 오류로 실패했고, 수치 허용오차와 표시값1e-7을 각각 확인하도록 고친 뒤 통과했다. 제품 산술은 변경하지 않았다.
- 신규 입력 상한은50,000 UTF-16 code units·1,000행이다. 전체 입력이 넘으면 부분 결과를 반환하지 않는다. 마지막 CRLF/LF/CR 한 개는 종결자로 제거하고 추가 빈 행은 보존한다. 빈 원문은0행, LF 하나는 빈1행이다. 탭이 있는 행은 columns 오류이며 숫자를 이어 붙이지 않는다.
- 단일값은 기존 parseInput/convert/formatNum을 사용한다. 쉼표/공백/underscore 제거·Number 문법(0x10 포함)은 기존 의미다. 이는 새 엄격한 십진 파서가 아니다. 원문은 수정하지 않는다. 빈 행·오류 행과 유효 행을 순서 그대로 유지한다.
- source/pair/rows와 각 row는 실행 당시 immutable snapshot이다. CSS 기준과 유효숫자는 이후 입력과 독립이다. 비유한 입력/변환 결과는 별도 오류로 남고, 음수/온도 offset/역수 의미는 기존 엔진과 일치한다.
- preview 상수200행은 UI용이며 serializer는 전체1,000행을 반출한다.8열은 행번호/원문/원단위/결과/목표단위/상태/유효숫자/CSS기준이다. 원문은 스프레드시트 텍스트 접두사로 보호하고 구분자/따옴표/개행을 quote한다. CSV는BOM 포함, TSV는BOM 없음. 생성된 결과 숫자는 숫자형 셀로 유지한다.
- 원문·결과를 URL/localStorage/최근값/서버에 쓰는 코드가 없다. 신규 의존성이나 Worker도 없다. 단일 부모/units/favorites 원본은 수정하지 않았다.

다음: 신규 child/복사 준비·정적 번역/실제 child 검사 후 전체 타입 barrier에서 고정. 부모 연결은37/39/40 체크포인트 다음 신호를 따른다. 실제 브라우저·성능·모바일·화면 접근성·CSV 소비 앱 검증은 아직이다.
