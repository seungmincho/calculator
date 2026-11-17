# 21B QR 이미지 여러 장 읽기 구현 설계

2026-11-17 KST · 담당 writing_versions. [21차 계약](plan.md)과 [확정 후보·출처 조사](../../handoff/2026-11-17-after-batch20-candidates.md)에 따른 **구현 전 설계**다. 제품 TS, 의존성, 기존 저장소를 변경하지 않았다. 20차 체크포인트 뒤 부모 연결·설치 권한을 받은 후 구현한다. 20차 독립 검토와 이전 작업의 결함 대응이 우선이다.

## 1. 기존 화면과 연결

- `QrScanner`의 카메라/이미지 탭, 단일 이미지 입력, 최근 20개 기록을 유지한다. 이미지 탭은 ‘한 장’/‘여러 장’ 세그먼트로 구분해 선택한 입력만 보여 주고, 여러 장에는 별도 `QrBatchScanner` 자식을 연결한다. 제목은 ‘여러 이미지에서 QR 읽기’, 입력은 ‘이미지 여러 장 선택’으로 단일 입력과 구분한다. 여러 파일을 기존 단일 입력에 넣었을 때 첫 파일만 읽는 동작을 새 일괄 처리로 오인하게 하지 않는다.
- 새 자식은 부모의 `scanResult`, `detectorRef`, `canvasRef`, `addToHistory`를 공유하지 않는다. `active`만 받아 이미지 탭 또는 여러 장 세그먼트를 떠날 때 진행 중 작업을 취소한다. 최초 여러 장 세그먼트 방문 뒤에는 숨겨도 자식을 유지해 완료 결과와 선택 상태를 보존한다. 다시 들어와도 자동 재시작하지 않는다.
- 일괄 입력은 `BarcodeDetector` 미지원 여부로 비활성화하지 않는다. 기존 전역 지원 경고는 카메라/기존 단일 읽기에 대한 안내임을 명확히 하고 새 이미지 기능까지 지원하지 않는다는 문구를 제거한다. 단일 읽기의 미지원 안내에 ‘여러 이미지 읽기’ 전환 버튼을 제공해 사용할 수 있는 Worker 흐름으로 바로 이동하게 한다.
- 이미지 탭 진입은 기존 `stopCamera`를 호출한다. 늦게 승인된 `getUserMedia`가 탭 변경/언마운트 이후 스트림을 남기지 않도록 카메라 시작 세대 검사와 늦은 스트림 tracks 정리만 최소 보완한다. 카메라 알고리즘을 새 Worker로 옮기지 않는다.
- 새 원본·결과·선택은 메모리에만 있다. URL, localStorage, 최근 기록에 자동 반영하지 않는다. 기존 단일 이미지/카메라의 내용별 중복 제거와 20개 기록 정책은 유지한다.

## 2. 파일·자원 한도

| 대상 | 설계값 | 처리 |
| --- | --- | --- |
| 한 번 선택 | 최대 10개 | 초과하면 선택 전체 거부, 이전 목록 유지, 첫 10개만 조용히 취하지 않음 |
| 파일 크기 | 1바이트 이상, 최대 8 MiB | 위반 파일도 목록에 남겨 개별 사유 표시 |
| 선택 합계 | 최대 40 MiB | 모든 선택 파일의 크기로 계산, 초과하면 이전 목록 유지 |
| 원본 픽셀 | 양의 정수 가로×세로 ≤ 16,777,216 | 디코딩용 캔버스 생성 전 헤더 검증, 초과는 범위 초과 |
| 처리 캔버스 | 긴 변 최대 2,048px, 최대 4,194,304픽셀, 확대 없음 | 비율 유지; 화면에 축소 처리와 작은 QR 미검출 가능성 안내 |
| 진행 작업 | 한 파일씩 | 다음 파일은 현재 파일의 논리적 완료 뒤 시작; 전체 이미지 미리 디코딩 금지 |
| 파일 시간 | 전체 20초, 네이티브 지원 확인·detect 합계 최대 3초, Worker 최대 10초 | 각 단계는 남은 전체 시간도 적용; 초과는 명시적 시간 초과 |

