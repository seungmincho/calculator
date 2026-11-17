# CSV 응답성 후속 — 부모 연결

2026-11-17 KST.27차 전체 타입 체크포인트 이후 승인된 CSV 성능 보완을 연결했다. **자체 검사·독립11그룹·브라우저8/8 완료, 제품 TS 고정**이다. 최종 전체 타입 체크포인트는 통합 담당 보고서에서 확인한다. 26차 원래 기능 보고서/증거와 구분한다.

## 실제 변경

- `JsonCsvWorkspace.convert()`의 사용자 입력 변환은 전용 module Worker로 이동했다. 기존 `convertJsonCsv`를 그대로 호출하므로 parser/serializer/숫자/shape/한도 정책은 같다. SSR/초기2행 번역 예제만 main에서 동기 생성한다.
- 파일 메타2MiB 선확인과 비동기 FileReader/abort는 main에 남기고, 읽은 ArrayBuffer를 transfer하여 UTF-8/EUC-KR fatal decode·BOM1회 처리·UTF-8 크기 검사를 Worker에서 수행한다. 같은 `readJsonCsvFile` 구현을 재사용한다. 입력2MiB·출력/중간8MiB·200,000셀 등 데이터 한도를 바꾸지 않았다.
- 요청마다 Worker 하나를 생성하고 완료/취소/새 요청/오류/timeout/언마운트에서 terminate한다. client active/id 검사와 부모 revision/operation/alive·read/copy guard를 함께 유지한다. 실패한 대형 변환을 main에 동기 fallback하지 않는다. 지원 없음/실행 실패/잘못된 응답/timeout은 원문·이전 결과를 보존하고 다시 변환 또는 파일 재선택을 안내한다.
- 작업 중 명시 ‘작업 취소’ 버튼을 제공한다. native file cancel과 새 파일/직접 편집/모드·옵션·인코딩 변경도 오래된 read/Worker를 무효화한다. abort가 효과 없거나 종료한 Worker의 callback을 강제로 재실행해도 새 입력/결과가 덮이지 않는다.
- 결과 text view는50,000 UTF-16 단위의 명시 구간이다. 범위와 전체 길이, 전체 복사/다운로드라는 점을 표시하고 처음/이전/다음/끝 페이지를 제공한다. surrogate pair/CRLF 경계만 앞당기므로 한 구간이 최대50,001단위일 수 있고, 모든 구간을 연결하면 정확한 전체 result.text다. 페이지 key를 바꾸어 이전 textarea selection이 다음 구간에 남지 않게 한다.
- 표는 한 페이지 body 최대1,000셀이다(20열이면50행,200열이면5행). 기존 표시 수 안내와 전체 페이지 접근은 유지한다. 페이지/view 변경은 펼친 셀을 닫는다. 긴 셀은 원래 전체 내용을 readOnly로 열 수 있다.
- text/table JSX subtree를 useMemo로 유지해 입력·복사 상태만 변경될 때 동일한 결과 표를 다시 조정하지 않는다. 실제 안정적인 t가 locale에서 바뀌면 새 라벨을 표시한다. 긴 textarea는 wrap=off로 수평 스크롤하며 input/expanded/manual 값 자체를 자르지 않는다.
- **copy/download/manual recovery는 구간 preview가 아니라 전체 confirmed.result.text**를 쓴다. 버튼도 ‘전체 결과’라고 표시한다. 자동 복사 실패 때만 전체 readOnly 수동 복구 필드를 DOM에 올리고 선택/명시 재시도를 제공한다. 큰 전체 복구의 표시·선택에는 시간이 들 수 있음을 그 실패 경로에서 안내한다.
- 화면 처리 시간은 Worker 내부 computeMs이며 startup/전달/main 렌더를 포함한다고 표시하지 않는다. 초기 예제는 측정 전으로 표시한다. 실제 전체 성능 수치는 전담 browser의 [분리 측정](review-browser.md)에 기록했다.

## 파일과 선택자

제품: `src/components/JsonCsvWorkspace.tsx`, `src/lib/jsonCsv/{protocol,client,jsonCsv.worker}.ts`, `src/utils/jsonCsvPreview.ts`. 기존 `JsonCsvConverter.tsx` wrapper/core/actions 정책은 보존했다. Worker 포트 transfer 인자의 타입 보완은27차 타입 체크포인트에서 이미 통과했다.

검사: `scripts/check-json-csv-worker.ts`, 이 폴더의 `check-json-csv-performance-component.cjs`. 번역: `translations-json-csv-performance.json`의 ko/en **16leaf**. 기존26조각98leaf의 값은 변경하지 않았다. canonical/생성물은 통합 담당이 병합했다.

