# 54차 틀린 구간 재연습 — 미연결 준비

후속 상태: 아래는 미연결 준비 당시 기록이다. 이후 승인된 부모 연결·최종 29키 번역·검사 결과는 [implementation.md](implementation.md)에 기록한다.

2026-11-17. 승인된 순수 helper·독립 자식·KO/EN 조각을 작성했다. **기존 `TypingTest.tsx`와 `CustomTypingWorkspace.tsx`에는 연결하지 않았다.** 실제 경로/기록/공용 messages의 변화0이며 부모 연결 완료를 주장하지 않는다.

## 준비 API와 구현

- `src/utils/typingReview.ts`: `collectTypingReviewErrors(previous,target,typed,composing)`는 코드포인트 기준 확정 오타만 모은다. 조합 중에는 이전 집합만 복제하며, 조합 종료 뒤 마지막 한글 prefix도 오타로 분류한다. 고친 오류 위치는 유지, 아직 입력되지 않은 suffix는 제외한다. caller가 기존 입력 handler의 CR/LF 제거·길이 처리 이후 문자열을 전달한다.
- `captureTypingReview(id,target,lang,errors)`: source1~10,000코드포인트/양의 안전정수ID/ko·en/정수 위치 검증. 일반 오타는 공백으로 나눈 토큰, 공백 오류는 양옆 토큰과 공백 문맥을 포함한다. overlap만 병합하며 같은 단어의 다른 위치는 별도다. `[start,end)`는 코드포인트이고 text는 정확한 slice다. source·errors·fragments를 freeze하고 WeakSet으로 생성한 snapshot을 구분한다.
- `createTypingReviewAttempt(snapshot,fragmentId)`: 해당 snapshot 소속 구간만 허용, 1~1,000코드포인트 exact text로 기존 attempt 구조 생성. 앞뒤 공백·NBSP·emoji·자모·문장부호를 수정하지 않는다. 기존 `createCustomTypingAttempt`의10자 최소값은 그대로다. 초과 구간은 자르지 않고 오류다.
- `updateTypingReviewAttempt`는 기존 타수/완료/점수 함수를 재사용하되 조합 중 임시 오타를 복습의 오류 이력에 넣지 않는다. 입력 문자열은 target에 필요한 유한 prefix를 먼저 잘라 큰 배열 생성을 제한한다. 완료한 attempt는 그대로 반환한다.
- `src/components/TypingMistakePractice.tsx`: `{snapshot: TypingReviewSnapshot|null, active:boolean}` controlled 자식. 20개 후보 페이지·정확한 선택 미리보기·명시 시작/재시도/닫기, 별도 run과 타이머. 다른 후보를 고르기만 하면 현재 연습은 유지되며 명시 시작만 교체한다. 결과는 정확도/오타 위치·시간만 표시하고 WPM/평균/순위는 없다. 기록/URL/Clipboard/외부 요청/저장소를 사용하지 않는다.
- 원 snapshot 객체/active/run 변경이 옛 input/composition/timer/close를 무효화한다. 같은 id를 가진 새 객체도 새 원본으로 처리한다. locale 변경은 진행 중 지문·초점·타이머를 유지한다. 명시 시작/재시도만 렌더 후 focus, 예외는 입력칸을 수동으로 사용할 수 있게 처리한다. paste/drop/beforeinput을 차단하고 IME229/조합 중 Escape에 간섭하지 않는다. 일반 Esc는 복습만 닫는다.

## 검사

| 검사 | 고유 결과 |
| --- | --- |
| `node scripts/check-typing-review.ts` | **8그룹 PASS**: commit/IME/pending, overlap·반복 위치, codepoint exact, strict/브랜드/10k,1·1000·1001·기존10min,freeze/bounded input,임시오타/마지막prefix/완료1회,공백/수정이력 |
| `node docs/verify/2026-11-17-repeat-batch54/check-typing-review-child.mjs` | **6그룹 PASS**: 명시focus/기록0,실제IME,20페이지선택/확정분리,KOEN경계,새객체/active/retry/언마운트late,locale/paste/229/미연결/번역키 |

준비 합계 **14 고유 그룹**이다. cleanup ref lint 경고 수정 후 영향1그룹을 추가 확인했지만 중복 합산하지 않는다. 첫 Node 실행에서 parameter property가 strip-only 실행에 맞지 않아 명시 property 선언으로 수정했다. 첫 페이지 fixture는 제품 selector `prev`를 `previous`로 찾은 오류여서 fixture만 수정했다. 두 문제를 사용자 경로의 이미 배포된 결함으로 주장하지 않는다.

독립 담당의 읽기 제안으로 compositionStart 뒤 native `isComposing=false`인 Enter/Escape도 확인했다. 처음에는 ref를 확인하지 않아 Enter를 막는 실패를 실제 child fixture에서 재현했고, 새 child의 key guard에 composing ref를 포함하여 조합 중 Enter/Escape 무간섭·compositionend 후 정상 처리 영향1그룹을 통과했다. 기존 두 부모의 key 정책은 이번 미연결 준비에서 바꾸지 않았다. 이 영향 재실행도 고유 그룹 수에 더하지 않는다.

자식 fixture는 실제 컴포넌트를 실행하고 performance/interval/focus만 제어한다. parent/child source를 읽어 기존 두 부모에 새 import가 없음을 확인한다. 원고/기록을 실제 브라우저에서 보존했다고 확대하지 않으며 실제 부모·OS IME·320px·전체 타입은 다음 단계다. root/독립 담당에게 API와 검증 단위를 전달했다.

번역 `translations-typing-review.json`: `typingTest.review` **KO/EN 각28 leaf**. 실제 자식 렌더에서 두 언어 구조가 일치하고 기존 namespace를 사용한다. canonical/생성본/menu/page는 수정하지 않았으며 부모 연결 시 integrator가 병합한다. 제어44px/입력16px·단일 열·exact whitespace 안내를 포함한다.

제품·자체 검사·host5파일의 범위 ESLint에서 오류0이었으며 cleanup ref 경고1을 수정했다. 변경 child 및 검사2파일을 최종 재검사하여 **오류0/경고0**이다. 원래 나머지3파일은 경고·오류0이었다.

**준비 파일 TS 안정·편집 고정, 부모 미연결.** Chrome/전체 tsc/빌드/배포/커밋 없음. 부모 연결은 root 후속 신호를 기다린다. 실제 부모·native 통과는 아직 주장하지 않는다.