2,048px와 시간값은 구현 초깃값이며 아직 실측 성능이 아니다. 실제 이미지/모바일 결과를 기록하고 조정 시 최종 문구·검사를 함께 바꾼다. 기존 확정 개수/바이트/원본 픽셀 한도는 그대로다.

새 일괄 입력은 PNG/JPEG/WebP/GIF를 명시 지원한다. SVG/HEIC 등은 지원하지 않는 형식으로 행에 표시하며 기존 단일 입력의 형식을 축소하지 않는다. 파일 MIME/확장자만 믿지 않고 실제 signature와 크기 헤더를 검사한다. 빈 MIME의 정상 파일은 signature로 허용한다. 애니메이션은 한 프레임만 읽으며 전체 프레임을 검사하지 않는다. HTMLImageElement로 그리는 경로는 첫 프레임이라고 보장하지 않는다. 향후 정확한 첫 프레임을 명시하려면 실제 API 경로를 별도로 검증해야 한다.

PNG의 IHDR, JPEG의 SOF, WebP의 VP8/VP8L/VP8X, GIF의 논리 화면 크기를 읽는 작은 순수 헤더 파서를 둔다. 잘린 헤더, 잘못된 segment/chunk 길이, 0/비정수 크기를 거부하고 JPEG 탐색은 이미 제한한 파일 바이트 안에서만 진행한다. 디코딩 후 실제 크기도 재검사한다. EXIF 회전으로 가로·세로가 바뀌는 것은 픽셀 면적을 바꾸지 않는다. 브라우저 내부 디코더의 모든 메모리 할당을 통제한다는 보장은 하지 않는다.

## 3. 읽기 순서와 Worker 경계

1. 파일 선택은 개수/합계만 먼저 확인해 목록을 확정한다. 사용자가 ‘읽기 시작’을 눌러야 실제 이미지 읽기·Worker 로딩을 시작한다. 같은 이름 파일도 선택 순서와 내부 ID로 각각 유지한다.
2. 현재 파일의 크기·형식·헤더를 검사한다. 통과한 파일 하나에만 object URL을 만들고 이미지 onload/onerror로 디코딩한다. `createImageBitmap` 사용 시에도 원본 헤더 검증을 먼저 하고 늦은 bitmap은 반드시 `close()`한다. 이미지·캔버스는 자식 작업 전용이다.
3. 밝은 단색 배경의 제한 크기 캔버스에 그린다. 투명 이미지의 배경은 흰색으로 합성한다. 임의 자르기·색 반전 재시도·다중 해상도 루프는 추가하지 않는다.
4. 네이티브 생성자가 있고 `getSupportedFormats()`에 `qr_code`가 있으면 새 detector로 실행한다. 지원 확인/생성/detect의 실패·시간 초과·결과 없음은 이 유효 이미지의 Worker 대체 처리로 이어진다. 결과의 `rawValue`가 문자열인 첫 QR만 채택한다. 빈 문자열도 ‘성공한 빈 내용’과 미검출을 별도 상태로 구분한다.
5. 네이티브로 성공하지 못한 경우에만 `new Worker(new URL('./qrImage.worker.ts', import.meta.url), { type: 'module' })` 경로를 생성한다. Worker 파일 안에서 `jsqr`를 import하므로 카메라/페이지 초기 진입에는 디코더 본문을 불러오지 않는다. 네이티브 성공만 있는 작업에는 Worker를 만들지 않는다.
6. 캔버스 RGBA의 `ArrayBuffer`를 transfer 목록에 넣어 보내고 main에서 복제본을 보관하지 않는다. Worker는 width/height/버퍼 길이/픽셀 한도를 검증한 뒤 jsQR을 한 번 호출한다. `inversionAttempts: 'attemptBoth'`를 명시하되 자체 다중 호출 루프는 두지 않는다. 성공이면 문자열 내용, null이면 미검출, 예외면 처리 실패를 반환한다.
7. Worker 생성 실패, `error`, `messageerror`, 잘못된 응답, 시간 초과를 미검출과 구분한다. 파일 작업이 끝나면 Worker를 종료한다. 다음 파일은 새 인스턴스를 쓰며 브라우저의 모듈 캐시를 이용한다. Worker가 없거나 차단됐을 때 main thread에서 jsQR을 동기 실행하지 않는다.

