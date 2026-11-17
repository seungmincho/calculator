# 54차 부모 연결 지도 — 아직 미연결

후속 상태: 아래는 연결 전 설계 기록이다. 승인 뒤 두 부모 연결을 완료했으며 최신 결과는 [implementation.md](implementation.md)에 기록했다.

현재 순수8+실제 자식6그룹을 준비했다. 기존 부모2파일은 수정하지 않았다. 이 문서는 승인된 다음 연결에서 유지할 입력/원 결과/기록 경계다.

## 기본 TypingTest

- 기존 `errorsRef`, `reachedRef`, `finish`의 accuracy/speed/최근100개/일일 기록을 수정하지 않는다. `committedReviewErrors: useRef<readonly number[]>([])`와 마지막 완료용 `reviewSnapshot`만 별도로 둔다.
- `updateTyping`가 기존 `raw`에서 CR/LF 제거 및 목표 길이 제한한 `value`를 만든 뒤, 현재 run/active/완료 가드를 통과한 입력에 대해 `collectTypingReviewErrors(previous,target,value,isComposing)`를 호출한다. `isComposing`은 기존 composition ref/native 이벤트를 합친 값이다. 조합 중 임시 대체 글자는 포함하지 않는다. 수집기는 이미 고친 확정 오류 위치를 유지한다.
- `finish`는 **기존 확정 Set만** 사용해 `captureTypingReview(++positiveOriginSequence,target,L,committedErrors)`한다. 특히 시간제 timeout에서 `typedRef`를 다시 false 확정으로 평가하지 않는다. 입력하지 않은 suffix와 아직 조합 중인 마지막 글자가 새 오류가 되지 않아야 한다.
- 기존 원본 reset/새 모드·언어·새 지문은 Set와 snapshot을 비운다. 단순 복습 선택/시작/재시도/닫기는 기존 reset/finish/save를 호출하지 않는다. 원 결과 아래에 독립 자식을 연결해 원 Result/ShareResult/요약/전체지문 retry는 유지한다. origin 생성이 실패하면 복습만 명시 안내로 중지하고 원래 완료/기록을 잃지 않는다.

## 내 글 CustomTypingWorkspace

- 초안과 확정 `attempt.target/lang` 분리를 그대로 유지한다. `attempt.mistakes`는 기존 scoring용이므로 새 후보에 그대로 넘기지 않는다. 별도 확정 오류 ref를 새 run마다 초기화한다.
- `update`의 실제 입력 정규화/현재 generation 판정과 같은 scope에서 수집한다. 기존 helper가 반환한 `next.typed`와 확정 composition 상태를 사용하고, `next.result`가 최초 생긴 시점에 `next.target/lang`과 확정 Set을 snapshot으로 저장한다. 완료 후 들어온 중복 composition/input은 Set나 snapshot을 새로 만들지 않는다.
- 초안만 수정/다음 언어 선택/앱 locale 변경은 완료 snapshot과 현재 복습을 바꾸지 않는다. ‘이 글로 시작’/전체 retry/일반 Escape/active 이탈처럼 원 attempt가 바뀌는 명시 동작은 복습도 정리한다. 기존 초안/target 보존 정책은 그대로다.
- 후보1자 연습을 위해 기존 custom factory 최소10을 낮추지 않는다. 자식은 검증된 `createTypingReviewAttempt`를 통해서만 exact snippet을 만들고 원 초안에 쓰지 않는다.

## 공유 수명·포커스·기록

- 부모가 주는 snapshot 객체는 완료1회만 새로 만들고 일반 렌더마다 재생성하지 않는다. 자식은 객체 identity와 run generation을 함께 사용한다. 이전 결과의 start/close/composition이 다음 원고에 적용되지 않아야 한다.
- 부모 원 연습이 완료된 뒤에만 복습을 시작할 수 있어 두 타이머가 동시에 동작하지 않는다. 새 원 시도 또는 workspace 전환은 자식 active/snapshot을 즉시 바꿔 interval/옛 callback을 해제한다. 기본/내 글 전환 시 기존 timer owner도 유지한다.
- 복습이 기존 ShareResult/TypingSummaryCopy의 원 결과를 바꾸지 않으므로 새 반출 UI를 추가하지 않는다. 원 결과 복사를 복습 완료로 오해하지 않도록 child 결과의 기록 제외 안내를 유지한다. URL/저장소/원고 export 경로를 추가하지 않는다.
- 기존 기본 연습의 delayed focusInput을 복습 시작에 재사용하지 않는다. 새 자식은 자기 origin/run에 해당하는 명시 시작/재시도만 focus한다. 원 시도를 다시 시작하는 기존 버튼 이후 옛 focus callback이 복습에 간섭하는지 연결 검사에서 확인한다.

연결 검증은 실제 두 부모의 original result/text/draft/기록 두 키 bytes·URL 동일성, 최초 완료1회/복습0회 기록, 시간제 suffix·IME중timeout·정상compositionend, 수정된오타후보, 모드 왕복/새 원고/locale/old callback/timer·focus를 별도로 수행한다. 아직 부모 연결·실제 브라우저 통과를 주장하지 않는다.
