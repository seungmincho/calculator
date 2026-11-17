# 21차 독립 브라우저 검증

2026-11-17 02:17 KST 최종. **13/13 PASS — 텍스트 단계 이력 6개, QR 이미지 7개. JS pageerror·hydration 오류·unhandled rejection 0.** 기존 localhost:3039에서 격리 Chrome 한 인스턴스씩 순차 사용했고 마지막 Chrome 종료 뒤 통합 담당에게 전체 타입 검사 가능 신호를 보냈다. 제품 파일·의존성·기존 dev 서버·빌드·배포·전체 타입 검사는 이 담당이 변경하거나 실행하지 않았다.

[실행 스크립트](../../../scripts/check-repeat-batch21-browser.mjs), [시나리오](browser-scenarios.md), [최종 결과 JSON](browser/final-results.json)에 상세 증거를 남겼다. 외부 요청/service worker를 차단했고 실제 사용자 원고·QR·카메라 데이터는 사용하지 않았다.

| 실제 브라우저 사례 | 결과 |
| --- | --- |
| trim/dedupe 순서에 따른 출력 차이·이동/삭제/reset undo·redo·원문 보존 | PASS |
| regex flags·서로 다른 중복 affix·shuffle 결과·작성 중 draft 보존 | PASS |
| 35회 편집 후 30회 undo/redo·no-op·새 분기의 redo 폐기 | PASS |
| 최초/외부 URL 복원·민감 문자열 제외·앵커 뒤로/앞으로·같은 query 유지 | PASS |
| 잘못된 regex·실제 100,001자 REGEX_MAX·다른 단계/이력 유지 | PASS |
| 텍스트 320px 다크 영어·실제 이동/단축키/focus·editable/IME 제외 | PASS |
| native QR 미지원에서 실제 Worker 픽셀 디코딩·동명 파일·기존 기록 보존 | PASS |
| 실제 복수 QR 한 결과·흰 이미지·손상/비지원/픽셀 상한 혼합 | PASS |
| 10/11개·8MiB·40MiB·취소/거부 시 이전 목록 유지·자동 시작 없음 | PASS |
| 제어한 native 성공은 Worker 0·미검출/지원/생성/실행 실패 뒤 실제 fallback | PASS |
| 실제 TXT 바이트·원문·수동 복사/네이티브 재시도·부모↔batch 늦은 거부 | PASS |
| native Worker 취소/종료·늦은 파일 읽기·탭 변경·timeout·실제 재시도 | PASS |
| 기존 단일 결과/이력·손상 원문·합성 카메라 tracks 종료·QR 320px 영어 | PASS |

## 텍스트 변환 결과

`trimLines → dedupe`는 `a` 한 줄, 반대 순서는 `a` 세 줄이 됐다. 이동·삭제·전체 초기화와 undo/redo 뒤 원문 및 작성 중 찾기/치환/앞뒤 문자열을 보존했다. 서로 다른 두 affix의 순서를 실제 출력으로 확인했고 regex flags와 shuffle 결과도 왕복 뒤 같았다.

35개 단계를 추가한 뒤 30회만 되돌릴 수 있어 이전 기준 5개가 남았다. 30회 다시 실행, 경계 이동 no-op의 redo 유지, undo 뒤 새 편집의 redo 폐기를 확인했다. 잘못된 regex는 해당 단계만 건너뛰었고 100,001자 입력은 기존 100,000자 상한 안내를 표시하며 이력을 계속 사용할 수 있었다. 큰 원문은 native Clipboard 붙여넣기로 입력했다.

독립 검토에서 같은 query의 hash-only popstate가 private 단계·seed·이력을 초기화할 수 있는 경계를 발견했다. 부모가 실제로 다른 query만 새 기준으로 복원하도록 보완한 뒤 URL 사례 하나만 재검사했다. 실제 앵커 클릭→뒤로→앞으로에서 private 단계 수·shuffle 결과·undo 횟수가 같았고, 다른 query 복원은 이력을 비웠다. 공유 URL에는 기존 simple/list 단계만 포함되며 원문·치환/affix 문자열·seed까지 재현한다고 주장하지 않는다.

## QR 실제 픽셀·파일 증거

