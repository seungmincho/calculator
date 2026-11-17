# 21B QR 일괄 이미지 독립 읽기·취소 영향 검토

담당: team_rotation. 제품·의존성·공용 번역은 수정하지 않았다. Chrome/전체 tsc/build 없이 21차 계약과 실제 부모/배치/Worker/이미지 처리/복사/이력 경로를 읽고 취소 경계만 독립 실행했다.

## 확인한 구조

- `QrBatchScanner`는 명시 선택 뒤 시작 버튼을 눌러야 읽으며 for/await로 한 파일씩 진행한다. 같은 이름도 별도 ID로 구분한다. 새 선택/취소/active 해제/unmount가 세대와 AbortSignal을 무효화해 늦은 결과가 목록을 덮지 않는다. 성공/선택 상태를 유지한 실패 재시도이며 신규 batch 결과를 기존 history에 자동 저장하지 않는다.
- 개수/합계 제한은 선택 전체를 교체하기 전에 검사한다. 파일당 바이트·PNG/JPEG/WebP/GIF 헤더 픽셀을 확인한 후 디코딩하고 실제 natural size도 확인한다. 2048 긴 변 처리와 20초/3초/10초 경계를 둔다. timeout은 네이티브 계산 자체의 강제 종료를 보장하지 않는다.
- 네이티브 지원 확인/생성/읽기/미검출에서 Worker 한 번으로 전환한다. Worker의 jsQR import는 Worker 파일에만 있고 본문·React·번역을 가져오지 않는다. request ID/크기/버퍼 검증, 단일 응답 확정, terminate 및 handler/timer 정리 경로가 있다.
- 새 batch 링크는 http/https만 명시 클릭으로 열며 내용은 JSX 텍스트다. 선택 TXT는 파일 순서와 payload 원문을 유지하고 파일명 헤더의 제어문자만 정리한다. 복사는 Clipboard 또는 실제 execCommand(true) 뒤에만 성공으로 표시하고 오래된 fallback을 막는다.
- 기존 카메라/단일 이미지 경로는 유지되며 늦은 permission·FileReader/detect 결과에 세대 검사가 추가됐다. 기존 history는 손상 데이터를 자동 삭제하지 않고 CAS/readback/Web Locks를 사용한다. 새 batch와 history 쓰기가 연결되지 않음을 확인했다.

위 항목은 코드 읽기 결과이며 실제 브라우저 디코딩·카메라 실행 결과로 집계하지 않는다. QR의 실제 픽셀·Worker 청크·모바일·TXT는 담당자의 별도 검증 범위다.

## 발견 및 수정된 취소 계약 경계

수정 전 실제 `src/lib/qr/image.ts`를 esbuild로 메모리에 로드해 다음을 재현했다.

1. 이미 aborted인 신호로 `qrImageWait(startedPromise, signal, ...)`를 호출하면 반환은 취소되지만 원래 Promise에 handler를 붙이지 않아 나중의 reject가 unhandled rejection이 됐다.
2. 이미 aborted인 신호로 `readQrImage`를 호출하면 `file.arrayBuffer()`를 먼저 한 번 실행하고, 뒤이어 `remaining()`에서 취소했다. 시작된 읽기의 reject도 회수되지 않았다.

실행: `node docs/verify/2026-11-17-repeat-batch21/check-qr-cancellation-independent.cjs --reproduce`. 수정 전 증거는 `qr-cancel-before-fix.json`에 보존했다. 각각 `late-started-rejection`, `arrayBufferCalls: 1`, `late-file-rejection`을 확인했다.

부모는 `current()` 확인 뒤 readQrImage에 동기 진입하며 중간 await가 없다. 따라서 위 사전 취소 경계를 일반 사용자 클릭으로 재현했다고 주장하지 않는다. 이미 시작된 Promise를 받는 exported 유틸과 취소된 읽기의 API 계약 결함으로 구분했다.

제품 담당은 already-aborted 분기에서 원 Promise rejection을 회수하고, readQrImage는 arrayBuffer 호출 전에 최초 remaining/취소 검사를 하도록 최소 보완했다. 독립 영향 검사 결과:

- pre-aborted wait: 늦은 rejection을 회수함.
- pre-aborted image read: arrayBuffer 0회, 늦은 읽기 시작 없음.
- 진행 중 취소: 취소 반환 뒤 원 Promise의 reject를 회수함.
- 시간 초과: timeout 반환 뒤 원 Promise의 reject를 회수함.

`node docs/verify/2026-11-17-repeat-batch21/check-qr-cancellation-independent.cjs`: **4경계 PASS**, unhandled rejection 0. 성공 픽셀 디코딩 전체는 반복하지 않았다. 현재 추가 수정이 필요한 결함은 발견하지 않았다.

## 최신 부모↔일괄 결과 복사 세대 보완

브라우저 담당이 확인하고 제품 담당이 보완한 공유 복사 세대도 독립 확인했다. `copyQrText` 한 모듈 인스턴스를 실제 `QrScanner`와 실제 `QrBatchScanner` 양쪽에 연결하고, Clipboard·DOM fallback 포트만 제어했다.

`node docs/verify/2026-11-17-repeat-batch21/check-qr-copy-independent.cjs`: **3그룹 PASS**.

1. batch 복사 대기 → 부모 history 복사 거절/수동 복구 표시 → 이전 batch 거절: 현재 부모 복구 텍스트 유지, 이전 batch의 복구 UI와 legacy copy 없음.
2. 부모 history 복사 대기 → batch 복사 거절/수동 복구 표시 → 이전 부모 거절: 현재 batch 복구 텍스트 유지, 이전 부모의 복구 UI와 legacy copy 없음.
3. 두 영역 복사 요청 뒤 최신 성공 → 이전 성공: 최신 영역만 성공 표시하며 이전 UI 성공과 legacy copy를 만들지 않음.

두 요청 모두 이미 `navigator.clipboard.writeText`에 제출된 사실은 검사에서 별도로 확인했다. OS에 제출한 복사 자체를 취소하거나 최종 OS clipboard 순서를 되돌린다고 주장하지 않는다. 이번 보호는 늦은 안내/복구 텍스트와 후속 legacy copy가 최신 작업을 덮지 않도록 하는 것이다.

QR 독립 결과는 취소 **4경계 + 공유 복사 3그룹**이다. 제품 TS 편집·미해결 결함이 없음을 root/통합 담당에게 통지했다.