- 작업: `[data-json-csv-cancel]`, `[data-json-csv-job="processing|reading"]`, `[data-json-csv-canceled]`.
- text preview: `#json-csv-output[data-json-csv-preview-start][data-json-csv-preview-end][data-json-csv-preview-total]`, `[data-json-csv-text-page="first|previous|next|last"]`, `[data-json-csv-text-page-index]`, `[data-json-csv-preview-range]`. start는0-based offset, end는exclusive, UI는1-based 시작을 표시한다.
- timing: `[data-json-csv-compute-ms]`는 실제 Worker 결과에만 있고 초기 예제에는 없다.
- 기존 input/file/options/table/cell/copy/download/manual selectors는 그대로다. 표가1000셀로 바뀌어200열 다음 페이지 시작 index는25→5다.

## 자체 검증

1. `node scripts/check-json-csv-worker.ts` — **9그룹 PASS**. 실제 worker 모듈을 VM에서 실행해 같은 core·UTF-8/EUC-KR·도메인 오류/위치, structuredClone transfer의 실제 ArrayBuffer detach, 취소/교체/dispose/late callback·장애/timeout·preflight·preview emoji/CRLF/all-pages·200,000셀 전체 응답을 확인했다. 준비 이후 core/worker 정책은 변경하지 않았다.
2. `node docs/verify/2026-11-17-repeat-batch26/performance/check-json-csv-performance-component.cjs` — **13그룹 PASS**. 기존26 부모9흐름을 실제 client+실제 worker VM 경로로 대조하고 새4그룹에서 conversion cancel/edit-roundtrip/options/mode/replacement/unmount, transfer 후 decode의 편집/encoding/mode/native cancel/newfile/unmount, unsupported/error/messageerror/invalidResponse/파일 읽기 실패와 재시도, 모든 preview 구간·전체 copy/download/manual 선택·memo·2MiB input 보존을 확인했다. 기존9와 새13을 합산하지 않는다.
3. `npx eslint src/components/JsonCsvWorkspace.tsx src/lib/jsonCsv/protocol.ts src/lib/jsonCsv/client.ts src/lib/jsonCsv/jsonCsv.worker.ts src/utils/jsonCsvPreview.ts scripts/check-json-csv-worker.ts docs/verify/2026-11-17-repeat-batch26/performance/check-json-csv-performance-component.cjs` — **7파일 exit0, 경고0**. 이후 예제 시간 표시 보완의 parent1파일 lint도 exit0 확인했다.
4. ko/en16leaf 조각은 통합 담당이 canonical 병합·등록 정적 대조까지 확인했다. 새로운 namespace나 라이브러리는 추가하지 않았다.

검사에서는 실제 TSX/helper를 사용하고 hook/DOM/FileReader/Worker 전달 포트를 제어한다. 실제 module Worker의 browser thread·네트워크 로딩·textarea layout·native selection/Clipboard 속도를 VM 결과로 보장하지 않는다.

## 독립/브라우저 결과와 한계

verifier의 독립 Worker8·실제 부모3그룹과 실제 Chrome8/8이 통과했고 제품 결함 요청은 없었다. 기존700,069byte/200,000셀 fixture의 결과3,480,002byte가 SHA-256까지 동일한 상태에서 변환+기본 preview의 heartbeat 최대 간격은1,996→36.2ms로 줄었다. Worker210.8ms, 요청→응답240.4ms, 응답 callback 검증+settlement3.2ms, callback→확정 프레임26.3ms로 분리했다. 이는 Windows Chrome 개발 서버의 단일 합성 관찰값이며 모바일 실기기/배포 성능을 보장하지 않는다.

1,000셀 표 표시의 최대 간격132ms·표 유지 원문 편집25.2ms/mutation0, 약2MiB 입력 붙여넣기412.8ms·단일 셀 변환+preview294.9ms·명시 실패 후 전체 수동 복구 표시480.4ms의 지연은 남아 있다. 전체 수동 선택과 native 재시도는 전체 내용으로 확인했다. 기본 변환 개선과 큰 controlled 입력/실패 복구 한계를 구분하며, 자세한 계측 경계와 fixture 수정 이력은 [브라우저 보고서](review-browser.md)에 있다.

독립/브라우저 결함 대응을 우선한다. 모든 writer 고정·Chrome 종료 뒤 전체 타입 검사는 통합 담당이 수행한다. 이 담당은 Chrome/전체tsc/빌드/배포/커밋을 실행하지 않았다.28/31 읽기 설계는 이 후속 완료 뒤 재배정을 기다린다.
