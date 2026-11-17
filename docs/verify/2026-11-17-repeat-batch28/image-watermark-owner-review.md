# 28 이미지 워터마크 — 인수 담당 읽기 설계 보완

2026-11-17 KST. [계약](plan.md), [taxi 읽기 설계](image-watermark-design.md), 현재 부모·QR header·decode·이름·ZIP 코드를 대조했다. **현재 읽기와 이 문서만 작성했다. 신규 제품 TS·부모·메시지는 미착수다. 27차 발견 대응과 전체 타입 체크포인트가 우선이다.** 원래 설계의 기능 범위/계산 의미를 유지하며 아래 자원 소유권 경계만 구체화한다.

## 확정 정책과 재사용

- 사진10개/개별8MiB/합계40MiB/16,777,216px, 로고4MiB/4,194,304px, 누적 결과80MiB. PNG/JPEG/WebP/GIF의 decode된 정지 프레임만 출력한다. 헤더와 실제 decode 크기를 모두 검사한다.
- 문구 CRLF/CR/LF→공백, 정규화한 Unicode code point200자, 공백뿐이면 오류. 색은 `#RRGGBB`, 원문 px/로고 source-width 비율/여백/회전/alpha/9위치 의미 유지. 타일 **10,000회 draw** 초과는 간격을 바꾸지 않고 오류다. 잘못된 사용자 입력을 조용히 잘라 성공시키지 않는다.
- 설정 편집은 미리보기만 갱신하고 기존 output Blob/URL을 즉시 해제한다. 원본 PNG 생성은 명시 ‘모두 만들기’다. 파일 전체 비우기는 옵션·마지막 유효 로고 유지, 전체 초기화는 옵션/로고까지 기본값으로 돌린다.
- `qrImageBatch.ts`의 `qrImageDimensions`를 변경 없이 재사용한다. QR 전용 decode 축소(2048 edge)·decoder/queue는 가져오지 않는다. source full-resolution 결과에 QR 축소 정책을 적용하지 않는다.
- `imageCompress.ts`의 `decodeImage`는 EXIF 반영과 bitmap close/URL finally revoke를 제공한다. `encodeImage`는 overlay 없는 압축용이므로 재사용하지 않고, 전용 draw→PNG toBlob을 만든다. 기존 압축 options/quality/queue는 수정하지 않는다.
- `reserveUniqueImageNames`와 `ImageZipSnapshot`/`createImageZipRunner`를 재사용한다. 기존 capture 함수는 압축 queue 타입·전체 성공 행에 묶여 있어 선택된 워터마크 행용 capture만 별도 작성한다. JSZip은 기존 설치본의 Blob+STORE 흐름을 사용한다.

## 예상 소유 파일·API

| 파일 | 최소 역할 |
| --- | --- |
| `src/utils/imageWatermark.ts` | 제한/Settings 검증·정규화·key, 위치/타일 count와 draw 좌표, 안전 PNG 후보 이름, 선택된 현재 성공 output capture |
| `src/utils/imageWatermarkQueue.ts` | File/안정 ID/상태/현재 key, 명시 start/pause/resume/retryFailed/remove/reorder/clear/dispose, 단일 실제 작업과 output80MiB accounting |
| `src/lib/imageWatermark/browser.ts` | 한 large-work gate, header/decode/draw/toBlob, source/로고 작은 preview asset 소유·release, stale 검사용 포트 |
| `src/components/ImageWatermarkWorkspace.tsx` 또는 기존 부모 내부 | 옵션·파일목록·미리보기·결과·선택 ZIP의 controlled UI. 기존 `ImageWatermark.tsx` 연결은 별도 승인 후 마지막 단계 |
| `scripts/check-image-watermark.ts`, `docs28/check-…mjs` | 순수 기하/옵션/큐 포트와 실제 부모 이벤트. 준비 파일은 완성 단위로 고정 |
| `docs28/translations-watermark.json` | ko/en `imageWatermark` 조각. canonical은 통합 담당만 수정 |

자료형은 `WatermarkSettings`, `WatermarkSnapshot { settings, logoFile?, logoId?, key }`, `WatermarkRow { id,file,status,key?,output?,error? }`, `WatermarkOutput { blob,width,height,url }`를 유지한다. File/Blob 자체를 복사하거나 data URL/base64로 바꾸지 않는다. File identity와 row ID를 검사하므로 이름이 같은 사진도 별도 행이다. 대량 연산 포트는 `process(file,snapshot,current)`/`preview(file,snapshot,current)`처럼 현재 세대를 확인하되, cancel이 물리 연산 완료 Promise를 먼저 끝내지 않는다.

## 구현 전에 주의할 구체 경계

