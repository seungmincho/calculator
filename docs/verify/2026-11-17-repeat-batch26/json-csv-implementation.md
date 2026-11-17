# 26A JSON/CSV 부모 연결 결과

2026-11-17 KST. 25차 전체 타입 체크포인트 뒤 기존 `/json-csv-converter/`에 연결했다. **부모 연결·자체 검사 완료, 독립/브라우저 검증 인계 단계**다. 새 경로·패키지·서버·저장소를 만들지 않았다.

## 변경과 동작

- `JsonCsvConverter.tsx`의 중복 CSV 파서·변환/미리보기별 별도 상태를 제거하고 `JsonCsvWorkspace.tsx`로 연결했다. `utils/jsonCsv.ts`의 단일 parser/serializer/convert 결과가 텍스트·표·통계·복사·다운로드의 같은 snapshot이다. 기존 병렬 초안(JSON/CSV), 구분자·헤더·평탄화/유지·배열join/separate·프리셋·페이지네이션을 유지한다. separate는 원래 동작대로 별도 **열**이므로 잘못된 기존 행 설명을 고쳤다.
- 인용 안 CRLF/LF/CR, 구분자, 두 겹 큰따옴표, 셀 공백/빈 값, 실제 빈 레코드를 보존한다. malformed quote/폭/헤더 오류는 위치와 함께 표시한다. CSV 기본은 문자열이며 숫자 옵션은 명시된 안전 범위/문법만 허용한다. JSON의 unsafe integer는 문자열 입력을 안내하며 거부한다.
- 모든 행의 키 합집합을 표와 출력에 쓰며 특수 키를 데이터로 처리한다. 중첩 유지의 객체/배열은 JSON 문자열이다. 평탄화 키 충돌은 오류다. 중간 key/value UTF-8 합계8 MiB를 각 추가 전에 검사하며 header=false에도 적용한다. 기본2 MiB/10,000행/200열/200,000셀/깊이20/출력8 MiB 한도를 지킨다.
- UTF-8/EUC-KR은 `FileReader.readAsArrayBuffer` 뒤 fatal TextDecoder로 실제 파일 읽기에 적용한다. 원본/읽은 UTF-8 크기를 각각 확인하고 선두 UTF-8 BOM은 decoder에서 한 번만 제거한다. CSV 출력에만 명시 BOM을 적용하며 JSON은 옵션이 남아 있어도 BOM 없이 JSON.parse 가능하다. 인코딩 변경은 붙여넣은 문자열을 재인코딩하지 않는다.
- 새 파일/직접 편집/모드·옵션·인코딩 변경/취소/언마운트는 이전 읽기 세대를 무효화하고 FileReader abort를 요청한다. abort가 실제 읽기를 멈추지 못해도 오래된 완료는 무시한다. 실패/취소는 현재 원문을 바꾸지 않는다.
- 입력/변환 옵션 변경 시 이전 결과를 명시적으로 stale 표시하고 복사·다운로드를 비활성화한다. 새 변환도 클릭 당시 원문/옵션을 사용하며 예정된 변환 전 편집을 감지한다. locale 전환은 원문·확정 결과·예제 데이터를 재생성하지 않는다. 파일 읽기 인코딩만 바꾸면 기존 입력/변환 결과의 내용은 유효하므로 결과를 stale로 만들지 않고 대기 I/O만 무효화한다.
- 복사는 Clipboard 또는 legacy 실제 true일 때만 성공이다. 실패 시 전체 readOnly 결과/선택/명시 재시도를 제공한다. 늦은 응답은 새 상태를 바꾸거나 fallback을 시작하지 않는다. 다운로드는 결과에 저장된 문자열·MIME·파일명을 사용하고 요청과 실제 저장 완료를 구분한다.
- 첫 화면은 작은 번역 예제의 실제 결과와 MobileResultLink를 제공한다. 표는 5,000셀 이내로 페이지 표시 수를 줄이되 전체 복사/파일은 바꾸지 않는다. 모든 긴 헤더/셀은 눌러 전체 내용을 readOnly textarea로 확인·선택할 수 있다. 입력16px·조작44px·토큰·모바일1열을 적용했다.
- ko/en 조각에서 기존 Web Worker/100MB/수십MB·한글=EUC-KR 단정과 잘못된 별도 행 설명을 실제 범위로 바꿨다. 현재 Worker를 사용한다거나 무제한 대용량을 처리한다고 주장하지 않는다.

## 파일·선택자

