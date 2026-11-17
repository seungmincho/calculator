# CSV 성능 후속 계획

현재 상태:27차 체크포인트 뒤 승인된 부모 연결과 자체 검사를 완료했다. 최신 구현/선택자/검증은 [후속 구현 보고서](performance/csv-performance-implementation.md)에 기록한다. 아래의 ‘미연결’ 표기는 계획·준비 시점의 이력이다.

2026-11-17 KST. 26차 기능14/browser·전체tsc PASS 후 확인한 응답성 문제의 후속이다. **현재 부모·기존 core·공용 번역은 수정하지 않았다.** 이 계획 보고 후 순수 protocol/runner를 미연결로 준비할 수 있으며, 부모 연결은 root 승인 뒤 진행한다. 28차 워터마크 읽기 설계는 보존하고 대기한다.

## 확인한 증거와 측정의 범위

- verifier가 10,000×20=200,000셀,700,069byte 입력에서 변환 요청→확정 textarea 렌더까지2,199ms,16ms timer 최대 gap1,996ms를 확인했다. 다음 편집은133ms였다.
- 1,000×200 wide 입력은 이미 표 보기 상태에서 변환+5,000셀 렌더까지932ms, 최대 gap713ms였다.
- 위 값은 순수 parser 시간만이 아니다. 현재 `convert()`의 setTimeout0은 한 번 실행을 미룰 뿐 `convertJsonCsv` 전체가 main에서 실행된다. 확정 text·rows의 React 렌더/DOM 값 설정도 합산돼 있다. Worker만 옮기면 모든 지연이 사라진다고 단정하지 않는다.
- 기존 한도(입력2MiB,10,000행/200열/200,000셀,깊이20,중간/출력8MiB)는 줄이지 않는다. 표 한 페이지 표시 셀 수는 전체 처리 한도와 별개의 UI 정책이다.

## 재사용한 코드 조사

`src/lib/diff/{client,protocol,lineDiff.worker}.ts`는 정적 `new Worker(new URL('./…worker.ts', import.meta.url), {type:'module'})`, 요청 id, 성공/실패 plain payload, 취소/완료/error/messageerror/timeout의 terminate, main 동기 fallback 금지를 이미 사용한다. `src/lib/qr/client.ts`는 ArrayBuffer transfer list와 AbortSignal을 사용한다. 이 패턴을 CSV에 작은 전용 모듈로 적용하고 기존 Diff/QR 호출부는 바꾸지 않는다.

유일한 parser/serializer는 `src/utils/jsonCsv.ts`의 `convertJsonCsv` 그대로다. UTF-8/EUC-KR fatal decode와BOM 처리는 `readJsonCsvFile`을 worker에서도 호출해 재사용한다. 두 번째 CSV parser나 JSON parser, 수치/한도 정책 변경은 없다.

## 제안 구조와 API

신규 미연결 파일:

- `src/lib/jsonCsv/protocol.ts`: 버전1의 convert/decode 요청·응답과 plain 오류/shape 검증.
- `src/lib/jsonCsv/jsonCsv.worker.ts`: 같은 core와 같은 파일 decoder 실행. worker 내부 처리ms만 별도 반환.
- `src/lib/jsonCsv/client.ts`: injectable Worker port, `convert(input, mode, options)`, `decode(bytes, encoding)`, `cancel()`, `dispose()`; 최신 작업 하나만 유지. 요청마다 worker를 생성하고 완료/취소 시 terminate한다.
- `scripts/check-json-csv-worker.ts`: 실제 worker 모듈과 client 경계 검사. 기존 도메인 검사는 유지한다.

요청은 `{version:1,id,kind:'convert',input,mode,options}` 또는 `{version:1,id,kind:'decode',bytes,encoding}`다. decode의 ArrayBuffer는 transfer list로 전달해 main 복제 비용을 피한다. 원본 File은 부모가 유지하므로 실패 때 현재 원문을 바꾸지 않고 명시 재선택/재시도가 가능하다.

