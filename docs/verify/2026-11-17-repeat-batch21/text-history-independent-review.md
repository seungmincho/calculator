# 21A 텍스트 변환 단계 독립 검토

담당: team_rotation. 제품 파일은 수정하지 않았다. 22B 준비 TS는 고정한 채 21차 계약, 실제 `TextConverter`/`TextPipelineHistoryControls`, `textPipelineHistory`/기존 변환 함수를 확인했다. Chrome·전체 tsc·빌드는 실행하지 않았다.

## URL 경계와 판정

검토 시작 시 popstate handler는 query가 같아도 `restoreUrl`을 호출했다. URL에 직렬화하지 않는 replace/affix 단계를 없애고 shuffle seed를 다시 만들며 past/future를 초기화하는 경로였다. 원문/옵션 작성 폼 자체는 별도 상태로 남는다. 따라서 단순 hash 앞/뒤 이동을 파이프라인 복원으로 취급하면 현재 단계 작업을 잃는다.

root와 제품 담당이 **같은 query의 hash-only 탐색은 현재 단계와 이력을 보존**하는 계약으로 확정했다. 제품 담당은 canonical query가 `observedQuery`와 다른 경우에만 popstate 복원을 실행하도록 최소 수정했다. 실제 query 변경은 기존대로 새 이력 기준을 만든다.

독립 fixture의 첫 실행 전에 제품 수정이 완료됐다. 따라서 수정 전 실제 실행 재현을 확보했다고 주장하지 않는다. 이전 코드 경로 확인과 수정 후 실제 컴포넌트의 독립 실행 결과를 구분한다.

## 실행 결과

`node --experimental-strip-types docs/verify/2026-11-17-repeat-batch21/check-text-history-independent.mjs`: **6그룹 PASS, 실패 0**.

1. 같은 query에서 hash-only popstate 전후 private replace/affix, shuffle seed, past/present/future, 실제 출력이 동일하다. 양방향 hash 이동을 확인했다.
2. 실제 ops 변경은 새 기준으로 복원하며 원문과 작성 중 find/repl/prefix/suffix는 유지한다. 검색 훅에 의한 외부 변경도 확인했다.
3. private 단계 이동/초기화 undo·redo 후 옵션·seed와 원문이 유지되고 URL에는 원문/치환/접두·접미/seed/이력이 들어가지 않는다. 관련 없는 query/hash도 자기 동기화에서 유지한다.
4. 40번 추가 후 과거 30개, 30번 undo 후 미래 30개, 경계/동일 단계 이동 no-op, undo 이후 새 작업의 redo 폐기를 확인했다.
5. 실제 child handler의 Alt 이동, Ctrl/Meta undo·redo, 입력/IME 예외와 이동·삭제 후 존재하는 행/활성 이력 버튼으로 초점 요청을 확인했다.
6. Step 원본 분리와 모든 primitive 옵션 복제, 이동 후 정규식 오류 위치, REGEX_MAX 초과 정책을 확인했다.

실제 제품 부모·자식·도메인 코드를 실행하고 URL/포커스/훅을 제어한 fixture다. `useDeferredValue`는 즉시 값을 반환하도록 검사 포트에서 처리하며, 실제 React 스케줄링·브라우저 history 이벤트 발생·DOM 포커스·모바일 배치는 브라우저 담당의 확인 범위다. 기존 담당자의 자체 14/8/7그룹과 독립 6그룹을 중복 집계하지 않는다.

수정된 코드에서 추가 조치가 필요한 결함은 발견하지 않았다.
