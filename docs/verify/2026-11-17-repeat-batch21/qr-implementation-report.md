# 21B QR 이미지 여러 장 읽기 구현·검사

2026-11-17 KST · writing_versions. [계약](plan.md), [설계](qr-implementation-design.md)에 따라 기존 QR 스캐너를 개선했다. 제품/번역/검사 준비 완료, 제품 TS 편집 중지 상태다. Chrome·전체 tsc·빌드·배포·커밋은 담당자가 실행하지 않았다.

## 구현 범위

- 이미지 탭에 한 장/여러 장 세그먼트를 제공한다. 기존 단일 읽기와 카메라의 최근 기록 정책을 유지하고, native 미지원 안내에서 여러 장 읽기로 직접 전환한다. 여러 장 패널은 최초 방문 후 유지하되 떠나면 진행 작업을 취소한다. 완료 결과는 돌아왔을 때 남으며 자동 재시작하지 않는다.
- 10개, 파일당 8 MiB, 합계 40 MiB, 원본 16,777,216픽셀을 제한한다. PNG/JPEG/WebP/GIF signature·크기 헤더를 캔버스 디코딩 전에 검사한다. 초과 행을 누락하지 않는다. 개수/전체 바이트 초과 선택은 이전 목록을 유지한다.
- 처리 이미지는 긴 변 2,048px 이하로 비율을 유지한다. 파일당 전체 20초, native 단계 3초, Worker 10초의 남은 시간 범위를 적용한다. 애니메이션은 한 프레임을 읽고 전체/첫 프레임 보장을 하지 않는다.
- native qr_code 지원·생성·실행·미검출을 확인하고 성공하지 못하면 자체 번들 jsQR Worker로 한 번 처리한다. 처음 읽힌 QR 하나만 반환한다. Worker는 실제 대체 처리가 필요할 때 생성하며 RGBA buffer를 transfer하고 성공/실패/취소/시간 초과에 terminate한다.
- 파일별 상태/취소/실패 재시도, 기본 미선택의 성공 결과 TXT, 원문 복사·수동 복구를 제공한다. 같은 파일명/같은 내용도 별도 행이다. batch 원본·결과는 자동 저장/최근 기록/URL에 추가하지 않는다. QR은 텍스트로 표시하며 명시 http/https 링크만 제공한다.
- 기존 카메라의 늦은 getUserMedia/detect 응답과 단일 FileReader 응답을 세대로 차단한다. 카메라 시작 시 오래된 isScanning closure 대신 실행 ref를 확인한다. 취소된 뒤 승인된 스트림은 즉시 정리한다.
- 기존 `qrScanHistory`의 배열/필드 검증과 raw CAS/readback·지원 시 Web Lock을 추가했다. 손상 데이터를 자동으로 덮지 않으며 쓰기 후 확인 불가는 재조회 안내로 구분한다. 단일/카메라의 내용별 중복 제거·최근 20개는 유지한다. Web Locks 미지원 시 CAS/readback은 동시 쓰기의 원자성을 전부 보장하지 않는다.
- 부모 기록/일괄 결과 복사는 공유 세대 순서를 사용한다. 이전 Clipboard 거절이 새 복사 후 legacy fallback을 실행하지 않으며 새 결과/기록 재조회는 오래된 안내를 무효화한다.

제품 파일: `QrScanner.tsx`, `QrBatchScanner.tsx`, `QrCopyRecovery.tsx`, `utils/qrImageBatch.ts`, `utils/qrClipboard.ts`, `utils/qrScanHistory.ts`, `lib/qr/{image,client,protocol,qrImage.worker}.ts`. 번역 조각은 [translations-qr.json](translations-qr.json)이며 공용 원본/생성물은 통합 담당이 병합했다.

## 설치와 번들 근거

승인된 `npm install --save-exact jsqr@1.4.0 --ignore-scripts`를 실행했다. 최초 sandbox DNS ENOTFOUND 후 승인된 네트워크 실행으로 성공했다. 설치 전/후 객체 비교에서 package.json은 jsqr 의존성만 추가됐고 lock 변경 항목은 루트와 `node_modules/jsqr`뿐이다. 기존 package/lock 변경을 보존했다. [설치 비교 기록](install/install-diff.json)에 전/후 package 객체와 lock 변경 항목·integrity를 남겼다.

