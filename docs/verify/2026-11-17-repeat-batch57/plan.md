# 57차 후보 — OCR 편집 원고 보호와 인식 대기열 제어

상태: 부모 연결 완료·작성자14/lint0·TS 동결. 같은 ImageOcr의58 출력 연결 뒤 공용/native/최종 타입을 검증한다.

## 현재 확인한 사실

`before-fix.json`에는 제품 `ImageOcr.tsx` SHA `f5bbcd6a74d8d225a31b950c7fdb5daada39f76c59b7aebf00e412e0328a3b54`와 ocr/textHandoff/설치패키지 소스 SHA, 정상1+문제4 관측을 보존했다. `probe-ocr-baseline.mjs --record`는 기존 파일이 있으면 덮어쓰기를 거부한다.

- 정상: 합성 이미지2개를 올리면 자동 큐가1개 worker로 순차 인식했다. `{text:true,blocks:true}` 요청, blocks→paragraphs→lines→words의 낮은 신뢰도 단어, 한글 공백·하이픈 줄바꿈 정리, 사용자 편집, 전체copy/TXT, 기존 OCR→TTS handoff가 유지됨을 실제 부모에서 확인했다.
- 명시 `다시 인식`은 편집한 원고를 pending 동안 UI에서 숨기고, 성공 시 새 OCR 문자열로 바꿨다. 별도의 편집 교체 확인이 없다.
- 정리 옵션 `joinLines` 변경은 모든 item의 edited를 null로 바꾸며 현재 편집 원고가 바로 원래 raw 기반 텍스트로 돌아갔다. 기존 코드에 의도된 주석이 있으므로 옵션 기능 자체를 없애지 않고 **확인/취소**를 추가할 정책 문제다.
- createWorker 대기 중 unmount 후 늦은 worker를 반환하면 terminate0·recognize1이었다. 실제 모델은 실행하지 않았지만 실제 부모의 await 연쇄가 뒤늦은 worker를 획득하고 호출하는 것은 재현했다.
- reset 뒤에도 생성 중이던 worker가 완료되면 old recognize1이 실행됐다. items가 비어서 old 텍스트가 화면에 재등장하지는 않았다. 이를 원고 재등장 결함이라고 확대하지 않는다.
- 별도 `copy-before-fix.json`: API reject와 API 없음+execCommand false 두 경로 모두 copied 안내를 표시했다. 58 후보에서 해결하고57에서는 출력 내용을 바꾸는 수정과 섞지 않는다.

검사는 실제 컴포넌트를 번들하고 Worker/Canvas/Image/Clipboard 포트만 합성했다. 모델 다운로드0, 개인 사진0, Chrome0이다. 최초 fixture의 createElement 메서드 닫는 중괄호가 빠져 구문 오류가 났으나 제품 실행 전에 fixture만 고쳤다. baseline 파일은 성공 관측 후 한 번 생성했다.

## 설치 패키지/API 근거

로컬 `node_modules/tesseract.js/package.json`은 **6.0.1**이다. 원격 최신 버전이라고 주장하지 않는다. 추가 모델이나 패키지를 받지 않고 다음 설치 문서를 읽었다.

- `docs/api.md` recognize 절: 기본 반환은 text이며 blocks는 output 옵션으로 요청한다. 빈 페이지는 빈 문자열/words를 반환하는 정상 결과이지 예외가 아니다.
- `src/index.d.ts`: `createWorker`/`reinitialize`/`recognize`/`terminate`는 Promise API다. Worker에 pause/resume 또는 AbortSignal API는 없다. `Page.blocks`는 null 가능, word bbox는 blocks 아래에 있다.
- `src/createWorker.js`: createWorker는 load→language→initialize 뒤 worker를 반환한다. reinitialize는 언어 로딩과 initialize를 수행한다. terminate는 실제 worker를 종료하지만 기존 recognize Promise를 모두 reject한다고 보장하는 코드는 아니다.
- `src/worker/browser/loadImage.js`: recognize(canvas) 내부에는 canvas.toBlob와 FileReader await도 있다. terminate가 호출됐다는 이유만으로 이 모든 비동기가 즉시 종료됐다고 가정하지 않는다.

따라서 일시정지는 **현재 파일 완료 후 다음 파일을 시작하지 않는 큐 정책**이다. 진행 중 OCR 모델 실행을 정지/다시 시작하는 기능이라고 표시하지 않는다. reset/unmount는 UI 세대와 worker 소유권을 즉시 무효화하고 공개 API로 보유 worker를 종료하지만, 뒤늦게 끝나는 준비·decoder·모델 생성은 개별 소유권 검사와 cleanup으로 처리한다.

## 사용자 정책 제안

### 편집 원고와 이전 성공 결과