- [로컬 fixture](browser/fixtures/metadata.json)는 기존 qrcode/pngjs로 생성했고 [재현 스크립트](browser/fixtures/generate.mjs)는 기존 PNG와 바이트가 같은지 확인한다. 한글, 선행/후행 공백, 줄바꿈과 탭을 포함한다. jsqr **1.4.0**의 자체 번들 Worker를 실제 Chrome에서 실행했으며 제품에서 외부 CDN decoder를 불러오지 않았다.
- 파일 선택 직후 Worker는 0개였다. 명시 시작 뒤 384×384 RGBA 589,824바이트를 각 Worker로 transfer했고 main의 buffer 길이는 0이 됐다. 세 파일의 실제 결과가 기대 원문과 일치했으며 파일명이 같아도 별도 ID를 유지했다. Worker는 각각 종료됐다. 이 개발 환경의 세 파일 처리 1회 측정은 **251ms**이며 다른 기기의 성능 보장은 아니다.
- [두 QR 합성 이미지](browser/fixtures/multiple.png)는 512px/128px 코드가 들어 있고 실제 Worker는 유효한 원문 하나만 반환했다. 같은 크기 코드 둘을 놓은 별도 [이미지](browser/fixtures/multiple-equal.png)는 로컬 Node sanity 검사에서 미검출이었다. 이 Node 결과를 브라우저 통과 개수에 넣지 않았다. 여러 QR 전체·위치 순서·유일성을 보장한다고 설명하지 않는다.
- 흰 이미지의 미검출, signature가 손상된 파일/비지원 형식의 읽기 실패, 4,097×4,096 헤더의 원본 픽셀 상한 거부를 개별 행으로 확인했다. 11개/40MiB 초과 선택은 이전 목록을 보존했고, 10개와 정확한 40MiB 선택은 처리 전 대기 목록으로 허용됐다. 파일당 8MiB 초과·빈 파일은 Worker를 시작하지 않고 거부했다.
- [선택 결과 TXT](browser/selected-qr-exact-utf8.txt)는 **550바이트**가 독립 기대값과 정확히 같았다. 선택한 1·3번 행만 원래 순서대로 포함하고 이름의 개행은 헤더에서 공백으로 바꾸되 payload의 공백·탭·개행은 유지했다. BOM을 추가하지 않았으며 기본 선택은 비어 있었다. HTML처럼 보이는 문자열은 텍스트로 표시되고 Wi-Fi 결과에 실행 링크가 없었다.
- native Clipboard 재시도 뒤 읽은 문자열도 원문과 같았다. 성공 후 복사 버튼명이 바뀌는 것을 검사 스크립트가 놓친 timeout 1건은 선택자를 고쳐 해당 사례만 다시 실행했다. 제품 결함으로 집계하지 않았다. 담당자가 보완한 최근 기록↔일괄 결과의 양방향 늦은 거부도 추가 fallback 0회·오래된 복구 안내 0개로 확인했다.

## 취소·기록·기기 API의 범위

실제 Worker의 `postMessage` 전달을 잠시 보류해 첫 성공 행과 선택을 남긴 채 다음 작업을 취소했다. 취소한 Worker의 오래된 응답을 제어 주입해도 결과를 덮지 않았고 실패 항목 재시도는 실제 decoder로 처리됐다. 늦은 `File.arrayBuffer()` 완료·새 선택·탭 전환도 확인했다. 가상 clock으로 10초 Worker timeout을 만든 뒤 실제 재시도에 성공했다. 해당 사례에서 Worker 9개 종료 및 이미지 object URL 9개 해제를 관찰했다. CPU 계산 중 특정 명령 시점의 중단이나 native decoder 내부 계산 강제 취소를 측정한 것은 아니다.

native BarcodeDetector의 성공/다중 결과/지원 확인 실패/생성 실패/detect 실패는 제어한 구현으로 검사했다. 그 뒤 Worker fallback은 실제 픽셀을 사용했다. 단일 스캔의 기록 추가도 제어한 native 결과이며 실제 OS BarcodeDetector의 인식 성능 검증과 구분한다. 일괄 결과가 기존 최근 기록을 변경하지 않았고, 손상된 기록 raw도 그대로 남았다.

카메라에는 실제 카메라 대신 로컬 canvas의 합성 MediaStream을 제공했다. 탭 전환 및 늦게 승인된 스트림 모두 tracks가 ended가 됐다. 실제 하드웨어 권한·촬영 품질 검사는 하지 않았다. Clipboard 거부/없음·native API 실패·늦은 응답은 격리 컨텍스트 주입이며 실제 성공 근거와 구분한다.

## 화면 검토

[텍스트 단계 패널](browser/text-history-english-320-dark-panel.png)과 [QR 수동 복사 복구](browser/qr-batch-english-320-dark-panel.png)를 직접 확인했다. 두 페이지 body/document 폭은 320px, 검사한 입력은 16px 이상, 신규 조작은 44px 이상이었다. 실제 키보드 이동 후 행/focus와 삭제/reset 뒤 focus가 보존됐고 원시 번역 키가 없었다. 개발 배지·고정 공유 버튼은 기존 공용 UI다. 외부 폰트·광고·방문 분석 차단 메시지는 JS/hydration 오류와 분리했다.
