# 22차 B 이미지 압축 독립 검토

2026-11-17 KST. 담당 `/root/writing_versions`. 제품 파일은 읽기 전용으로 검토했고, 구현 담당 `/root/team_rotation`에게 재현 조건을 전달한다. Chrome·실제 픽셀 압축·ZIP 다운로드는 별도 브라우저 담당의 검사다.

## 현재 판정

큐/ZIP 독립 5그룹, 실제 부모 이벤트 3그룹, 수정 영향 2그룹으로 총 **10그룹 PASS**. 취소 뒤 대체 디코딩/인코딩 경로에서 새 작업이 시작되는 1건(두 경로)을 발견했고, 담당자의 최소 수정 뒤 해결을 확인했다. 현재 추가 제품 변경 요청은 없다.

## 실행 근거

- `node docs/verify/2026-11-17-repeat-batch22/check-image-independent.cjs --core`: **5그룹 PASS**.
- `node docs/verify/2026-11-17-repeat-batch22/check-image-parent-independent.cjs`: **3그룹 PASS**.
- `node docs/verify/2026-11-17-repeat-batch22/check-image-independent.cjs --reproduce-fallback`: 실제 `compressFile` 호출에서 두 취소 경계 재현.
- 수정 후 `node docs/verify/2026-11-17-repeat-batch22/check-image-independent.cjs --fallback`: **2개 영향 그룹 PASS**. 기존 8그룹은 무관 변경 없이 재반복하지 않았다.
- 독립 CJS 검사 2파일 scoped ESLint: 오류 0/경고 0. 영향 실행 옵션 추가 뒤 변경된 검사 파일도 lint exit 0.

첫 검사는 실제 queue/ZIP/uniqueNames 유틸을 사용하며 Promise 완료 순서와 cleanup을 제어한다. 두 번째 검사는 실제 `ImageCompressor` 및 큐를 번들하여 렌더·이벤트를 실행한다. 작성자의 부모 fixture에서 압축/ZIP/URL 포트 설정만 읽기 전용 재사용하고, 작성자의 기존 테스트와 별개인 세 시나리오를 검사한다. 실제 React DOM·StrictMode 또는 픽셀 코덱을 실행한 검사로 계산하지 않는다.

### 통과한 추가 경계

1. 처리 상태 `onChange`에서 동기 pause/remove/clear/dispose를 호출해도 무효 작업은 시작하지 않는다.
2. 삭제 뒤 같은 ID로 추가된 항목은 이전 작업의 늦은 실패를 물려받지 않는다. `release`가 throw해도 정리 및 다음 실행이 진행되고 중첩 최대치는 1이다.
3. 중복 ID를 포함한 일괄 add는 일부 항목만 추가하지 않는다. 성공 Blob은 같은 설정 추가/재시도에서 유지하며, 실패 재시도도 pause를 풀지 않는다.
4. 예약 이름을 섞은 120개 목록에서 대소문자 무시 고유성을 유지하고 각 원래 이름의 첫 등장을 보존한다.
5. ZIP은 현재 key의 완료 Blob만 포함한다. 바이트 `[0,255,17]`를 유지하며 동기 다운로드 실패도 안내 상태가 되고 재시도할 수 있다. 빈 새 요청은 이전 늦은 실패를 무효화한다.
6. 부모의 이전 다운로드/ZIP callback을 설정 변경 뒤 직접 호출해도 이전 파일을 다운로드하지 않는다. 새 완료물은 현재 Blob으로 다운로드한다.
7. 부모 unmount에서 원본 미리보기·완료 출력 URL을 각각 한 번 해제한다. 뒤늦게 만든 출력 URL도 한 번 해제하고 오래된 ZIP은 다운로드하지 않는다.
8. ZIP 시작 뒤 설정 변경·pause·clear를 해도 클릭 시점 이름/Blob 3개를 보존한다. 이후 이전 압축 실패는 삭제된 행을 복원하지 않는다.

## 발견 및 해결: 취소 뒤 새 fallback API 시작

`imageCompress.ts`의 `compressFile`은 decode/encode 외부 경계에서 신호를 확인하지만 `decodeImage`와 `encodeImage` 내부의 대체 API 진입 전에는 확인하지 않았다.

- `createImageBitmap` 대기 중 abort → 해당 Promise reject → **새 `HTMLImageElement.decode()` 1회** → 최종 `AbortError`.
- `OffscreenCanvas.convertToBlob` 대기 중 abort → 해당 Promise reject → **새 HTML canvas `toBlob()` 1회** → 최종 `AbortError`.

큐는 기존 작업을 drain하므로 중첩이나 잘못된 결과 채택은 발생하지 않는다. 다만 이미 취소한 작업이 새 디코더/인코더를 시작하여 정지 완료 및 다음 작업이 불필요하게 지연된다. 이미 진행 중인 브라우저 API를 강제 중단하라는 요청이 아니라, 실패한 API 다음의 새 작업 진입을 막는 최소 보완이다. 기존 호출을 보존하는 optional signal 전파와 fallback 직전 확인을 담당자에게 요청했다.

담당자가 `decodeImage(file, signal?)`, `encodeImage(..., signal?)`에 선택 인자를 추가하고 `compressFile`에서 전달했다. API 진입 및 기본 API 완료 뒤 신호를 확인하므로 취소된 실패는 fallback에 진입하지 않는다. 취소 뒤 반환된 bitmap은 닫고, HTML canvas는 finally에서 크기를 비운다. 기존 신호 없는 호출 형식과 품질/용량 탐색은 유지했다.

수정된 실제 유틸을 같은 순서로 재실행한 결과 두 경우 모두 `AbortError`이며 **HTML decode 0회·HTML encode 0회**, 인코딩 사례의 bitmap close는 **1회**였다. 별도 `--fallback` 옵션은 이 두 assert만 실행한다. 정상 HTML fallback 및 명시 resume의 실제 이미지 검사는 브라우저 담당에게 영향 시나리오로 전달했다.

## 범위와 한계

기존 품질·용량 탐색 산식, 공유 호출부의 기존 도메인 전체 검사는 작성자의 근거와 구분한다. 여기서는 새 실행기와 취소/스냅샷 경계에 집중했다. 새 deps·제품 수정·전체 타입 검사·빌드·배포·git 작업은 하지 않았다. 실제 브라우저 취소와 코덱·JSZip 산출물은 `review-browser.md`의 증거를 참조한다.