변환 성공은 `{version,id,kind:'convert',ok:true,result,computeMs}`다. `result`는 기존의 text/headers/rows/format/MIME/filename/stats 묶음 그대로이며 이를 한 번의 structured clone으로 받는다. main에서 결과를 JSON.parse하거나 별도 parser로 재구성하지 않는다. 결과를 worker에만 보관하고 페이지마다 비동기 조회하는 새로운 상태 아키텍처는 우선 도입하지 않는다. 먼저 전체 전달 비용을 측정한다.

decode 성공은 같은 envelope의 `text`와 computeMs다. 실패는 도메인 `{scope:'conversion',code,position}` 또는 `{scope:'file',code}`를 plain data로 직렬화한다. main은 필요한 `JsonCsvError`를 재구성하므로 기존 행/열/physical-line 오류 UI를 유지한다. Worker 장애는 unsupported/workerFailed/invalidResponse/timeout/canceled로 별도 식별하며 원문·이전 결과를 보존한다.

## 취소·오류·snapshot 계약

1. main에서는 UTF-16 length 또는 byteLength/file.size만으로 명백한 과대 요청을 전송 전에 거부한다. 실제 UTF-8 계산/파싱/flatten/직렬화는 worker에서 기존 한도를 다시 확인한다. `options`는 호출 순간 복사한다.
2. 새 요청은 이전 worker를 terminate하고 이전 Promise를 canceled로 정확히 한 번 종료한다. id+active object 확인으로 이미 큐에 들어온 이전 message/error callback도 무시한다. worker cancel 메시지가 긴 동기 변환에 도달할 때까지 기다리지 않는다.
3. default30초 timeout은 영구 대기 방지다. timeout/error/messageerror/postMessage/생성 실패는 실패 상태로 끝내며 같은 대형 처리를 main에 동기 재실행하지 않는다. 사용자가 원문을 편집하고 다시 시도할 수 있다. 모든 exit에서 timer/handler/worker를 정리한다.
4. 부모의 기존 operation/revision/alive와 read/copy guard를 유지한다. 입력/모드/옵션/인코딩 변경, native file cancel, 새 파일, 언마운트에서 client.cancel을 추가한다. 현재 부모가 이미 무효화한 요청은 새로운 Worker 실패 UI까지 덮어쓸 수 없다.
5. 파일의 비동기 FileReader와 abort는 main에 유지한다. 메타2MiB 선확인→FileReader ArrayBuffer→현재 요청인지 검사→worker.decode로 보낸다. 실제 decode/UTF-8 size 검사는 off-main이다. 생성되지도 않은 파일읽기 오류를 worker 실패와 혼동하지 않는다. Worker 미지원 시 새 업로드도 실패로 안내하고 원문은 보존한다.
6. confirmed에는 응답한 같은 result+capturedRevision만 넣는다. 실패/취소는 이전 confirmed를 바꾸지 않는다. 기존 dirty/locked, 전체 복사·download·readOnly 수동 복구는 confirmed.text를 계속 사용한다. 편집은 복사 세대도 무효화해 늦은 fallback/성공을 막는다.
7. 첫 SSR/초기2행 번역 예제만 기존 core로 동기 생성한다. 사용자 입력의 크기별 동기 fallback을 두지 않는다. locale 변경/접기에서 입력·확정 결과를 재생성하지 않는다. Worker 실행 자체는 브라우저 사용자 동작에서만 시작한다.

## main 렌더 보완 제안