1. **직렬 gate 재진입 금지.** 한 출력 안에서 source와 logo를 함께 decode해야 한다. public preview/logo/process 진입만 gate를 획득하고 내부 `decodeValidated`/draw 함수는 gate를 다시 획득하지 않아야 한다. 그렇지 않으면 process가 자기 logo 작업을 기다리며 정지한다. 실제 Promise finally까지 슬롯을 보유하고, queued 작업은 실행 직전 current 확인 후 allocation 없이 stale을 건너뛴다. 취소·새 작업이 old decode/toBlob과 큰 캔버스를 겹치게 만들면 안 된다.
2. **새 파일 추가와 자동 출력 분리.** ‘모두 만들기’가 포착한 대상 ID 집합과 설정 snapshot을 보관한다. 실행 중 나중에 추가한 파일은 대기 상태로 남기고 다음 명시 만들기에서 처리한다. 행 이동은 안정 ID를 유지하며 UI 순서/남은 작업 우선순위만 바꾼다. 파일 추가를 기존 압축 queue처럼 자동 스케줄하는 방식은 사용하지 않는다.
3. **로고 시도와 유효 로고 identity 분리.** 새 로고 선택 시 읽기 세대를 올리고 진행 중 출력·반출을 무효화한다. 새 로고가 성공하기 전까지 마지막 유효 File/작은 preview를 유지한다. 실패하면 실패 안내와 함께 그 로고를 계속 보관하지만 새 선택 성공으로 표시하지 않는다. 읽는 동안 새 만들기는 차단한다. 각 출력은 snapshot File에서 자기 decode asset을 소유해 새 로고가 이전 작업의 bitmap을 먼저 close하지 않게 한다.
4. **ZIP runner는 invalidate 메서드가 없다.** 현재 `createImageZipRunner`는 새 run/영구 dispose만 지원한다. 설정 변경/reset에서 dispose하고 새 runner를 준비하는 wrapper가 필요하다. 이때 dispose를 물리 encode 완료로 오해해 busy 슬롯을 풀면 구 ZIP Blob과 새 ZIP 생성이 겹칠 수 있다. wrapper는 진행 Promise가 끝날 때까지 실제 busy를 유지하고, 새 요청은 대기/차단하며 old 완료의 다운로드만 무효화한다. 현재 공용 runner를 수정할 필요는 없다. 행 삭제/선택 변경은 이미 클릭한 snapshot Blob을 바꾸지 않고, 설정 변경/reset/unmount는 옛 자동 반출을 취소한다.
5. **preview 좌표와 실제 decode 크기.** EXIF 때문에 header와 decode의 가로/세로가 달라도 각각 상한에 들면 허용한다. 실제 decode 크기를 논리 원본으로 삼고 정수 preview width/height를 먼저 확정한 뒤 x/y scale을 각각 적용한다. `measureText`/font/여백/로고 ratio/회전 중심은 같은 논리 좌표 함수다. 작은 base-preview를 만든 뒤 원본 bitmap을 닫고 옵션 편집으로 원본을 반복 decode하지 않는다.
6. **타일·메모리·이름 한계.** spacing이0/비유한이거나 count가 안전 정수가 아니면 draw 전에 거부한다. 10,000회와10,001회 경계를 검사한다. 면적 제한을 통과하는 아주 긴1px 이미지도 브라우저 canvas 실패가 날 수 있으므로 canvas/context/toBlob 실패를 행 오류로 처리한다. source40MiB+output80MiB를 전체 heap 한도라고 주장하지 않는다. PNG 후보 이름에서 경로·제어문자·비어 있는 basename을 먼저 정리하고, 모든 후보를 예약하는 uniqueNames를 적용한다.

## 검증 계획과 현재 한계

순수 검사는 독립 수식으로9위치/회전 중심/preview scale, code point/CRLF/색/옵션범위, zero-spacing·타일 count, 이름예약과 선택 snapshot을 대조한다. 포트 검사는 old process가 끝나기 전 동시 large-work1, 추가 파일의 명시 시작, pause/resume, 실패만 재시도, 로고 실패 마지막 유효본, row 삭제/reset/locale/언마운트, output80MiB 정확 경계와 자원 release 횟수를 확인한다. ZIP은 실제 클릭 snapshot과 별도 busy 슬롯을 검증한다.

부모/브라우저는 사용자가 제공한 사진을 쓰지 않고 합성 가로/세로/작은/투명 소스와 합성 투명 로고만 사용한다. 실제 PNG의 원본 크기·alpha·고유 픽셀·워터마크 기하와 ZIP 이름/CRC/내용을 독립 확인한다. 폰트 rasterization의 환경별 완전한 픽셀 동일성, 애니메이션 보존, 실제 휴대폰 모든 메모리/성능은 검증 범위로 주장하지 않는다. 아직 구현·검사 PASS를 주장할 단계가 아니다.
