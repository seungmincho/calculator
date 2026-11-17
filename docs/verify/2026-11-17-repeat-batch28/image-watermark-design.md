# 28차 이미지 워터마크 — 읽기 설계

2026-11-17 KST. **읽기와 이 문서만 작성했다. 28차 신규 TS·부모·공용 번역은 미작성이다.** 26차 발견 대응이 우선이며, 순수 준비는 별도 신호 후, 부모 연결은27차 체크포인트 후 진행한다.

## 현재 코드와 재사용 경계

| 코드 | 확인한 사실 | 28차 사용 |
| --- | --- | --- |
| `src/components/ImageWatermark.tsx` | source/로고 각 하나의 HTMLImageElement, 두 FileReader/onload에 세대·오류 처리 없음. 미리보기 축소, PNG 출력은 원본 크기. toBlob 늦은 자동 다운로드 보호 없음 | 기존 옵션·9위치·원본 PNG 의미를 보존하며 파일목록/세대/명시 일괄 처리에 연결 |
| `src/utils/qrImageBatch.ts` | `qrImageDimensions`는8MiB 이하 PNG/JPEG/WebP/GIF 헤더를 읽고16,777,216px를 decode 전에 검사. 실제 JPEG segment/WebP chunk 범위 검사 포함 | 새 헤더 파서를 만들지 않고 재사용. 로고는 먼저4MiB 검사, 반환 크기에4,194,304px 추가 제한. 실제 decode 결과도 별도 확인 |
| `src/utils/imageCompress.ts` | `decodeImage(blob, signal)`은 EXIF 반영 ImageBitmap→HTMLImage fallback, abort 뒤 bitmap close, fallback URL finally revoke. `encodeImage`는 base image만 렌더하고 품질/형식 처리 | decode/formatBytes/outputName 재사용. overlay를 위해 압축 품질 옵션을 바꾸거나 encodeImage에 워터마크를 억지로 넣지 않음 |
| `src/utils/imageCompressionQueue.ts` | 취소돼도 active 작업은 finally까지 슬롯을 보유. 다만 타입은 CompressOptions, add/setOptions는 자동 처리 | 슬롯/세대 패턴을 작은 워터마크 전용 모듈로 작성. 기존 압축 queue·호출부 변경 없음 |
| `src/utils/imageUniqueNames.ts` | 원래 후보 이름 전체를 예약하고 대소문자 중복과 생성 suffix 충돌을 회피 | PNG 후보 이름을 안전화한 뒤 재사용. `a.png`, 중복 `a.png`, `a (2).png` 등의 순서 확인 |
| `src/utils/imageZipSnapshot.ts` | Blob 참조 기반 ImageZipSnapshot, 최신 요청/언마운트만 download하는 `createImageZipRunner`. capture는 압축 queue 타입과 전체 성공 행에 묶임 | 선택된 현재 성공 행의 작은 capture만 새로 작성. 기존 runner/타입 재사용 가능. 기존 모듈 수정 불필요 |
| `ImageCompressor.tsx` | JSZip에 각 Blob을 직접 넣고 STORE로 generateAsync. 결과 URL은 download 후 지연 회수 | 기존 설치된 jszip 사용. base64·Data URL이나 모든 파일 arrayBuffer 복사 방식 제외 |

ImageWatermark의 현재 값 범위는 font10–200px, logo 너비5–80%, opacity1–100%, rotation−180–180°, margin0–100px이다. text는 단일 input, fontFamily는 sans-serif/serif/monospace, 색 기본값은#ffffff다. 이 옵션 범위를 유지하고 enum·boolean·유한 정수·색을 엄격히 검사한다. 기존 오류인 무효 CSS 색의 조용한 재사용은 허용하지 않는다.

## 제안 파일/API

아래 이름은 구현 전 계약 초안이며 현재 파일은 만들지 않았다.