프로토콜은 요청 `{ requestId, width, height, pixels }`, 응답 `{ requestId, type: 'found' | 'notFound' | 'error', ... }`로 좁힌다. 클라이언트가 현재 Worker 인스턴스·requestId·한 번만 완료 조건을 함께 확인한다. QR 외의 바코드 처리, 원격 이미지 URL 입력, 업로드 서버는 추가하지 않는다.

‘파일당 처음 읽힌 QR 한 개’는 디코더가 처음 성공한 결과라는 뜻이다. 공간상 왼쪽 위 QR이나 모든 QR을 찾는다는 뜻이 아니다. 네이티브가 여러 결과를 주면 한 개만 표시했음을 알릴 수 있지만 jsQR 성공에 ‘QR이 한 개뿐’이라는 설명을 붙이지 않는다. 복수 QR은 원하는 영역을 잘라 다시 선택하도록 안내한다.

## 4. 상태·취소·재시도

행 상태는 `waiting → processing → success | notDetected | readFailed | outOfRange | timedOut | canceled`다. `readFailed`에는 형식/디코딩/Worker 불가 등의 구체적 이유 코드를 함께 두고 번역한 문구를 표시한다. 실패 행을 목록에서 누락하지 않는다.

- 작업 단위 generation, 파일별 내부 ID, attempt 번호를 사용한다. 모든 비동기 완료는 세 값과 현재 active 여부를 확인한다. 파일명이나 payload를 식별자로 사용하지 않는다.
- 취소/새 유효 선택/탭·단일/여러 장 세그먼트 전환/언마운트는 generation을 먼저 증가시키고 읽기·Worker·시간 제한을 정리한다. 이미 완료한 행은 보존하고 진행·대기 행은 취소로 표시한다. 언마운트에서는 전체 참조를 해제한다.
- 새 선택이 개수/합계 단계에서 거부되거나 파일 대화상자가 취소되면 현재 목록을 유지한다. 유효한 새 선택을 확정할 때에만 이전 작업과 목록을 교체한다. 같은 파일을 다시 고를 수 있도록 input.value를 비운다.
- ‘실패 항목 다시 읽기’는 미검출·일시 읽기 실패·시간 초과·취소 행만 선택 순서로 다시 처리한다. 성공 행과 TXT 선택은 유지한다. 크기/형식 같은 정적 오류는 새 파일 선택이 필요하다고 알린다. 처리 중에는 중복 시작·중복 재시도를 막되 취소/새 선택은 가능하다.
- 브라우저의 이미지·네이티브 Promise에는 강제 중단 API가 없을 수 있다. timeout은 UI 대기를 끝내고 늦은 완료를 무시한다. 가능한 image.src 해제·핸들러 제거는 수행하고, 늦게 생긴 bitmap은 닫는다. 네이티브 내부 계산까지 강제로 끝낸다고 설명하지 않는다. jsQR Worker는 `terminate()`로 실제 중단한다.

정리 함수는 중복 호출에 안전하게 한다. 타이머 해제, Worker terminate와 handler 제거, image handler/src 해제, object URL revoke, bitmap close, 캔버스 width/height=0, buffer/File 참조 제거가 대상이다. 완료 목록에서는 재시도를 위해 제한된 압축 File 참조만 유지하고 미리보기 data URL·RGBA·원본 bitmap은 저장하지 않는다.

