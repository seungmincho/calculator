# 47 부모 연결 계약

현재 `TextDiffWorkspace.tsx`는 예제 결과, draft와 마지막 성공 snapshot, 200행 비교 페이지, Worker 취소, writing diff 전달을 관리한다. `copyDiffText`와 직접 Blob 다운로드는 각각 별도 상태를 사용한다. 다음 연결은 이 부모와 `lib/diff/client.ts`의 응답 대조를 소유한다.

- 마지막 성공 구조 안에 branded `LineMergeDocument`/`LineMergeOutput`을 함께 둔다. 예제는 id1, 이후 성공은 단조 id를 발급한다. 순수 계산이 모두 성공한 뒤에만 하나의 상태로 commit한다. 실패/취소 시 현재 draft 및 이전 성공 선택은 그대로 유지한다.
- 선택 콜백은 문서 객체, 출력 콜백은 결과 객체를 받는다. 부모는 최신 completed ref와 객체가 같은지 검사한다. 같은 텍스트를 다시 비교해도 새 문서이며 오래된 핸들러는 새 선택을 덮지 못한다.
- 새 입력/교환/비교 시작/취소/초기화/선택 변경/전달 적용은 공용 출력 owner를 즉시 무효화한다. 완료 결과가 유지되면 사용자는 그 결과를 다시 명시적으로 복사할 수 있다. 새 비교가 끝나면 선택은 모두 원본으로 초기화한다.
- layout effect에 output owner 활성화/해제를 둔다. 언어와 실제 번역 label을 의존성으로 하는 객체를 출력 context로 만들어 KO→EN→KO나 지연 번역에서도 이전 핸들러·복사 fallback이 되살아나지 않게 한다. mount replay는 새 owner로 시작한다.
- `client.run(left,right)`는 일치 id·구조 검사에 더해 원문 대조를 통과한 응답만 resolve한다. 기존 timeout/실패/cancel/Worker terminate 처리를 유지한다. 부모의 prepare도 원문 대조를 수행해 테스트 포트나 다른 진입점에서도 잘못된 데이터를 적용하지 않는다.
- 새 recovery child는 failed 상태에서 열고, 같은 요청 retry 중에는 내용 선택 상태를 유지할 수 있다. 전체 원문을 항상 textarea에 중복 렌더하지 않는다. copy 성공/다운로드 시작·실패 메시지는 하나의 출력 상태로 표시한다.
- 원문 `?from=writing-versions` 전달은 기존 receiver의 cancel/edit/consume 규칙을 유지한다. 적용 시 completed=null로 함께 정리하며 Worker를 자동 실행하지 않는다. 직접 입력·초기화·swap은 pending 전달을 취소한다.
- 비교 행 필터/페이지는 문서 선택이나 출력 내용을 바꾸지 않으므로 단순 페이지 이동은 복사를 취소하지 않는다. 미리보기 표시 한도와 전체 출력 내용은 분리한다.

검사는 실제 부모 + 실제 client + 제어 Worker/clipboard/download 포트로 수행한다. 600행/2MiB 전체 출력, 내용만 틀린 정상형 응답, 새 성공만 선택 reset, 늦은 복사/다운로드/언어/Strict replay/unmount, 전달 consume/dirty 취소를 확인한다. 19차/25차 기존 검사는 변경 영향 경계만 추가 실행한다. 브라우저에서 실제 Worker와 TXT/클립보드를 별도 확인하기 전에는 native 통과로 기록하지 않는다.
