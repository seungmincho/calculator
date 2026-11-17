# 22B 이미지 압축 작업 제어 — 구현 준비 완료

2026-11-17 KST. 21차 체크포인트 후 [계약](plan.md)과 [실행기 설계](image-queue-design.md)를 연결했다. 제품 TS는 자체 검사 뒤 고정하고 독립/실제 브라우저 결함 대응을 우선한다.

## 연결과 사용자 동작

- `ImageCompressor`는 화면당 한 queue 인스턴스를 유지한다. 업로드/붙여넣기는 자동 pending 처리이며 현재 설정의 성공을 재사용한다. 같은 설정에 새 파일을 추가해도 기존 error는 자동 재시도하지 않는다. 실패만 재시도 버튼 또는 다른 설정으로의 전환에서 다시 처리한다.
- 일시정지는 진행 작업에 취소를 요청하고 다음 작업을 보류한다. 진행 중인 브라우저 API가 settle하기 전 active 슬롯을 비우지 않아 바로 재개하거나 설정을 연속 변경해도 압축 호출을 겹치지 않는다. 정지 상태에서 추가/설정/재시도는 자동으로 재개하지 않는다.
- `compressFile(file, options, signal?)`, `fitToSize(encode,target,{...options,signal?})`의 선택 취소 인자를 연결했다. decode/encode 전후와 목표 용량 반복에서 확인하며, bitmap close는 finally로 유지한다. 진행 중 API의 즉시 종료를 보장하지 않는다. 기존 신호 없는 호출과 탐색 수치 알고리즘은 유지했다.
- 이전 설정의 결과는 즉시 무효화/URL 해제하고 현재 key가 맞는 완료 결과만 전후 비교·개별/ZIP 다운로드에 사용한다. 행 다운로드 handler도 최신 queue의 ID/key/status를 재검사한다. 삭제한 항목은 늦게 복원되지 않는다.
- queue가 결과 URL을, 화면이 원본 미리보기 URL을 소유한다. unmount 시 두 종류와 ZIP 다운로드 URL/timer를 정리한다. 늦게 반환된 결과 URL은 queue가 release한다.
- ZIP은 클릭 당시 `{name,blob}` 배열로 고정한다. 목록 삭제/설정 변경에도 그 Blob을 사용한다. 만드는 중 ‘현재 완료 결과로 ZIP 다시 만들기’를 누르면 새 세대만 다운로드/오류 안내를 할 수 있다. 실패는 별도 안내하고 unmount 뒤 다운로드하지 않는다.
- 이름 함수는 원래 전체 이름을 먼저 예약한다. 공유 `uniqueNames`를 사용하던 ImageResizer/ImageConverter/PdfTools 호출부는 그대로다. 압축/리사이즈의 출력 suffix는 유지하며 실제 원래 이름과 생성 이름 충돌은 suffix 없는 변환 경로에서도 확인한다.
- 새 제어/행 버튼은 44px, 입력은 16px이며 모바일 행의 동작 버튼은 다음 줄에 배치한다. 새 motion은 reduced-motion 설정을 존중한다. 업로드 50MB 및 기존 포맷/품질/목표 용량/크기 동작은 유지한다.

## 파일 및 선택자

- 부모/공유: `src/components/ImageCompressor.tsx`, `src/utils/imageCompress.ts`.
- 새 실행기/이름/ZIP: `imageCompressionQueue.ts`, `imageUniqueNames.ts`, `imageZipSnapshot.ts`.
- ko/en: `translations-image-queue.json`의 `imageCompressor.queue` 15키와 기존 가이드 4항목. 통합 담당이 원본/생성물에 병합했다.
- 선택자: `[data-image-input]`, `[data-image-queue-controls]`, `[data-image-action="pause|resume|retry|clear"]`, `[data-image-row="id"][data-image-status]`, `[data-image-format="jpeg|png|..."]`, `[data-image-zip]`, `[data-image-download="id"]`, `[data-image-remove="id"]`.

## 자체 검사

| 검사 | 결과 |
| --- | --- |
| `scripts/check-image-compression-queue.ts` | 13그룹 PASS. 동시 최대1/정지/재개/세대/재시도/삭제/동일ID/자원/ZIP스냅샷/이름 예약 |
| `scripts/check-image-compression-abort.ts` | 7그룹 PASS. 이미 취소/진행decode·encode drain/목표반복/기존옵션/공유3소비자 이름/실제 JSZip 바이너리 왕복 |
| `docs/...batch22/check-image-parent.cjs` | 4그룹 PASS. 실제 부모+queue 이벤트 연결, 압축·ZIP I/O 포트 제어 |
| 기존 `check-image-compress`, `check-image-resize`, `check-image-convert`, `check-pdf-tools` | 모두 PASS |
| 제품/도메인검사 7파일 scoped ESLint | exit 0, 오류 0/경고 0 |

부모 fixture는 VM에서 동적 import를 제어 require 포트로 내려 ZIP 대기를 조절한다. 실제 브라우저 chunk 동작을 대신하지 않는다. 취소 검사는 제어 decode/encode 포트이며 실제 픽셀 검증과 구분한다. 실제 JSZip 왕복에서는 파일별 이름과 각 바이너리 내용이 모두 유지되는지 확인했다. 실제 이미지·다운로드 ZIP·320px·공유 도구 브라우저 결과는 verify의 별도 보고서에서 관리한다.

전체 tsc·Chrome·build·commit·deploy는 이 담당자가 실행하지 않았다.

## 독립 취소 경계 보완

독립 검토에서 진행 중 `createImageBitmap`/`OffscreenCanvas.convertToBlob`이 취소 뒤 실패하면 새 HTML decoder/canvas encoder fallback을 시작하는 경계를 재현했다. 최종 결과는 이미 폐기됐지만 불필요한 새 작업을 기다렸다. `decodeImage(file, signal?)`와 `encodeImage(..., signal?)`로 선택 신호를 전달하고 기본 API 뒤/fallback 전에 확인해 보완했다. 취소 뒤 늦게 성공한 bitmap은 닫고 DOM canvas는 finally에서 해제한다. 기존 신호 없는 호출은 유지한다.

- 독립 재현 포트 재실행: decode/encode 모두 AbortError, 새 HTML decode/encode 호출 0, encode의 원본 bitmap close 1.
- 정상 fallback 추가 회귀: signal 생략/active 모두 HTML decode와 DOM encode 성공, 반환 MIME/내용 및 canvas 해제 확인. `check-image-compression-abort.ts --fallback-only` 1그룹 PASS. 기존 7그룹과 합쳐 스크립트 총 8그룹이며 이번에는 영향 그룹만 실행했다.
- 수정한 공유 유틸·검사 2파일 scoped ESLint exit 0, 오류 0/경고 0.
- 독립 담당의 취소 assertion 2그룹 PASS로 독립 총 10그룹. 실제 Chrome 영향 1사례에서도 정상 HTML fallback JPEG 320×240/빨간 픽셀, 취소 뒤 새 fallback 0회, 재개 성공을 확인했다. 브라우저 최종 14/14, JS/hydration 오류 0, Chrome 종료 통지를 받았다.