## 5. 결과·복사·TXT

- 파일 선택 순서대로 파일명·상태·내용을 보여 준다. QR 내용은 JSX 텍스트/readonly textarea로만 렌더링하며 줄바꿈을 유지한다. 긴 내용은 `min-w-0`, `break-all`, `whitespace-pre-wrap`을 적용한다. HTML 주입을 사용하지 않는다.
- `new URL` 파싱 후 protocol이 정확히 http:/https:인 결과에만 명시 ‘링크 열기’를 제공한다. 사용자가 클릭하기 전 이동·fetch하지 않는다. `rel="noopener noreferrer"`를 사용하고 mailto/tel/Wi-Fi/vCard/javascript/data 내용은 텍스트로 유지한다.
- 복사는 공통 세대 토큰으로 마지막 요청만 안내한다. Clipboard 성공 또는 `execCommand('copy') === true`일 때만 성공 표시한다. 거절/false/미지원에는 해당 원문 readonly 필드와 ‘텍스트 선택’을 제공한다. 늦은 거절이 새 복사 대상을 fallback으로 덮지 않도록 실행 직전에도 세대를 검사한다.
- TXT는 성공 행의 명시 체크만 내보내며 기본 체크는 비어 있다. 내용이 같은 서로 다른 파일도 각각 남긴다. 출력은 UTF-8 텍스트이며 파일 순서·표시 번호·파일명·QR 원문으로 구성한다. 파일명에 포함된 제어 문자/개행만 헤더용으로 정리하고 payload 자체는 trim/정규화/URL 변환하지 않는다. 이 형식은 재수입 포맷으로 보장하지 않는다.
- TXT 파일명은 고정 안전 접두사와 날짜를 사용한다. 다운로드 object URL을 정리하고 클릭 이후 안내는 ‘다운로드를 요청했어요’로 제한한다. 실제 사용자 디스크 저장 완료로 단정하지 않는다. 선택이 없으면 다운로드를 비활성화한다.
- 모든 입력/버튼/체크 행은 44px 이상, 편집 입력은 16px 이상, 제품 토큰과 ko/en 번역을 사용한다. 진행/오류 요약은 `aria-live="polite"`로 알리고 행별 label에 파일 표시 번호를 포함한다. 320px에서 카드가 한 열로 쌓인다.

## 6. 기존 경계의 최소 보완

기존 `qrScanHistory`는 배열 여부 검증 없이 JSON.parse 결과를 사용하고, 기존 복사는 catch에서도 성공을 표시한다. 새 기능 연결 중 이 두 실제 경계는 함께 보완한다. 이력은 기존 `{ content, type, timestamp }[]` 형식으로 검증하며 손상/읽기 차단 시 원본을 지우거나 빈 목록으로 자동 저장하지 않는다. 현재 스캔 결과 표시는 계속 가능하고 기록 실패를 별도로 알린다. 쓰기 전 raw 대조로 다른 탭 변경을 확인하고 저장 성공 후에만 목록을 확정한다. 명시 기록 비우기도 실제 저장소 변경 성공 뒤 반영한다. 별도 새 저장 형식이나 자동 migration은 추가하지 않는다.

기존 결과/이력 복사도 새 공통 복사 헬퍼의 실제 성공 검사와 수동 선택 복구를 사용한다. 카메라·단일 이미지 결과는 기존 정책대로 기록하고 새 일괄 결과는 기록하지 않는 경계를 검사한다.

## 7. 예정 파일과 검증