- `src/utils/imageWatermark.ts`: limits·옵션 검증/고정 key·원본 좌표·타일 배치·파일명·선택 PNG snapshot. 순수 계산과 상태 입력을 담당한다.
- `src/utils/imageWatermarkQueue.ts`: File 참조/안정 id, 명시 start·pause/resume·retryFailed·remove/reorder·clear/dispose. 한 작업 슬롯, 세대와 output80MiB accounting. 기존 압축 queue를 수정하지 않는다.
- `src/lib/imageWatermark/browser.ts`: 헤더 검사→decode→공통 draw→toBlob, 미리보기/로고 읽기와 자원 소유권. 브라우저 포트를 독립 검사에서 대체 가능하게 한다.
- 자식 UI가 필요하면 `ImageWatermarkBatch.tsx`에 목록/상태/선택을 배치하고 기존 부모는 옵션/미리보기와 연결한다. 최종 분할은 준비 시 복잡도를 보고 결정하며 새 파일이 안정된 뒤 부모 import한다.
- 검사 `scripts/check-image-watermark.ts`, queue/실제 부모 이벤트 검사는 docs28에 둔다. 번역은 `translations-watermark.json`의 ko/en `imageWatermark` 패치로 같은 담당이 작성한다.

핵심 자료형은 `Settings`(위 옵션+text 또는 logo identity), `LogoAsset`(검증된 File·id·크기·작은 미리보기 URL), `Row`(id/File/status/key/output/error), `Output`(PNG Blob·원 크기·URL), `BatchSnapshot`(고정 options·logo File reference·key)다. File/Blob은 복사하지 않는다. key는 검증된 모든 의미 옵션과 logo id를 고정 순서로 직렬화하면 충분하다. SHA/서버/저장소는 필요 없다.

queue는 대기/처리중/완료/오류와 일시중지 상태를 구분한다. `start(snapshot)`만 작업을 시작하며 옵션 편집은 invalidate만 한다. resume은 멈췄던 동일 snapshot에만 적용한다. 설정이 바뀌면 새 ‘모두 만들기’를 요구한다. 실패만 재시도는 현재 key 오류 행만 다시 대기시킨다. pause로 무효가 된 진행 행은 대기로 돌아가며 실패 개수에 넣지 않는다.

## 좌표와 미리보기

1. 출력의 실제 decode 너비/높이를 논리 좌표로 삼는다. EXIF로 가로·세로가 바뀔 수 있어 헤더 너비와 그대로 일치한다고 강제하지 않되 양쪽의 픽셀 상한을 확인한다.
2. text measureText는 원래 font px로 계산하고 text height도 기존 의미대로 fontSize다. 로고 너비=`sourceWidth×size/100`, 높이는 로고 비율이다.9위치는 기존 중심 좌표(여백+반폭, 중앙, source−여백−반폭)를 그대로 쓴다. 회전은 워터마크 중심 기준이다.
3. preview는 정수 캔버스 크기를 먼저 정하고 `ctx.scale(previewWidth/sourceWidth, previewHeight/sourceHeight)` 뒤 같은 source 크기·함수로 그린다. 별도 ‘축소된 폰트/여백/위치’ 알고리즘을 만들지 않는다. 정수 반올림으로 생기는 축소 픽셀 차이는 인정하되 위치와 원본 대비 크기를 비교한다.
4. 선택 원본을 decode한 뒤 작은 base preview canvas로 줄이고 원본 bitmap은 바로 close한다. 설정 편집은 이 base canvas에 워터마크를 다시 그려서 원본10개 decode나 PNG 전체 재생성을 유발하지 않는다. 선택 사진이 바뀌면 이전 preview 작업을 무효화한다. 실제 원본 PNG는 명시 ‘모두 만들기’에서만 생성한다.
5. tile은 기존처럼 canvas 중심을 기준으로 회전한 grid를 사용하고 시작점을 −diagonal로 유지한다. 반복 수를 계산한 뒤 안전 상한을 넘으면 해당 행을 오류로 표시한다. 간격을 조용히 늘려 결과 밀도를 바꾸지 않는다.0/비유한 간격과 카운트는 draw 전에 거부한다.

