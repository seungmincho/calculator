# 이미지 압축 실행기 준비 계약

2026-11-17 KST. [22차 B 계약](plan.md)에 따라 20차 체크포인트 뒤 신규 유틸/검사만 준비한다. `ImageCompressor.tsx`, `imageCompress.ts`, `imageResize.ts`, `imageConvert.ts`의 변경·연결은 21차 체크포인트 신호까지 보류한다.

## 단일 실행기

신규 `imageCompressionQueue.ts`는 화면당 한 인스턴스로 유지한다. `createImageCompressionQueue({ options, process, release, onChange })`는 `add`, `remove`, `clear`, `setOptions`, `pause`, `resume`, `retryFailed`, `getSnapshot`, `dispose`를 제공한다. `process(file, options, signal)`은 기존 압축 함수를 감싼 콜백이며 결과 타입은 기존 출력에 URL을 덧붙일 수 있게 제네릭으로 둔다. `release(result)`는 결과 URL 해제용이다. 파일 원본 미리보기 URL은 기존 화면이 소유한다.

- 설정 key는 기존 품질/목표 용량·포맷·긴 변 조합으로 만든다. 현재 key의 성공은 재사용하고 실패는 명시 `retryFailed`에서만 pending으로 바꾼다. 새 설정의 실패는 새 작업이며 이전 설정 결과는 즉시 무효화/해제한다.
- 실제 진행 Promise와 AbortController를 하나만 보관한다. abort 요청 시 active를 비우지 않으며 **진행 함수의 finally 뒤**에만 다음 pending 작업을 선택한다. 연속 설정 변경/중지 직후 재개도 동시 실행 수를 늘리지 않는다.
- paused 상태는 파일 추가/설정 변경/재시도로 해제하지 않는다. `resume`만 해제한다. 진행 중 중지 요청은 `pausing`, 실제 settle 뒤는 `paused`로 구분한다. 취소된 작업은 pending으로 돌아가며 error 개수에 포함하지 않는다.
- 결과는 같은 항목 객체/설정 세대/취소되지 않은 작업일 때만 채택한다. 삭제 후 같은 ID 재추가도 이전 항목을 복원하지 않는다. 늦게 반환된 결과는 release하고, dispose는 진행 작업을 취소 요청하고 남은 성공 결과를 해제한다.
- snapshot은 항목 목록과 상태를 복사해 제공한다. 실행기를 UI render마다 재생성하지 않으며 React cleanup의 dispose 뒤 새 mount는 새 인스턴스를 만든다.

## 압축 함수의 후속 최소 변경

연결 시 `compressFile(file, options, signal?)`와 `fitToSize(encode, target, { ...기존 옵션, signal? })`에 선택 인자를 추가한다. 기존 두 인자/세 번째 옵션 객체 호출은 그대로 유효하다. `decodeImage`/`encodeImage` 시그니처와 품질·축소 탐색 알고리즘은 유지한다.

신호 검사는 decode 전후, 각 encode 전후, 목표 용량 반복 경계에서 수행한다. 이미 시작한 `createImageBitmap`, `img.decode`, `toBlob` 등을 즉시 종료한다고 표현하지 않는다. decode가 끝난 후 취소를 발견해도 bitmap은 finally에서 닫는다. `imageResize.ts`의 신호 없는 fitToSize 호출은 기존 동작을 유지한다.

## ZIP과 파일명

신규 `imageZipSnapshot.ts`는 클릭 시 현재 설정으로 완료된 항목만 `{ id, name, blob }` 배열로 고정한다. Blob은 불변 객체여서 도중 원본 목록 삭제/설정 변경/URL 해제와 별개로 같은 내용으로 ZIP을 만든다. 생성 콜백과 다운로드 콜백을 받는 작은 실행기는 새 요청/dispose 때 세대를 바꿔 오래된 다운로드·성공/오류 안내를 막는다. ZIP 생성 실패는 현재 요청의 실패로 돌려준다. 진행 중 ZIP 자체를 즉시 취소한다고 설명하지 않는다.

신규 `imageUniqueNames.ts`는 입력 전체 이름을 대소문자 무시 집합으로 먼저 예약한다. 첫 원래 이름은 유지하고 중복 이름의 `(2)`, `(3)` 후보가 예약된 원래 이름 또는 이미 출력한 이름과 겹치면 다음 번호를 찾는다. 따라서 `a.jpg, a.jpg, a (2).jpg`에서도 원래 `a (2).jpg`를 보존한다. 연결 시 기존 `uniqueNames`가 이 함수를 재사용하게 한다. ImageResizer·ImageConverter·PdfTools의 호출 방식은 바꾸지 않는다.

## 검증 경계

제어 가능한 비동기 process로 동시 실행 최대 1, 진행 중 pause/resume, 설정 연속 변경, paused 중 추가/설정/재시도, 실패만 재시도, 성공 재사용, 항목 삭제/전체 삭제/동일 ID 재추가, dispose 뒤 늦은 성공/실패와 release를 검사한다. ZIP은 snapshot 생성 뒤 목록 변경에도 이름/Blob이 유지되는지, 새로운 요청/이탈 뒤 이전 완료가 다운로드되지 않는지 확인한다. 이름은 실제 충돌 재현과 대소문자·확장자 없음·예약된 이름을 검사한다.

이 준비 검사는 실제 픽셀 압축·브라우저 API 취소 경계·추출한 ZIP 검증을 대신하지 않는다. 후속 연결 후 기존 이미지 압축/리사이즈/변환 회귀와 독립·단일 Chrome 검증을 수행한다.

## 준비 결과

- 신규 `imageCompressionQueue.ts`, `imageUniqueNames.ts`, `imageZipSnapshot.ts`, `scripts/check-image-compression-queue.ts` 작성 완료. 기존 부모·공유 이미지 유틸은 변경하지 않았다.
- `node --experimental-strip-types scripts/check-image-compression-queue.ts`: 제어 비동기 13그룹 PASS. 실제 압축 동시 실행 수의 모델은 최대 1이었으며 실패 정책·paused 유지·세대 취소·자원 해제·ZIP Blob 스냅샷·파일명 충돌을 확인했다.
- 신규 4파일 scoped ESLint: exit 0, 오류 0/경고 0.
- 21차 타입 검사와 파일 연결 순서를 위해 TS 편집 중지를 root/통합 담당에게 알렸다. 실제 이미지 및 공유 호출부 회귀는 후속 연결 이후의 검사다.
