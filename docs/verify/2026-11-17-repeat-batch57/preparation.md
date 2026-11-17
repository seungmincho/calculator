# 57차 OCR 준비 — 중간 타입 동결 체크포인트

> 후속 상태: 10:15:57 전체 타입 체크포인트 뒤 부모 연결을 승인받았다. 작성자 준비6+실제 부모8그룹, 기존 OCR 회귀 및 최종6파일 ESLint 오류0/경고0까지 완료했다. 아래는 당시 미연결 중간 상태의 기록이며, 최종 연결/API/검증은 [implementation.md](./implementation.md)를 따른다.

새 유틸2파일을 완결된 문법/API 단위로 작성한 뒤 전체 타입 barrier 요청에 따라 **TS 편집을 중지**했다. `ImageOcr.tsx` 부모 연결/수정0, 기존 ocr/textHandoff/58 복사 수정0이다. 이 기록을 전체 준비 완료로 표시하지 않는다.

## 현재 파일

- `src/utils/ocrQueue.ts`: generic 원본 File 참조를 유지하는 순수 큐. `createOcrQueue/appendOcrItems/setOcrPaused/editOcrText/rotateOcrItem/removeOcrItem`, `beginOcrJob/isOcrJobCurrent/completeOcrJob`, `retryOcrFailures`, `prepareOcrConfirmation/applyOcrConfirmation`, `ocrItemText/ocrAllText`.
- `src/lib/ocr/workerSession.ts`: generic Source/Result 포트로 create/reinitialize/recognize/terminate의 소유권과 직렬 tail을 관리. `run` 반환은 `{done,cancel}`, session은 `cancelAll/dispose/drain`을 제공한다. 실제 tesseract import는 부모 adapter에 둘 예정으로 아직 모델 호출0이다.
- `translations-ocr.json`: KO/EN imageOcr.jobs 아래 사용자 안내 초안. 현재 canonical 미병합이며 부모 연결 때 필요한 키만 최종 정리한다.

## 큐 계약

state의 `success:null`과 성공한 빈 raw를 구분한다. pending/running/error라도 success가 있으면 `ocrItemText`와 `ocrAllText`는 같은 보이는 원고를 반환한다. 성공 snapshot의 words/settings는 복제·동결하고 file bytes는 복제하지 않는다.

명시 재인식의 확인은 edited revision을 캡처한다. pending 또는 실행 중 추가 편집/ABA가 일어나면 replace grant와 달라져 edited를 유지한다. 실패는 success/edited를 건드리지 않는다. cleanup/reset 확인은 state revision이 같을 때만 적용하고 취소는 state 변경 없이 호출하지 않는다. queue 변경/작업 완료 등 확인 대상이 바뀐 뒤 오래된 확인도 거부한다.

pause는 현재 active를 취소하지 않고 next 시작만 막는다. 새 파일/오류 retry는 paused를 유지한다. retry는 클릭 시 error인 ID만 새 pending으로 바꾸고 편집 교체 권한을 주지 않는다. 회전 변경은 실행 중 캡처 설정을 바꾸지 않으며 완료 metadata와 현재 설정 차이는 부모 UI에 표시한다. reset/remove 뒤 이전 job 완료는 identity/epoch 검사로 무시한다.

## Worker session 계약

`run({source,langs,isCurrent,onProgress?,onPhase?})`는 source를 읽거나 변경하지 않는다. 이미지 decode/Canvas/preview 수명은 부모 소유다. parent adapter는 실제 `reinitialize(langs, undefined, undefined, jobId)`와 `recognize(source, {}, {text:true,blocks:true}, jobId)`를 연결해야 한다. explicit userJobId가 있어야 재사용 worker에서 이전 job의 늦은 logger를 구분할 수 있다. create 단계의 내부 ID progress만 현재 creating job에 허용한다.

cancel은 done을 즉시 cancelled로 settle한다. 아직 create가 반환하지 않았으면 실제 반환 뒤 그 worker를 terminate할 때까지 tail이 유지되어 다음 create가 시작되지 않는다. 이미 획득한 worker의 recognize/reinitialize는 cancellation race로 UI를 풀고 해당 worker terminate가 완료된 뒤 다음 작업을 허용한다. 종료한 worker의 미완료 recognize Promise가 영원히 settle하지 않아도 다음 worker는 종료 barrier 뒤에 시작할 수 있다.

종료 실패 시 새 worker를 만들지 않는 fail-closed 상태가 된다. 이미 완료된 옛 run의 cancel은 현재 재사용 worker를 건드리지 않는다. idle cancelAll도 worker 종료를 tail에 넣는다. dispose는 이후 run을 취소하고 자기 worker만 정리한다. 세션 간 전역 worker 플랫폼을 추가하지 않았다.

## 남은 작업

타입 종료 신호 뒤 작성자 queue/worker 경합 검사와 scoped ESLint를 작성·실행하고 실제 결과를 기록한다. 현재 gpa 독립 초기6그룹 PASS(큐+설치 Tesseract 실제 API 계약) 통지는 수신했으나 작성자 실행 검사로 집계하지 않는다. session 독립은 안정 API 신호 뒤 진행 예정이다. 부모 연결/컨트롤 UI/실제 tesseract adapter는 별도 승인 뒤다.