예정 제품 소유 범위는 `QrScanner.tsx` 최소 연결, 새 `QrBatchScanner.tsx`, `src/lib/qr/`의 worker/client/protocol/image 처리 모듈, `src/utils/qrImageBatch.ts`의 한도·상태·TXT 순수 로직이다. 정확한 분리는 구현 시 정하되 Worker 번들에 React/번역·부모를 끌어들이지 않는다. 번역 조각은 `docs/verify/2026-11-17-repeat-batch21/translations-qr.json`의 ko/en을 같은 담당자가 작성하고 통합 담당에게 전달한다.

| 검증 | 핵심 증거 |
| --- | --- |
| 순수 경계 | 10/11개, 8 MiB 및 40 MiB 바로 위, 16,777,216픽셀 경계, 헤더 잘림/위조, 중복 이름/내용 별도 ID, 실패 행 보존, TXT 원문/순서 |
| 실제 Worker/픽셀 | 기존 qrcode 생성기의 한글·ASCII·흰 이미지·동일 내용 다른 파일·두 QR 합성 fixture를 설치된 jsQR로 실제 디코딩; 복수 QR은 둘 중 유효한 하나이며 유일성 주장 없음 |
| 상태 fixture | 지원 확인/생성/detect reject·timeout·빈 결과에서 fallback 1회, 늦은 성공/실패·새 선택·탭 전환·취소·unmount, 재시도 성공 행 보존, Worker 오답 ID·messageerror·시작 실패 |
| 자원 fixture | object URL 생성/해제 짝, timer 제거, bitmap.close, 캔버스 해제, Worker terminate, 이전 File 참조 제거; Clipboard 실패·늦은 fallback 차단 |
| 독립 브라우저 | verify 단독: 실제 Worker 청크/실제 QR 이미지, 네이티브 없는 환경, mixed 파일, 320px/light/dark/EN/키보드, TXT byte 검사, 카메라 tracks 종료·기존 단일/기록 |
| 설치/정적 범위 | 승인 후 `npm install --save-exact jsqr@1.4.0`, npm lock만 변경, 실제 배포 패키지 license/declarations/runtime dependencies 확인, scoped lint·도메인 검사, 초기 정적 import graph에 jsQR 없음 |

브라우저 강제 오류 mock과 실제 디코더 픽셀 성공을 별도로 기록한다. 실제 의존성/Worker 청크 크기는 설치·검증 후 측정해 보고하며 현재 문서에 추정 수치를 쓰지 않는다. 전체 tsc는 통합 담당, Chrome은 검증 담당만 수행한다. build/commit/deploy는 하지 않는다.

## 8. 근거와 미검증 범위

- Chrome의 공식 [feature detection 안내](https://developer.chrome.com/docs/capabilities/shape-detection#feature_detection)는 생성자 존재만으로 충분하지 않으며 지원 포맷 확인과 대체 처리를 권한다. 이 문서의 예전 OS 지원 표를 현재의 지원 보장으로 사용하지 않는다.
- jsQR의 [공식 소스](https://github.com/cozmo/jsQR/blob/master/src/index.ts)는 RGBA 입력에서 성공한 QR 하나 또는 null을 반환하는 API를 제공한다. [패키지 정본](https://github.com/cozmo/jsQR/blob/master/package.json)과 실제 설치본의 버전·license는 설치 때 다시 대조한다. `v1.4.0` GitHub tree 주소는 조회 시 404였으므로 고정 태그 근거로 사용하지 않았다.
- [MDN createImageBitmap](https://developer.mozilla.org/en-US/docs/Web/API/Window/createImageBitmap)은 Promise 반환, EXIF 방향 및 resize 옵션을 설명한다. resize가 브라우저 내부 원본 메모리 사용까지 제한한다는 보장으로 해석하지 않는다.

이 문서는 구현·성능·브라우저 통과 결과가 아니다. 20차 검토 완료 후 제품 연결 권한을 받아 실제 설치본/이미지 처리 API에 맞춰 구현하고, 위 한도·지원 형식·시간 정책이 달라지면 문서와 사용자 안내를 함께 갱신한다.