- 현재 body 최대5,000셀을 **한 페이지 최대1,000셀**로 조정한다. 전체행/열/파일 한도와 결과는 그대로다. 20열이면 최대50행,200열이면 최대5행이고 기존 pageLimit 문구로 실제 표시 수를 알린다. 사용자가 모든 페이지/긴 셀을 확인할 수 있어야 한다.
- 표 body를 `React.memo` 자식으로 분리해 확정 rows/headers·page·표시수·locale·안정 onExpand가 바뀔 때만 그린다. 입력 keystroke/copy 상태만 바뀌어도 같은1,000셀을 다시 만들지 않게 한다. t 함수와 onExpand의 안정성은 실제 locale 전환 검사로 확인한다.
- root가 결과 전체약3.48MB textarea의 wrapping/layout·행수도 의심 원인으로 지적했다. **결과 text view는50,000 UTF-16 단위 구간의 명시 페이지 preview**를 제안한다. 현재 범위/전체 길이/전체 결과는 복사·파일에 포함됨을 표시한다. 경계는 surrogate pair/CRLF 중간을 피하고 인접 페이지를 합치면 원문 전체와 정확히 같다. 변환 결과 자체·복사·download는 여전히 전체 result.text이고 부분 미리보기를 전체인 것처럼 표시하지 않는다. 별도 저장소나 두 번째 파서는 쓰지 않는다.
- 결과 view 영역을 memo화해 입력 keystroke/copy 상태만으로 같은 preview를 다시 렌더하지 않는다. textarea는 wrap=off로 긴 줄 줄바꿈 layout을 줄이고 수평 스크롤을 제공한다. 표/미리보기 페이지 변경은 확정 데이터 내용을 바꾸지 않는다.
- 입력2MiB textarea와 복사 실패 때의 **전체 수동복구 textarea**는 별도 측정한다. 수동 대안에는 전체 값이 있어야 하므로 출력 미리보기만 잘라 복구에 넣지 않는다. 복구 textarea의 wrap=off/memo를 먼저 적용하고 명시 전체 선택·재시도 동작 및 지연을 기록한다. 측정 뒤 추가 조치가 필요하면 부모 구현 범위를 root와 다시 조율한다.
- Worker 응답 검증은 크기·행/열·셀 primitive/카운터·형식의 bounded 검사다. main에서 UTF-8 재인코딩/전체 문자열 결합/JSON.parse를 반복하지 않는다. 검증 시간도 분리 측정해 새 long task를 만들면 해당 검사를 나눠 처리할지 판단한다.

## 단계별 성능 측정과 수용 확인

동일한 두200,000셀 fixture와 같은 desktop browser 조건을 사용하고, cold worker startup과 warm 재요청을 구분한다. 측정만을 위해 별도 거대한 데이터나 개인정보를 추가하지 않는다.

1. **순수 처리**: worker 안 performance.now 전후 convert/decode `computeMs`. 결과 일부가 아니라 전체 변환 완료 시점을 기록한다.
2. **worker 왕복**: main 요청 직전→응답 수신, 응답 shape 검사 전후를 별도로 기록한다. 왕복−compute는 startup·전달·스케줄링 등이 섞인 값이며 정확한 복사 비용이라고 부르지 않는다.
3. **text 표시**: 요청→응답→setConfirmed→확정 DOM→다음rAF,16ms heartbeat 최대 gap, 다음 입력 이벤트→DOM/다음rAF. 기존 text 모드2,199/1,996ms와 비교한다. 전체textarea와 bounded preview의 차이 및 페이지 전환은 분리 기록한다. 입력2MiB 편집과 수동복구 전체textarea 열기/전체 선택도 별도로 측정한다.
4. **표 표시**: 이미 확정한 결과에서 text→table 클릭→정확한1,000개 이하 td→다음rAF를 별도 측정한다. 같은 결과의 페이지 이동/긴 셀 펼침/새 원문 편집도 측정한다. worker 계산과 표 렌더 지연을 혼합 보고하지 않는다.
5. **자료 보존**: 같은 fixture의 다운로드 전체byte/rows/특수키/문자열/빈셀을 독립 oracle로 확인한다. worker화 후에도 KO/EN·manual copy·UTF-8/EUC-KR·한도와 stale 읽기/변환이 동일해야 한다.

