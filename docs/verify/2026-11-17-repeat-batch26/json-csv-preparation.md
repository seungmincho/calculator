# 26A JSON/CSV 순수 준비 체크포인트

2026-11-17 KST 준비 당시 기록이다. 25차 체크포인트 뒤 부모 연결과 확정 정책 보완을 완료했으며 최신 상태는 [json-csv-implementation.md](json-csv-implementation.md)에 있다. canonical 번역/메타/공용 파일은 통합 담당 소유로 유지한다.

## 준비 파일과 API

- `src/utils/jsonCsv.ts`: `parseCsvRecords` 한 곳에서 쉼표/실제 탭/파이프/세미콜론을 처리한다. `serializeCsvRecords`, `csvSafeNumber`, `convertJsonCsv`와 `JsonCsvError(code,position)`를 제공한다.
- `convertJsonCsv(input,mode,options)` → `text/headers/rows/format/mime/filename/stats`를 한 번에 확정한다. 미리보기에서 문자열을 재파싱하지 않는다. no-header 키는 기존 호환상 `column_0`부터 시작한다. 통계의 셀 수는 데이터 행×합집합 열 수다.
- 기본 문자열, 숫자 opt-in, 대소문자 구분 헤더 중복/공백 헤더 오류, 특수 키, 모든 행 키 합집합, flatten 충돌, preserve 객체/배열 JSON, join/separate의 빈 컨테이너 정책을 구현했다.
- `src/utils/jsonCsvActions.ts`: `createJsonCsvActionGuard`의 read/copy 세대, `readJsonCsvFile`의 원본 바이트/디코딩 UTF-8 2 MiB·fatal UTF-8/EUC-KR, 실제 성공만 반환하는 `copyJsonCsvText` 포트를 제공한다. 취소·실패는 문자열을 교체하지 않고 결과 객체로 보고한다.
- `scripts/check-json-csv.ts`: 실행 가능한 12그룹 검사.
- `translations-json-csv.json`: `jsonCsvConverter.fidelity` ko/en 준비 조각. 부모 UI와 기존100MB/성능 안내 수정 시 연결한다. 아직 공용 원본에 병합 요청하지 않았다.

파일 decoder의 UTF-8 BOM 처리만 사용해 선두 BOM을 한 번 제거한다. 두 BOM이면 둘째는 데이터로 남는다. parser 자체는 붙여넣은 원문을 trim하거나 BOM을 제거하지 않는다. 출력은 UTF-8이며 명시 BOM 옵션을 별도로 담는다.

CSV 인용·공백·중복 큰따옴표·마지막 레코드 구분자 정책은 [RFC 4180 §2](https://www.rfc-editor.org/rfc/rfc4180#section-2)를 2026-11-17 직접 확인했다. 실제 탭/파이프/세미콜론 및 LF/CR 레코드 구분자는 이 도구의 확장이다. 모든 CSV 방언을 지원한다고 주장하지 않는다.

## 검사

`node scripts/check-json-csv.ts` — **12그룹 PASS**. 인용 여러 줄·다국어·공백·빈 레코드/셀·인용 오류 위치·헤더·no-header·숫자 문법/범위·특수 키·중첩/배열/충돌·확정 표/바이트 일치·2 MiB/10,000행/200열/200,000셀/깊이20/8 MiB·실제 EUC-KR 바이트·읽기/복사 경합을 포함한다. 긴 CSV 헤더가 행마다 반복되어 JSON 출력이 커지는 경우 전체 출력 할당 전 누적 바이트 상한으로 차단한다.

Node24 strip-only 실행에 맞춰 Error 클래스 parameter property를 명시 필드로 바꿨다. 테스트 JSON의 줄바꿈 이스케이프와 Node EUC-KR decoder가 일부 C1 바이트를 허용하는 fixture를 수정한 뒤 통과했다. 실제 브라우저에서도 선택 인코딩·잘린 멀티바이트 바이트를 별도 검증한다.

`npx eslint src/utils/jsonCsv.ts src/utils/jsonCsvActions.ts scripts/check-json-csv.ts` — **exit 0, 오류/경고 0**. 마지막 수정 뒤 재확인했다. TS 세 파일을 고정한 뒤 25A 독립 검토로 전환했다.

## 남은 작업

1. scoped lint는 완료했다. ko/en 조각은 부모 연결 단계에서 실제 사용 키와 다시 대조한다.
2. 25A actual parent 독립 검토를 우선 수행한다.
3. 26 부모 연결 승인 뒤 복수 기존 파서 제거·확정 결과 표/통계/다운로드 연결·파일읽기 세대/수동 복사 UI·옵션/원문 변경 무효화·모바일 전체 셀 확인·기존100MB 안내 수정.
4. root가 후속 정책을 확정했다. **BOM은 CSV 출력만**, flatten 중간 map key/value UTF-8 합계 **8 MiB 조기 제한**(header=false 포함), JSON unsafe integer 거부다. 부모 연결 시 세 정책과 KO/EN 안내를 반영하고 도메인13그룹으로 통과했다.
5. 실제 브라우저에서 큰 입력 응답성·독립 CSV 재파싱·UTF-8/EUC-KR 다운로드/파일·KO/EN 320px 확인. 필요할 때만 Worker를 검토한다.

Chrome/전체 tsc/빌드/배포/커밋은 실행하지 않았다.