1. 작업 상태와 마지막 성공 원고를 분리한다. 재인식 pending/running/error여도 이전 성공 텍스트와 사용자의 edited를 화면에 남기고 편집/copy/TXT/handoff에 그대로 사용한다. 해당 파일의 작업 배지와 ‘이전 결과 표시 중’ 안내를 함께 둔다. 실패 시 마지막 성공을0/빈 문자열로 바꾸지 않는다.
2. 개별/전체 재인식에서 **현재 edited가 있는 대상**을 새 결과로 교체하려면 확인한다. 확인에는 대상 개수/현재 설정 사용/작업 실패 시 이전 원고 유지가 명시된다. 취소는 큐·원고·설정을 바꾸지 않는다. 편집 없는 대상의 명시 재인식은 바로 가능하다.
3. 확인을 통과해도 작업 중 새 편집은 보호한다. job은 item ID·source revision·edit revision·이미지 회전/prep·언어를 캡처한다. 새 OCR 성공은 해당 item/job이 현재일 때 raw/words/conf/key를 갱신하되, **교체를 승인한 edit revision이 아직 같을 때만** edited를 해제한다. 그 사이 사용자가 수정했으면 최신 edited를 유지하고 ‘새 인식은 완료됐으며 편집 원고는 유지’ 안내를 한다. 저장 이력이나 임의 원고 버전 시스템을 추가하지 않는다.
4. 실패만 재시도는 실패한 작업 ID만 클릭 시 캡처해 다시 pending으로 만든다. 정상 완료 항목·다른 편집 원고를 다시 인식하지 않는다. 실패 항목에 이전 편집 원고가 있으면 기본적으로 편집을 유지하며, 이를 교체하는 작업은 위 명시 재인식 확인을 이용한다.
5. 정리 옵션은 현재 원래 기능(모든 인식 raw에서 새로 정리)을 유지한다. edited가 하나라도 있으면 변경될 개수와 ‘편집을 초기화하고 정리’ 확인을 먼저 보인다. 취소는 checkbox와 원고 모두 기존 값으로 유지한다. 확인 대기 중 편집/대상 목록이 바뀌면 이전 확인을 무효화해 다시 확인해야 한다. edited가 없으면 옵션 즉시 적용한다.

성공 snapshot의 존재는 raw 문자열의 truthiness와 분리한다. 새 OCR가 성공했으나 빈 text이면 실패로 돌리지 않으며, 교체가 허용된 경우 ‘텍스트를 찾지 못한 새 결과’로 표시한다. 이전 성공분을 새 성공처럼 재사용하지 않는다. 작업 중 추가한 edited가 남아 있는 경우에는 ‘새 인식에 텍스트가 없지만 편집 원고 유지’로 구분한다. pending/error의 이전 원고를 볼 때 textarea·개별복사·전체 TXT·TTS도 화면에서 보이는 동일 `textOf`를 사용하며 ‘이전 결과 표시 중’ 배지가 그 대상에 붙는다.

### 이미지·설정과 큐

- 업로드는 기존 자동 큐를 유지한다. `일시정지`를 누르면 이미 시작한 현재 파일은 마무리하고 다음 pending을 보류한다. 진행 중에는 ‘현재 파일을 마친 뒤 일시정지’, 이후에는 ‘일시정지됨’과 `계속`을 구분한다. 정지 상태에서 추가 파일은 pending으로 쌓이며 자동 재개하지 않는다.
- `계속`은 원래 순서대로 pending만 시작한다. 실패만 재시도는 paused 상태에서는 선택한 오류 항목을 pending으로 바꾸되 **paused는 유지**하고 계속 버튼으로 시작한다. 다른 일반 pending도 함께 계속될 수 있음을 숨기지 않는다. 전용 retry가 정상 항목을 새로 pending으로 바꾸지는 않는다.
- 언어·회전·prep 변경은 기존 안내대로 완료 결과를 자동 재인식하지 않는다. 진행 중 job은 시작 당시 설정 snapshot을 사용한다. 오래된 설정 결과가 새 설정의 결과처럼 보이지 않도록 완료 메타에 캡처 설정/현재와 다름을 표시하고 명시 재인식으로 갱신한다. 대기 중인 다음 파일은 시작 시점의 설정을 사용한다. OCR 좌표 overlay는 기존 source/prep key가 맞을 때만 표시한다.
- reset/파일 제거는 대상 source/job 세대를 무효화한다. 삭제된 파일의 늦은 결과·진행률·오류가 새 파일이나 전역 상태에 붙지 않는다. 삭제한 ID를 재사용하지 않는다. active 선택 자체는 다른 파일의 유효 진행을 취소하지 않는다.
- reset은 이미지와 그 원고를 비우는 기존 명시 행동이다. edited가 있는 경우 삭제 확인을 적용하는 최소 보완을 제안한다. 취소는 진행/원고 유지, 확정 뒤 늦은 결과는 무효다. 전체 파일 정책·최대 장수/크기·스토리지/schema·서버는 새로 추가하지 않는다.

## 구현 분해 제안 (미착수)