## 읽기·슬롯·메모리

- 신규 파일 집합은 개수10/전체40MiB를 현재 목록과 함께 검사한다. 집합 한도 초과는 기존 목록을 유지하고 추가를 거부한다. 집합 한도 안의 개별8MiB 초과·형식/깨짐은 해당 행 오류이며 다른 행은 계속한다. 오류 행의 File도 전체 byte accounting에 포함하고 삭제로 공간을 회수한다.
- 헤더 검사는 파일 메타 한도를 먼저 확인한 뒤 최대8MiB 한 파일의 ArrayBuffer를 읽는다. 헤더만 보고 성공으로 표시하지 않고 browser decode도 성공해야 한다. 로고는4MiB/4MP 별도 상한이다.
- 기본 제안은 브라우저 adapter에 작은 직렬 실행 gate 하나를 두어 preview/로고 검증과 batch decode/toBlob의 큰 작업이 겹치지 않게 하는 것이다. queue의 다음 작업은 이전 promise의 finally 뒤에만 시작한다. 취소 요청만으로 gate를 풀지 않는다. queued preview는 실행 전에 현재 세대를 확인하여 오래된 요청은 allocation 없이 건너뛴다.
- 로고는 검증 시 thumbnail만 남기고 큰 bitmap을 닫는다. 각 출력 작업은 snapshot의 logo File을 필요할 때 decode하고 finally 닫는다. 새 로고가 선택돼도 이전 작업이 닫힌 logo bitmap을 참조하는 소유권 문제를 피한다. 마지막 유효 logo File/작은 preview는 새 로고 성공 때만 교체한다.
- output 성공 직전에 `retainedOutputBytes + blob.size ≤80MiB`를 검사한다. 넘으면 그 Blob/URL을 성공 목록에 넣지 않고 용량 오류를 표시한다. 삭제/설정 무효화/비우기에서 accounting과 URL을 함께 해제한다. 재시도는 기존 성공을 중복 합산하지 않는다.
- 캔버스는 finally에 width/height=0, ImageBitmap은 close, 임시 URL은 revoke한다. source/preview/logo/result/download URL의 소유자를 분리해 같은 URL의 이중 회수나 늦은 재생성을 막는다. 원본40MiB+출력80MiB는 전체 브라우저 heap 상한이 아니다. decode/canvas와 진행 중 ZIP은 추가 메모리가 필요하므로 실제 휴대폰 전체 안정성을 단정하지 않는다.

## 내보내기·뒤늦은 완료

행 성공은 row id·같은 File 참조·snapshot key·작업 generation이 모두 현재일 때만 적용한다. 설정/로고 변경, 행 삭제, 전체 비우기, 언마운트 후 늦은 output은 release한다. 로고 실패는 마지막 유효 로고를 유지하고 새 선택 적용 성공을 표시하지 않는다. 새 로고 읽기 중에는 현재 작업/내보내기 상태가 모호하지 않도록 안내하고 새 ‘모두 만들기’를 차단한다.

ZIP 클릭은 선택된 현재 key의 성공 행만 고정 순서로 캡처한다. 실패/대기 행은 포함하지 않으며 ‘선택 성공 N장 / 전체 선택 M장’과 실패 제외를 표시한다. 빈 snapshot은 ZIP 요청을 하지 않는다. 이름은 경로/제어문자를 제거한 basename의 PNG 후보→`reserveUniqueImageNames` 순서다. 이후 행 URL을 회수해도 snapshot Blob은 ZIP이 끝날 때까지 유효하다. 새 ZIP 요청/언마운트는 이전 자동 download를 무효화한다. 설정 변경/전체 reset도 예전 반출 자동 다운로드를 취소하는 방향이 안전하다. 이미 클릭한 ZIP의 행만 삭제하거나 선택을 바꾸는 것은 snapshot 내용을 다시 쓰지 않는다.