제품: `src/components/JsonCsvConverter.tsx`, `JsonCsvWorkspace.tsx`, `src/utils/jsonCsv.ts`, `jsonCsvActions.ts`. 검사: `scripts/check-json-csv.ts`, `check-json-csv-component.cjs`. 번역: `translations-json-csv.json`(ko/en 배열 원소 포함106경로, 공용 집계의 배열=1leaf 기준96키).

입력/모드/옵션: `#json-csv-input`, `#json-csv-file`, `[data-json-csv-mode-button]`, `[data-json-csv-option]`, `[data-json-csv-convert]`. 결과: `#json-csv-result[data-json-csv-result=current|stale]`, `#json-csv-output`, `[data-json-csv-stat=rows|columns|bytes]`, `[data-json-csv-view]`, `[data-json-csv-cell="0-0"]`, `#json-csv-cell-full`, `[data-json-csv-copy]`, `[data-json-csv-download]`, `[data-json-csv-copy-recovery]`, `#json-csv-manual`.

## 자체 검사

1. `node scripts/check-json-csv.ts` — **13그룹 PASS**. 준비12그룹에 CSV전용BOM/JSONunsafeinteger와 중간 키·값 누적8 MiB 경계를 보완했다. 실제 인코딩 byte vector/한도/모든 parser·shape·숫자 정책과 읽기·복사 세대를 포함한다.
2. `node docs/verify/2026-11-17-repeat-batch26/check-json-csv-component.cjs` — **8그룹 PASS**. 실제 부모 KO/EN 예제·locale/접기 보존, CSV 여러줄/문자열·표/확장셀/통계/파일 일치, JSON union/no-header/실제탭/BOM, 오류 원문 보존·stale export 차단, 실제 UTF-8/EUC-KR bytes와 잘못된 파일, 새파일/편집/모드/인코딩/native cancel/unmount의 역순읽기, copy false/retry/late 응답, 예정된 변환 중 편집, 200,000셀 표의5,000셀 페이지·전체 파일을 확인했다.
3. `npx eslint src/components/JsonCsvConverter.tsx src/components/JsonCsvWorkspace.tsx src/utils/jsonCsv.ts src/utils/jsonCsvActions.ts scripts/check-json-csv.ts docs/verify/2026-11-17-repeat-batch26/check-json-csv-component.cjs` — **exit 0, 오류/경고 0**. child cleanup의 ref 경고를 로컬 ref 캡처로 해결한 뒤 전체 소유6파일을 재확인했다.
4. ko/en 조각 경로106개 일치. 통합 담당의 배열 leaf 기준96키 대조와 canonical 병합은 별도 완료했다. 부모에 기존 `parseRow`/줄 split 재파서가 남지 않은 것도 확인했다.

이벤트 검사는 실제 TSX/helper를 번들하고 hooks/DOM/FileReader/Clipboard 포트를 제어했다. 브라우저의 실제 파일 선택·native Clipboard·CSV 다운로드의 독립 parser·모바일320px·큰 입력의 UI 응답성은 전담 브라우저/독립 검사와 구분한다. parser/serializer를 같은 구현으로 재검증한 왕복만으로 CSV 방언 전체 호환을 주장하지 않는다.

## 남은 체크포인트

### 접근성 영향 보완

root의 최종 UI 읽기 검토에 따라 표 헤더는 열 번호와 이름, 셀은 데이터 행·열 번호와 최대80자 값을 accessible name에 포함했다. 빈 셀도 위치로 구분하며 전체 내용 확인은 그대로 유지한다. 파일 업로드의 숨겨진 input이 키보드 초점을 받으면 부모 label에 토큰 focus-within 링이 표시된다. `translations-json-csv.json`에 ko/en `fidelity.expandHeader`·`expandCellAt` 2키를 추가해 공용 leaf는98개가 됐다.

`node docs/verify/2026-11-17-repeat-batch26/check-json-csv-component.cjs A11y` **영향1그룹 PASS**(ko/en, 긴 header/값의80자 라벨, 빈 셀의 서로 다른 위치, 전체 내용 유지). 기존8그룹을 반복하지 않았으며 총 자체 부모9그룹이다. 변경 TSX/검사2파일 scoped lint **exit0**. 독립 검토8그룹 PASS도 별도 보고서에 남아 있으며 이 접근성 변경은 변환/파일/경합 로직을 바꾸지 않는다.

독립 reviewer와 단일 Chrome 검증에 final ready를 전달했다. 발견 대응을 우선하며 제품 TS를 고정한다. 실제 큰 입력 UI 응답성 결과에 따라 필요할 때만 Worker 분리를 검토한다. Chrome 종료·모든 TS writer 고정 후 전체 타입 검사는 통합 담당이 실행한다. 이 담당자는 Chrome/전체 tsc/빌드/배포/커밋을 실행하지 않았다.