- `src/utils/ocrQueue.ts`: 파일/job/source/edit revision과 pause/continue/retry IDs, 결과 merge의 순수 상태 전이. 원본 File/URL은 복제하지 않고 현재 Item의 참조를 유지한다. words 수집은 기존 v6 경로 그대로다.
- `src/lib/ocr/workerSession.ts` 또는 같은 도구 전용 작은 helper: create/reinitialize/recognize/logger의 세대·worker 소유권을 관리한다. 기존1 worker 재사용을 유지한다. 중복 getWorker 생성과 같은 worker의 reinitialize/recognize 중첩을 금지한다.
- `ImageOcr.tsx`: 기존 파일추가·preview·편집·원고 반출을 helper에 연결하고 pause/continue/retry 실패 버튼과 destructive 확인/이전 결과 배지를 추가한다. 필요 시 작은 `OcrQueueControls.tsx`만 분리하며 새 route는 없다.

### 비동기 소유권과 정리

- 각 await 뒤에 page lifetime·job ID·source revision을 확인한다. 유효성을 잃은 createWorker 반환값은 반드시 terminate하고 인식에 넘기지 않는다. 오래된 reinitialize 완료가 새 worker.languages를 바꾸거나 recognize를 시작하지 못한다.
- reset/unmount 때 보유 worker를 종료하고 작업은 명시 취소 신호로 논리적으로 settle한다. recognize Promise가 terminate 뒤 영원히 pending이어도 UI의 runningRef 하나에 갇히지 않게 한다. 새 worker가 old slot을 덮어쓰지 않으며 cleanup은 자신이 획득한 worker만 종료한다.
- 아직 반환하지 않은 createWorker에는 공개 취소 API가 없다. **같은 controller에서 새 create를 중첩하지 않고 이전 생성의 실제 settle/반환 후 terminate까지 기다리는 안**을 기본으로 한다. 무기한 생성에 대한 모델 네트워크/timeout 정책은 이번에 임의 추가하지 않는다. reset 후 새 파일이 이 정리를 기다리는 경우 상태를 명시한다. 페이지 remount 간 공용 worker/gate 새 아키텍처는 요구하지 않는다.
- logger는 현재 job과 연결된 경우만 진행을 갱신한다. pause 시 현재 job logger는 유효하나 reset/remove/unmount 이후에는 무효다. 성공/실패 semantic 결과와 진행률/상태 문구의 뷰 업데이트를 분리한다.
- preview는 별도 source/prep generation으로 성공뿐 아니라 catch와 toBlob 완료도 검사한다. 이전 decode 실패가 새 prepared preview를 지우지 않도록 한다. 임시URL/캔버스/worker 정리는 각 소유 작업이 담당한다. 이미 시작한 브라우저 decode/toBlob을 강제로 취소했다고 표현하지 않는다.

## 58 복사 연계 메모

57에서 copy API/clipboard fallback/복구 UI를 반쯤 바꾸지 않는다. 기존 `copyToClipboard`의 거짓 성공은 실제 probe2건으로 별도58 후보다. root가 준비한58은57 최종 부모 뒤 연결한다.

57이 노출할 최소 연결 정보는 item별 `editRevision`/`sourceRevision` 및 최종 보이는 `textOf(item)`, activeId, 완료/이전성공 항목의 순서다. 58은 active/all copy, TXT, handoff에 필요할 때 현재 출력 snapshot을 캡처하고 현재 locale/선택/원고 변화에서 토큰을 무효화할 수 있다. 57에서 새로운 shared clipboard API를 강제하거나 기존 handoff key/schema를 바꾸지 않는다.

## 구현 승인 후 검증

1. 기존 `scripts/check-ocr.ts`와 정상2파일·v6 blocks·원고정리/overlay/회전/편집·전체copy/TXT/handoff 회귀.
2. pause 현재완료→다음시작0, 계속, paused 중 업로드/실패재시도 대상 IDs, 정상 결과·편집 보존.
3. create/reinit/recognize 각각 reset/remove/unmount/StrictMode, 역순 완료·늦은 logger, terminate가 recognize를 settle하지 않는 port, 초기 create 미완료 슬롯 정책.
4. 재인식/정리/reset 확인·취소, 확인 뒤 추가편집/작업중편집 revision, 새 OCR 실패/빈페이지 정상 결과, 이전 성공 반출 유지.
5. preview old decode/toBlob/failure 역순과 임시URL 정리, 새 파일이름/원고에 옛 결과가 붙지 않음.
6. 독립 actual parent + native에서 합성 이미지와 제어 Worker만 사용해 모바일44px/16px·KO/EN/선택/편집 흐름을 확인한다. 모델 정확도나 실제 OCR 실행 성능/인식률을 재인증하지 않는다.

읽기/baseline 명령:

```text
node docs/verify/2026-11-17-repeat-batch57/probe-ocr-baseline.mjs
node docs/verify/2026-11-17-repeat-batch57/probe-ocr-copy-candidate.mjs
npx eslint docs/verify/2026-11-17-repeat-batch57/ocr-baseline-harness.mjs docs/verify/2026-11-17-repeat-batch57/probe-ocr-baseline.mjs docs/verify/2026-11-17-repeat-batch57/probe-ocr-copy-candidate.mjs
```

현재 기록5관측+복사후보2관측, MJS3파일 lint exit0/경고0. 기록은 재현 횟수/성능 측정이 아닌 동작 경계 관측이다. 전체 타입/build/Chrome/모델 다운로드/제품 변경은 하지 않았다.
