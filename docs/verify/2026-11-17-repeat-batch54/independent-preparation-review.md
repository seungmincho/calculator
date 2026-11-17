# 54차 오타 구간 연습 — 미연결 준비 독립 검토

상태: **순수 4 + 실제 자식 4 = 독립 8그룹 PASS.** 읽기에서 전달한 IME 키 guard 누락은 작성자가 실제 fixture로 재현·수정했으며 독립 child 검사에서도 해결을 확인했다. 현재 추가 재현 결함·수정 요청은 없다. 작성자 14그룹과 중복 합산하지 않는다. 새 MJS 2파일 scoped ESLint는 오류·경고 없이 exit 0이다.

## 실행

```text
node docs/verify/2026-11-17-repeat-batch54/independent-review-preparation.mjs
node docs/verify/2026-11-17-repeat-batch54/independent-review-child.mjs
```

두 명령 모두 첫 실행 PASS다. 기존 package의 Node TS import 재해석 경고(`MODULE_TYPELESS_PACKAGE_JSON`)는 종료 코드에 영향이 없으며 package 변경은 하지 않았다.

순수 검사는 실제 `typingReview.ts`를 직접 사용하고 별도 오류 ledger/토큰 oracle로 대조한다. 자식 검사는 `typing-review-harness.mjs`의 실제 child + 공용29 호스트/제어 I/O만 재사용한다. 작성자 assertion은 가져오지 않았다. 한 모듈의 branded snapshot을 같은 실제 유틸 객체에 전달해 WeakSet 소유권을 보존했다. UI clock·focus·IME 이벤트는 제어 포트이며 실제 모바일 IME/브라우저 관찰로 표현하지 않는다.

## 독립 기대값과 결과

| 그룹 | 확인한 경계 | 결과 |
|---|---|---|
| 순수1 | `각🙂 beta 끝`의 provisional 자모→확정 prefix→수정·공백·실제 오타→미완성 마지막 조합 순서. 별도 확정 위치 ledger와 비교해 조합중 추가0·고친 오타유지·미입력 suffix 제외 확인 | PASS |
| 순수2 | whitespace regex로 만든 별도 토큰 좌표 + 교집합 그래프 연결요소 oracle에 64개 오류 부분집합 대조. 반복된 같은 단어는 다른 위치로 보존, 공백 양옆·emoji/NBSP/문장부호·결합자모 exact slice 유지 | PASS |
| 순수3 | errors 배열 변경 후 snapshot 불변, 내부 freeze, 복제한 비브랜드 snapshot·다른 fragment ID·잘못된 인덱스/ID 거부. 1/1000자 정확 생성, 1001/10000자 후보는 원문 유지+attempt 거부, 10001자 source 거부 | PASS |
| 순수4 | 1글자 짧은 별도 attempt 허용. 조합중 틀린자모→정상확정은0오타, 확정 prefix는1오타/0%로완료. 정답강제없음·완료1회·원 snapshot 불변 | PASS |
| 자식1 | 24개 후보의20/4페이지, 선택만으로focus0·명시start만focus1. 다른 후보 선택은 진행 target 유지, 명시 새 start는 이전timer 정리. 1001emoji 전체preview 보존·start disabled·조용한truncate없음 | PASS |
| 자식2 | compositionStart + native false의 Enter/Escape 무간섭. 임시wrong→정상end·중복end·확정prefix 결과,229/native true 보호, 확정 후 일반Enter/ESC 동작 | PASS |
| 자식3 | paste/drop/beforeinput 차단, 단순insertText 유지. retry 뒤old input/end/timer·source A→B→A 뒤oldstart 차단. active false/복귀/unmount 정리, 동시에 활성timer 최대1·storage0 | PASS |
| 자식4 | 실제 공백/NBSP/emoji target 그대로, 입력 중 locale KO→EN→KO는 원문/입력언어/진행값·focus/타이머 소유권 유지. 완료 후 속도/WPM/ShareResult·URL·저장 반출 없음 | PASS |

## 해결 확인한 문제

새 `TypingMistakePractice.onKeyDown`은 처음에 native `isComposing`/229만 검사했다. 읽기 단계에서 `compositionStart`로 내부 ref가 true인 동안 native 플래그가 false인 Enter/Escape가 차단/종료될 수 있음을 작성자에게 전달했다. 작성자는 실제 fixture에서 Enter prevent 횟수 `5 !== 4` 실패를 확인한 뒤 `composing.current`도 검사하도록 최소 수정했다.

독립 자식2에서는 같은 조건을 별도 이벤트로 실행해 Enter prevent0·Escape 유지·입력값 유지와, compositionend 뒤의 정상 Enter/Escape 동작을 함께 확인했다. 이 경계는 **제어 이벤트의 상태 계약 재현**이며 특정 모바일 브라우저가 이 조합을 보낸다는 native 증거는 아니다. 독립 담당은 제품 파일을 직접 수정하지 않았다.

## 이 준비 검토 시점에는 미연결이었던 부모

후속 부모 연결의 독립 6그룹 PASS는 `independent-parent-review.md`에 별도로 기록했다. 아래 문장은 준비 당시 범위이며 후속 결과를 소급해 합치지 않는다.

`TypingTest.tsx`·`CustomTypingWorkspace.tsx`는 이 검토에서 미연결이고 원본 SHA가 유지됐다. 실제 기본4모드/내글 완료에서 committed Set을 언제 갱신·capture하는지, 시간제 조합중 timeout, 원래 history/daily 두 키 bytes와 원 결과·draft 유지, 기본/내글/복습 interval 전체 최대1은 **부모 연결 후** 별도 확인해야 한다.

순수 수집기에 composing=true를 전달했을 때의 동작은 확인했지만 아직 미연결인 부모가 올바른 값을 전달한다고 주장하지 않는다. 공유/기록0 역시 현재 child 포트에서의 결과이며 전체 부모 저장 경로 재인증은 아니다. 읽기 통합 위험과 후속 계획은 `independent-review-plan.md`에 남겼고 작성자의 `parent-integration-map.md`에서 같은 경계를 반영한 것을 확인했다.

## 검토 해시

- `src/utils/typingReview.ts`: `30c30bb03abff99c68a779b2e6765ae67e6e4cd1db5d994bf965ec990ff1e9eb`
- 수정 후 `src/components/TypingMistakePractice.tsx`: `729bcb66b42f68aa2c0a304f96e1be447ca9342d15b4f2c09fcde1b4b45e5ef5`
- 기존 부모·`customTyping.ts`·`typingTest.ts`·원본 probe JSON은 `independent-review-plan.md`의 SHA와 같고 각 검사 전후 동일성을 assertion으로 확인했다.

새 리뷰 변경은 MJS/MD뿐이다. 제품/공용 호스트/canonical/원본 probe 변경0. Chrome·전체 타입·빌드·배포·커밋 실행0.
