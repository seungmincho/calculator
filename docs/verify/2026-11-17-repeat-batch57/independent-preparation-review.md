# 57차 OCR helper 독립 준비 검토

2026-11-17. **미연결 helper 독립 검토 12그룹 PASS**다. `ocrQueue.ts`·설치 Tesseract API 6그룹과 작성 담당의 안정 신호 뒤 `workerSession.ts` 6그룹을 검증했다. `ImageOcr.tsx` 부모 연결·native 모델·브라우저·전체 타입 통과를 주장하지 않는다. 제품 파일은 수정하지 않았다.

## 독립 6그룹 — 첫 실행 PASS

명령: `node docs/verify/2026-11-17-repeat-batch57/check-ocr-independent.mjs`. 작성자 검사 assertion과 공유 host를 재사용하지 않은 별도 순수 기대값/VM 포트다.

1. **실제 설치 API**: `node_modules/tesseract.js/package.json` 6.0.1, 실제 `src/createWorker.js`를 VM에 로드하고 worker 송수신/loadImage 포트만 합성했다. 생성 load→loadLanguage→initialize 순서, recognize `{text:true,blocks:true}`, 빈 text와 null blocks 성공, 진행 중 recognize를 둔 terminate 완료와 그 Promise 미해결, 중복 terminate 실제 종료1회를 확인했다. 모델·개인사진·네트워크는 사용하지 않았다. 미해결 Promise를 await하지 않고 정해진 microtask 진행 후 상태를 관찰한다.
2. **편집 승인과 새 편집**: raw 빈값/기존값×edited null/빈값/원고×승인 이후 변경 없음/변경/같은값 왕복×새 raw 빈값/기존값의 36조합을 독립 기대값과 대조했다. 승인 당시 revision이 같을 때만 편집을 교체하고 새 편집(빈 원고 포함)은 유지한다. 결과 words 외부변경이 snapshot을 바꾸지 않는다.
3. **이전 원고와 빈 성공**: pending/running/error에서 같은 visible draft/전체 원고를 유지한다. 빈 raw 성공은 존재하는 성공이며 승인된 이전 원고를 실제 빈값으로 바꾼다. truthiness로 이전 성공을 되살리지 않는다.
4. **일시정지/재시도**: 시작한 파일만 완료하고 다음 pending은 시작하지 않는다. 실패 retry는 실패만 pending으로 바꾸며 paused를 유지한다. 명시 계속 이후 원래 순서대로 실패 재시도와 일반 pending을 처리한다.
5. **확인/취소/오래된 확인**: prepare만으로 원고/설정이 바뀌지 않는다. 편집 A→B→A와 다른 job 완료가 cleanup/reset/rerun 확인을 무효화한다. 최신 확인만 해당 동작을 적용한다.
6. **삭제/reset/설정 snapshot**: 삭제/새 epoch의 이전 job 완료는 상태를 바꾸지 않는다. 회전 변경 중 이전 job은 시작 당시 설정을 기록하며 현재 회전과 분리한다.

설치 문서 `docs/api.md` recognize 절(기본 text/명시 blocks/빈 페이지 정상)과 `src/index.d.ts` Promise API·`Page.blocks|null`, `src/createWorker.js`의 terminate/startJob 동작을 대조했다. 브라우저 `loadImage.js`의 canvas.toBlob/FileReader await도 읽었으나 실제 브라우저 취소로 검증했다고 주장하지 않는다. 공개 pause/resume/AbortSignal의 존재를 가정하지 않는다.

## 실제 helper async 6그룹 — 첫 실행 PASS

명령: `node docs/verify/2026-11-17-repeat-batch57/check-ocr-session-independent.mjs`. 실제 helper를 직접 import하며 worker API Promise의 resolve/reject만 각각 제어한다. 첫 설치 API 검사에서 입증한 미해결 recognize와 같은 모델을 사용하고 실제 native worker 실행과 구분한다.

1. create 미완료 중 reset/cancelAll은 이전 done을 즉시 cancelled로 끝낸다. 새 run은 기존 생성이 반환하고 그 worker의 terminate가 실제 완료할 때까지 create를 시작하지 않는다. 늦은 old worker에 recognize0, 새 run의 빈 결과도 done이다.
2. recognize를 영원히 pending으로 둬도 cancel done은 settle된다. termination 완료 전 새 생성0, 완료 뒤 새 작업 진행. 늦은 old logger와 recognize rejection은 새 작업/worker를 취소하지 않는다.
3. 언어 재초기화 미완료를 취소한 뒤 종료 완료까지 새 worker를 보류한다. 이전 reinitialize가 뒤늦게 끝나도 recognize를 시작하거나 새 worker 언어를 바꾸지 않는다.
4. 정상 같은 언어 작업은 한 worker를 순차 재사용하고 언어 변경은 한 번 reinitialize한다. 생성 중 내부 job logger는 받지만 재사용 단계는 명시 jobId 일치만 받는다. 이미 완료된 run.cancel은 후속 작업이 쓰는 cached worker를 종료하지 않는다.
5. idle worker의 cancelAll도 실제 종료 barrier다. 연속 cancelAll에서 종료는1회이고, 종료 실패 시 다음 작업 failed/create0으로 닫힌 상태를 유지한다. 성공 시에만 다음 생성이 가능하다.
6. dispose 중 생성 반환·queued run·dispose 이후 run·처음부터 stale/throwing owner를 대조했다. 소유한 늦은 worker만 종료하고 인식을 시작하지 않으며, 무효 초기 요청은 I/O0이다.

고유 합계 **12그룹**이며 추가 제품 결함·변경 요청은 없다. 부모 확인 UI·preview source/decode·전체 원고 반출과 실제 Tesseract adapter 인수 위치는 연결 후 별도 단계다. 특히 adapter는 generic port의 `reinitialize(langs,jobId)`를 실제 `reinitialize(langs,undefined,undefined,jobId)`로, recognize를 `recognize(source,{}, {text:true,blocks:true},jobId)`로 전달해야 한다. 이번 미연결 helper만으로 그 연결까지 통과했다고 주장하지 않는다.

최종 독립 MJS **2파일** scoped ESLint **오류0/경고0**. 첫 lint의 Next 예약 `module` 지역 변수 규칙은 fixture holder를 `exported`로 바꾸고 설치 API 영향1그룹 재확인 후 해결했다. 제품 동작 수정이나 고유 검사 추가로 집계하지 않는다.
