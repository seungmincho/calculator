# 26A JSON/CSV 독립 검토

2026-11-17 KST. 담당 구현자의 최종 부모 연결과 계약을 읽고, 제품 파일을 수정하지 않은 상태에서 별도 oracle와 실제 부모 이벤트 검사를 수행했다. **8개 독립 그룹 PASS, 재현된 제품 결함 및 추가 수정 요청 없음.**

## 증거

`node docs/verify/2026-11-17-repeat-batch26/check-json-csv-independent.mjs`

- 독립 whole-field 정규 문법 reader와 미리 정한 셀 행렬을 사용했다. 제품의 문자 단위 상태 파서/serializer를 다시 호출한 왕복만을 정답으로 삼지 않는다. 4개 구분자 × 12개 값 × 12개 값 =576개 조합을 CRLF/LF/CR 각각으로 만들어 1,728개 입력의 공백·빈 셀·쉼표/탭/파이프/세미콜론·인용·한국어/이모지·인용 안 줄바꿈을 대조했다. 제품 serializer 출력도 별도 reader로 읽어 원래 행렬과 같음을 확인했다.
- 마지막 레코드 구분자와 실제 빈 레코드, 헤더만 있는0행, no-header, 공백/중복 헤더 오류를 리터럴 기대값으로 확인했다. `__proto__`, `constructor`, `hasOwnProperty`를 일반 키로 유지하며 prototype을 수정하지 않는다. 숫자 opt-in은 식별자/unsafe integer/음의0/비정규 문법을 문자열로 남기고 명시된 정상 숫자만 바꾼다.
- JSON 합집합 열·no-header 첫행·join/separate/중첩 유지·빈 컨테이너·큰 문자열 식별자·충돌 오류를 독립 CSV reader와 대조했다. CSV 출력에만 BOM이 붙고 JSON은 그대로 JSON.parse 가능하다. JSON unsafe integer는 중첩 배열까지 거부한다.
- 입력2MiB보다 작은 긴 공통 경로를 110개 열에 복제하는 fixture가 header=true/false 양쪽에서 중간8MiB 초과로 중단됨을 확인했다. UTF-8 BOM을 한 번만 제거하고 두 번째 BOM/셀 내부 BOM은 보존한다. 실제 EUC-KR 바이트는 한국어로 읽히며 잘못된 UTF-8은 실패다.
- 실제 `JsonCsvConverter`→`JsonCsvWorkspace`의 새 복사/옛 복사 역순 완료, 새 변환 후 옛 성공 안내 차단, Clipboard 실패 readOnly 전체 snapshot, KO→EN 전환의 원문·확정본·수동 복구 보존을 확인했다.
- 복사 대기→파일 읽기, 옵션 변경→옛 읽기 완료, 새 읽기 성공→옛 읽기 실패, native cancel→늦은 성공, 모드 왕복의 초안 보존을 실제 핸들러로 확인했다. I/O abort가 무효인 포트에서도 세대가 최신 입력을 보호한다.
- malformed 여러 줄 원문은 그대로 남고 이전 확정본도 보존된다. stale 복사/다운로드는 UI disabled뿐 아니라 직접 핸들러 호출에서도 반출하지 않는다. 새 no-header 결과의 표 확장 셀과 실제 Blob의 JSON 내용이 일치한다.
- 1,000행×200열=200,000셀을 실제 부모에 입력해 첫/마지막 페이지가 각각5,000셀이고 마지막 값 `999:199`까지 유지됨을 확인했다. 전체 파일은 확정 결과와 byte content가 같으며 모든200,000셀을 원본 행렬과 대조했다. 기기 저장소 추가 기록은 없다.

`npx eslint docs/verify/2026-11-17-repeat-batch26/check-json-csv-independent.mjs` — exit0, 오류/경고0.

## 코드 근거와 한계

`src/utils/jsonCsv.ts`는 하나의 parser와 확정 `text/headers/rows/stats`를 사용한다. 직접 JSON 키 직렬화와 Map 기반 평탄화가 특수 키 덮어쓰기를 피하고, key/value 누적 크기 및 출력 바이트 상한이 각각 적용된다. `src/utils/jsonCsvActions.ts`는 읽기/복사 요청 및 입력 revision을 분리한다. `src/components/JsonCsvWorkspace.tsx`의 cancelPending/operation guard는 새 입력·옵션·모드의 이전 작업을 무효화하고, 표 페이지와 전체 반출이 같은 확정 결과를 사용한다.

검사는 구현자의 fixture에서 **DOM/FileReader/Clipboard 포트만** 재사용하고 검증 로직과 정답은 새로 작성했다. 실제 TSX/helper는 esbuild로 번들해 실행했다. 정규 문법 oracle는 생성한 유효 CSV를 읽는 소형 검증기로, 모든 CSV 방언 지원을 검증했다는 의미가 아니다. browser layout·native clipboard 권한·실제 파일 선택·큰 입력 UI 지연은 전담 브라우저 결과와 구분한다. Chrome·전체 tsc·build는 실행하지 않았다. 제품/공용 파일 변경 없음, 27A 준비 TS도 안정 상태로 유지했다.