ZIP 생성 중 버튼을 비활성화해 중복 요청을 제한하되 runner 자체 최신 요청 보호도 유지한다. PNG 개별 다운로드 역시 현재 key인 성공 결과만 사용하며 새 canvas 작업을 시작하지 않는다. 다운로드는 저장 완료라고 단정하지 않고 요청했다고 표시한다.

## 구현 전 root 확인을 위한 작은 정책 제안

1. **문구**: 기존 한 줄 의미를 유지한다. CRLF/CR/LF는 공백 하나로 명시 정규화하고 입력 옆에 안내, Unicode code point200자 제한을 제안한다. 여러 줄 배치 기능은 추가하지 않는다. 공백뿐인 텍스트는 만들기 전에 오류로 안내한다.
2. **색**: `#RRGGBB`만 허용해 color input과 원문 hex input을 일치시킨다. 텍스트가 무효이면 그대로 보존하고 만들기를 막는다. CSS 이름/rgba를 추가로 지원하지 않는다.
3. **타일**: root 확정으로 이미지당 최대10,000회 draw다. 기존 위치/간격을 바꾸지 않고 초과 시 ‘크기 또는 여백을 늘려 주세요’라는 행 오류로 안내한다. 아주 긴1px source 같은 area-valid 극단은 browser canvas 실패도 명시 오류로 처리하며 성공을 약속하지 않는다.
4. **미리보기와 큐**: 위 작은 adapter gate로 큰 decode/toBlob을 직렬화하는 제안이다. 변경을 즉시 중단할 수 있다고 주장하지 않고 ‘중지 중’→실제 종료 뒤 중지 상태를 표시한다. 미리보기 선택은 최신 요청만 적용한다.
5. **기존 결과**: 설정 편집 시 이전 output Blob/URL을 바로 해제하고 다시 만들기 상태로 돌려80MiB를 이중 보유하지 않는 안을 제안한다. 기존 유효 로고와 사용자 옵션/문구는 보존한다. 파일 목록 전체 비우기는 설정을 유지하고, 기존 전체 초기화 버튼은 옵션·로고까지 기본값으로 되돌린다.

## 예정 검증

- 순수: 옵션 경계/문구/색,9위치와 원본→preview scale, 모든 회전·tile count 상한, header 사전 제한/실제 decode 추가 검사, 안정 이름/선택 snapshot.
- queue 포트: 동시작업1, abort가 효과 없어도 다음 작업 시작 금지, pause/resume/실패만 재시도, 설정/로고/행삭제/reset/unmount의 늦은 성공·실패, output80MiB 정확 경계와 accounting/URL 해제.
- 실제 부모 이벤트: single/multiple선택·키보드행이동·현재선택, 로고 실패 마지막 유효값 유지, 무효 색/빈문구, 원본 유지, stale 개별/ZIP 차단과 현재 Blob snapshot.
- 전담 browser: 실제 PNG source별 고유 픽셀과 overlay·alpha·크기, preview 기하, 실제 ZIP 이름/CRC/내용의 독립 oracle, KO/EN320px/44px/16px. Canvas 폰트의 환경별 완전한 pixel equality나 모든 모바일 메모리 성능은 주장하지 않는다.

root가 문구 newline→space/code point200자·#RRGGBB·adapter 직렬 gate·설정 변경 결과 해제·파일 비우기 옵션 보존/전체 초기화를 승인했다. 타일 상한만 제안50,000 대신10,000으로 확정했다. 현재 CSV 성능 후속이 우선이고28 TS 착수는 그 완료 뒤 재배정 신호를 기다린다. 읽기 조사만으로 제품 검증 PASS를 주장하지 않는다. 이 파일 외28차 변경은 없다.