설치본은 1.4.0, Apache-2.0, 자체 TypeScript 선언, runtime dependencies 없음이다. 배포 main 파일 256,885 bytes, 제품 Worker의 격리 esbuild minify 131,756 bytes/gzip 47,807 bytes를 측정했다. 이 값은 실제 Next production chunk/초기 전송 크기가 아니다. 초기 React/도구 코드에서 jsQR을 직접 import하지 않고 Worker 파일에만 둔다. 원 패키지 라이선스는 `/licenses/jsqr-1.4.0.txt`에 배포 가능하게 복사했다. 설치 출력의 기존 의존성 audit 안내에 대해 범위 밖 업데이트를 실행하지 않았다.

## 작성자 실행 검사: 18그룹

### 순수 경계 + 실제 Worker 픽셀: 7그룹

`node --experimental-strip-types scripts/check-qr-images.ts`

- 개수/바이트/픽셀 정확 경계와 한 칸 초과, resize 면적.
- 네 가지 이미지 header와 잘린/잘못된/과대 header.
- TXT 원문 공백·개행·선택·중복 파일 매핑, http/https 링크 제한, 재시도 분류.
- history 손상/quota/stale/readback 구분.
- **실제 qrcode PNG → PNG 픽셀 → 제품 jsQR Worker 번들**을 Node worker_threads에서 실행해 한글/UTF8 URL을 원문 그대로 복원.
- 흰 이미지 미검출과 잘못된 RGBA buffer 오류.
- 서로 다른 두 QR 이미지에서 둘 중 유효한 하나를 반환. 실제 브라우저 Worker asset 로딩과는 별도 검사다.

복수 QR 실측 한계: 가까운 256px QR 두 개를 나란히 둔 576×288 fixture는 jsQR 미검출이었다. 비대칭 512px/128px QR을 배치한 1024×640 fixture에서는 하나를 읽었다. ‘모든 QR’·위치 순서·복수 QR 이미지의 성공을 보장하지 않으며 잘라 재시도 안내를 제공한다. 이 한계를 숨기고 성공 케이스만 일반화하지 않는다.

### 실제 batch 컴포넌트 + 제어 I/O: 6그룹

`node docs/verify/2026-11-17-repeat-batch21/check-qr-image-ui.cjs`

명시 시작/순차 처리/동명 파일/선택 TXT/저장 없음, 취소 뒤 완료 유지·늦은 응답 차단·실패만 재시도, inactive/reopen 상태 보존, 과다 선택 보존·새 선택 취소, Clipboard 거절+fallback false 수동 복구·위험 scheme 링크 없음, unmount 뒤 다음 파일 시작 차단을 확인했다. 이미지/Clipboard는 제어 포트이며 실제 디코딩 증거는 위 픽셀 검사와 구분한다.

### 실제 Worker client/image/clipboard 코드 + 제어 포트: 5그룹

`node docs/verify/2026-11-17-repeat-batch21/check-qr-image-ports.cjs`

request ID·buffer transfer·success/cancel terminate, timeout/error/messageerror/postMessage 실패의 한 번 완료, native 부재/미지원/생성·실행 실패/미검출의 fallback 1회와 성공 시 Worker 0회, native 대기 중 취소·object URL/캔버스 정리, 부모↔batch 공유 복사 세대의 늦은 fallback 차단을 확인했다.

제품 10파일·TS 검사 1파일·CJS 검사 2파일 scoped ESLint 최종 오류/경고 0. 검사 CJS의 `module` 변수 이름 lint 1건은 `loadedModule`로 바꿔 해당 파일을 재확인했다. Node strip-only parameter property 제한은 Error 클래스의 명시 필드 선언으로 호환되게 정리했다. 제품 동작 결함으로 집계하지 않는다.

## 독립·브라우저 후속

team_rotation의 exported 유틸 취소 검토에서 이미 취소된 요청의 Promise rejection 회수/파일 읽기 시작 경계를 확인했다. `qrImageWait`는 이미 시작된 Promise의 rejection도 회수하고 `readQrImage`는 arrayBuffer 호출 전에 취소를 확인하도록 최소 수정했다. 독립 영향 4경계는 pre-aborted wait, 파일 I/O 0, 진행 중 취소 뒤 late reject, timeout 뒤 late reject 모두 unhandled 0으로 통과했다. 독립 문서의 근거와 구분한다.

verify 담당은 실제 Chrome QR 7/7 통과·종료를 전달했다. 실제 번들 Worker·픽셀·TXT, 한도/혼합실패/취소/재시도/timeout, native Clipboard, 단일 기록·늦은 카메라 tracks, 320px, 부모↔batch 양방향 copy 경합을 포함한다. 해당 보고서의 mock/native 구분을 그대로 따른다. 전체 타입 검사는 통합 담당의 최종 결과로 판정한다.
