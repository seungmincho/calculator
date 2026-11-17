# 57차 OCR — 편집 원고 보호와 대기열 제어

작성자 부모 연결 완료·TS 편집 중지. 준비6+실제 부모8 = **작성자14그룹 PASS**, 기존 `check-ocr.ts` 회귀 PASS. 최종 제품/검사6파일 ESLint exit0, 오류0·경고0. 독립 준비12그룹은 별도이며 실제 부모 독립과 native는 지정 담당이 이어 확인한다. 모델 다운로드·실제 OCR 실행·개인 사진·Chrome·전체 타입·build·배포는 작성자가 실행하지 않았다.

## 최종 동작

- 파일 업로드의 기존 자동 인식을 유지한다. 일시정지는 현재 파일을 마친 뒤 다음 파일을 보류한다. 일시정지 중 업로드·실패 재시도도 자동 재개하지 않는다. 실패 재시도는 클릭 당시 오류 ID만 pending으로 돌린다.
- 마지막 성공 원고는 pending/running/error에도 남는다. 화면 textarea·개별/전체 복사·TXT·TTS 전달은 동일한 `textOf`를 사용하며 이전 결과임을 표시한다. 실패는 이전 성공/편집을 바꾸지 않는다.
- 편집 원고를 교체하는 재인식·정리 옵션·전체 초기화는 확인/취소를 거친다. 확인 대기 중 큐/원고 변경은 오래된 확인을 거부한다. 재인식 승인 후 추가 편집(ABA 포함)은 editRevision으로 보존한다. 새 OCR 빈 문자열도 실제 성공으로 저장하고, 편집 보존 여부를 구분해 안내한다.
- 언어/보정/회전은 job 시작 당시 snapshot을 사용한다. 현재 설정과 결과 설정이 다르면 재인식 안내를 표시한다. 다음 pending 파일은 시작 시점 설정을 사용한다. 좌표 overlay는 기존 이미지/보정 key가 일치할 때만 표시한다.
- reset/remove/unmount 뒤 늦은 생성·인식·진행률·실패·preview 완료는 현재 원고에 적용되지 않는다. create 미완료는 실제 반환 후 terminate까지 새 생성을 보류한다. recognize/reinitialize 취소는 논리 결과를 즉시 풀지만 terminate 완료까지 물리 worker 소유권을 유지한다.

## 변경 파일과 API

- `src/utils/ocrQueue.ts`: 순수 상태 전이/확인/편집 revision/성공 snapshot. File 참조를 유지하고 bytes를 복제하지 않는다.
- `src/lib/ocr/workerSession.ts`: `createOcrWorkerSession`의 `run/cancelAll/dispose/drain`. create 포트는 `(langs, logger, isCurrent)`이며 마지막 콜백으로 dynamic import 완료 후 취소된 경우 실제 createWorker 시작도 차단한다.
- `src/components/ImageOcr.tsx`: 기존 UI와 위 helper 연결. 실제 어댑터는 `createWorker(langs, 1, {logger,errorHandler})`, `reinitialize(langs, undefined, undefined, jobId)`, `recognize(canvas, {}, {text:true,blocks:true}, jobId)`. 설치6.0.1은 job reject 뒤 errorHandler 없으면 전역 throw도 하므로, Promise 실패는 세션이 처리하고 errorHandler는 중복 throw만 막는다.
- `scripts/check-ocr-queue.ts`, `ocr-parent-harness.mjs`, `check-ocr-parent.mjs`: 합성 포트와 실제 부모 검사.
- `translations-ocr.json`: KO/EN `imageOcr.jobs` 조각. canonical/메타는 공용 담당 소유다.

새 storage/schema/파일 개수·크기 정책을 추가하지 않았다. `ocr.ts` 전후처리와 기존 textHandoff key/schema는 수정하지 않았다. 복사 실패 복구는58 root 소유이며,57은 기존 `copyToClipboard` 동작을 바꾸지 않았다.

## 테스트 근거

```text
node scripts/check-ocr-queue.ts
node docs/verify/2026-11-17-repeat-batch57/check-ocr-parent.mjs
node scripts/check-ocr.ts
npx eslint src/components/ImageOcr.tsx src/utils/ocrQueue.ts src/lib/ocr/workerSession.ts scripts/check-ocr-queue.ts docs/verify/2026-11-17-repeat-batch57/ocr-parent-harness.mjs docs/verify/2026-11-17-repeat-batch57/check-ocr-parent.mjs
```

부모8그룹은 자동 순차 인식·pause/계속·같은 원고 반출, 재인식 확인/취소/ABA/빈 성공, 정리·reset 확인, 실패만 재시도, pending create reset/unmount, 미해결 recognize 삭제·terminate barrier·옛 logger, 언어 reinitialize 취소/정확 인수, preview 역순 toBlob/decode 실패를 확인했다. 첫 부모 실행의 VM 객체 deepStrictEqual은 realm prototype 차이로 실패했으며 JSON 표현을 비교하도록 검사만 수정했다. 이후8그룹 PASS다. 기존 before-fix JSON과 원본 baseline probe는 덮어쓰지 않았다.

## 독립/native 연결 정보

`ocr-parent-harness.mjs`는 공용19 host를 로컬 wrapper에서 dynamic-import만 모의 처리하며 공용 host를 수정하지 않는다. `componentHarness`, `fixture`, `deferred`, `result`를 export한다. 작성자 assertions는 별도 check 파일에만 있다. 포트는 create/recognize/reinitialize/terminate/decoded/previews/logger·URL revoke/Clipboard/download/TTS route를 노출한다. 실제 모델·개인 이미지는 사용하지 않는다.

안정 selector:

- `data-ocr-root`, `data-ocr-paused`, `data-ocr-running`
- `data-ocr-upload`, `data-ocr-select={id}`, `data-ocr-status`, `data-ocr-remove={id}`
- `data-ocr-pause`, `data-ocr-retry-failed`, `data-ocr-rerun="active|all"`, `data-ocr-reset`
- `data-ocr-language={code}`, `data-ocr-prep={off|gray|binary}`, `data-ocr-clean={fixKoreanSpaces|joinLines}`, `data-ocr-rotate="left|right"`
- `data-ocr-confirmation={rerun|cleanup|reset}`, `data-ocr-confirm`, `data-ocr-confirm-cancel`, `data-ocr-confirm-changed`
- `data-ocr-text`, `data-ocr-previous`, `data-ocr-result-notice`, `data-ocr-settings-changed`, `data-ocr-preview`

58 연결점은 `queueRef.current.revision`(모든 큐/원고 변경), `activeId`, `selectedLangs`, `mode`, `clean`, `textOf(item)`, `doneItems`(success 존재 기준), `allText`이다. 현재원고/선택/언어의 출력 owner는58이 맡는다.

## 범위와 한계

pause는 모델 실행 중단이 아니라 다음 파일 시작 보류다. 이미 시작한 browser decode/toBlob 및 모델 생성의 강제 취소를 보장하지 않는다. create가 영원히 settle하지 않으면 같은 session의 새 create도 기다린다. terminate 자체가 실패하면 중복 worker를 피하려고 해당 session은 새 worker 생성을 차단한다. remount 간 전역 worker gate는 이번 계약에 없다. 인식률/모델 성능 또는 실제 브라우저 검증을 모의 검사로 대체했다고 주장하지 않는다.