목표는 관측된 약2초 main-thread 정지를 제거하고 입력/취소가 긴 변환 중에도 반응하는 것이다. 특정 ms 이하나 실제 휴대폰 전체 성능은 검증 전 보장하지 않는다. 1,000셀 표시 뒤에도 큰 main gap이 남으면 textarea commit/응답 검증/전달 가운데 측정된 원인에 한해 추가 조치하며 임의로 데이터 한도를 줄이지 않는다.

## 준비·통합 순서

1. 이 계획을 root에 보고하고 protocol/runner/actual worker 순수 검사만 미연결 준비한다.
2. root 승인 후 부모 convert/read 연결+취소 버튼/오류 ko/en fragment+memo/table cap을 최소 연결한다. canonical은 통합 담당만 수정한다.
3. 자체 도메인 의미 회귀와 actual parent Worker race/copy/file 영향 검사·scoped lint, 독립 검토를 진행한다.
4. 단일 Chrome 담당이 위 분리 측정을 포함한 영향 흐름을 검증한다. 모든 writer 안정화 뒤 통합 담당이 전체tsc한다. 이 담당은 Chrome/전체tsc/빌드/배포/커밋을 실행하지 않는다.

## 미연결 준비 체크포인트

root가50,000 UTF-16 구간 preview·1,000 visible cells·전체 snapshot 반출과 Worker 준비를 승인했다. 부모 연결은27차 전체 타입 체크포인트 뒤다. 다음 **신규5파일만** 작성했고 기존 부모/core/actions/canonical에는 변경이 없다.

- `src/lib/jsonCsv/protocol.ts`, `client.ts`, `jsonCsv.worker.ts`
- `src/utils/jsonCsvPreview.ts`
- `scripts/check-json-csv-worker.ts`

`node scripts/check-json-csv-worker.ts` **9그룹 PASS**. 실제 worker 모듈을 VM에 번들해 기존 core/UTF-8·EUC-KR/BOM/위치 오류를 실행했다. client의 options snapshot/ArrayBuffer 실제 transfer detach/convert↔decode 최신 요청/cancel·dispose/late callback/error·timeout·post failure/잘못된 응답/preflight를 확인했다. preview는 모든 구간을 순서대로 합치면 정확한 원문이며 CRLF·emoji 경계와200,000셀 처리 한도 유지도 검사했다.

Node VM의 별도200,000셀 문자열 fixture는 compute225.7ms·bounded 응답검증8.25ms(출력3,980,002bytes)였다. 이는 browser와 같은 입력/스레드/DOM 환경이 아니므로 성능 개선 증거로 사용하지 않는다. 실제 module Worker 전달·paint·입력/복구 렌더는 부모 연결 뒤 Chrome에서 측정한다.

`npx eslint src/lib/jsonCsv/protocol.ts src/lib/jsonCsv/client.ts src/lib/jsonCsv/jsonCsv.worker.ts src/utils/jsonCsvPreview.ts scripts/check-json-csv-worker.ts` **exit0, 경고0**. 신규 TS 안정화 후 편집을 멈추고 통합 담당에게 알린다. 27차 체크포인트 전 부모 연결·추가 TS 편집은 하지 않는다.

27차 공용 타입 검사에서 미연결 client의 native Worker.postMessage overload와 optional transfer 포트 사이 TS2322가1건 나왔다. 모든 호출은 이미 transfer 배열(변환은`[]`,decode는`[bytes]`)을 전달하므로 `JsonCsvWorkerPort.postMessage`의 transfer를 필수 인자로 바꾸는1줄 타입 수정만 했다. 캐스팅/런타임 변경은 없다. 준비9그룹 영향 재실행 PASS(실제 ArrayBuffer detach 포함), client1파일 scoped lint exit0 후 TS를 다시 고정했다. 공용 타입 재확인은 통합 담당이 수행한다.
