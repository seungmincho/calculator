# 54차 틀린 구간 재연습 — 부모 연결 완료

2026-11-17. `TypingTest.tsx`와 `CustomTypingWorkspace.tsx`에 준비된 `typingReview`/`TypingMistakePractice`를 연결했다. 제품 TS 안정·편집 고정 상태이며, 실제 브라우저와 전체 타입 검사는 지정 담당의 별도 단계다.

## 구현과 보존 경계

- 기본 네 모드와 내 글 모두 기존 입력 handler가 만든 문자열에서 **확정된 오타 위치를 별도 집합**으로 수집한다. 기존 `errorsRef`/attempt mistakes는 그대로이므로 원래 정확도·타수·WPM·완료 기준을 바꾸지 않는다. 고친 확정 오류는 복습 대상에 남고, IME 조합 중 임시 오타와 아직 입력하지 않은 suffix는 제외한다.
- 시간제 종료는 마지막 확정 집합만 capture한다. 조합 중인 `typedRef`를 종료 시점에 강제로 확정하지 않는다. 기본 완료의 기존 최근 기록·일일 기록 쓰기는 그대로 한 번만 실행한다.
- 원래 완료 snapshot 아래에 복습을 별도로 표시한다. 후보 선택은 현재 복습을 바꾸지 않으며 명시 시작/다시/닫기만 복습 실행을 변경한다. 복습은 WPM 비교·저장·원래 결과 덮어쓰기·URL 변경을 하지 않는다. 기본 결과·내 글 초안/확정본·기존 요약 복사는 유지한다.
- 원래 새 연습/모드 전환/내 글 적용은 이전 복습을 무효화한다. 별도 run·scope·mounted 검사가 늦은 입력/IME/interval/focus를 차단한다. locale 변경과 내 글 초안/다음 언어 편집만으로 확정 지문이나 복습을 바꾸지 않는다.
- snapshot 생성 실패 시 복습만 사용할 수 없다는 안내를 표시한다. 이미 완료된 원래 결과와 저장 기록은 보존한다. 두 기존 저장 키(`typing-test-history-v2`, `typing-test-daily-v1`)의 스키마·쓰기 정책에 새 필드를 넣지 않는다.
- source 10,000코드포인트·후보 20개씩·구간 1~1,000코드포인트 exact slice. 원래 내 글 10자 최소·정규화는 변경하지 않는다. 긴 후보를 자동으로 자르지 않는다. 별도 복습 factory가 짧은 구간을 허용한다.

## 검사 근거

| 검사 | 고유 결과 |
| --- | --- |
| `scripts/check-typing-review.ts` | 순수 8그룹 PASS, 준비 기록 참조 |
| `docs/verify/2026-11-17-repeat-batch54/check-typing-review-child.mjs` | 실제 자식 6그룹 PASS; 부모 연결 뒤 locale/IME229/paste/정적 연결 영향 1그룹 재확인 |
| `docs/verify/2026-11-17-repeat-batch54/check-typing-review-parent.mjs` | 실제 부모 6그룹 PASS |

작성자 고유 합계는 **20그룹**이다. 영향 재실행을 중복 합산하지 않는다. 부모 fixture는 실제 두 부모와 실제 복습 자식을 별도 host에 연결하고 같은 실제 순수 모듈을 사용한다. clock/interval/storage/focus만 제어한다. 기존 I/O host를 재사용했으며 실제 브라우저/OS IME 검증으로 주장하지 않는다.

부모 6그룹은 기본 네 모드의 기록 한 번·100개 한도/스키마·복습 중 bytes 보존, 내 글 초안/확정본/언어 보존, 기존 점수와 별도 committed ledger, 시간제 조합/untouched suffix 제외, workspace/새 실행의 늦은 callback 무효화, capture 실패 시 원래 결과 보존을 확인한다. 처음 부모 실행의 번역 문구 단정은 현재 번역 값을 사용하는 fixture로 정정했고 제품 결함으로 집계하지 않았다.

기존 회귀 `node scripts/check-typing-test.ts` **OK**, `node scripts/check-custom-typing-parent.mjs` **6그룹 PASS**. 새 기능 고유 수와 구분한다. 신규 helper/child/준비 검사 5파일은 준비 단계 scoped ESLint 오류·경고 0이었다. 부모 2개+새 부모 host/검사+변경 child 검사 최종 5파일 scoped ESLint도 **오류·경고 0**. Node strip-types 실행의 기존 MODULE_TYPELESS_PACKAGE_JSON 안내는 검사 실패가 아니다.

## 번역 및 실제 경로 검증 인계

`translations-typing-review.json`: `typingTest.review` KO/EN 각각 **29 leaf**. 추가 unavailable 안내와 EN 단수·복수에 안전한 count/length/result 문구를 포함한다. canonical/messages/메타/메뉴/가이드는 integrator 소유다.

경로 `/typing-test/`. 기본 진입 예시 `?mode=short&lang=en&i=0`에서 첫 글자를 틀린 뒤 전체 지문을 확정하면 복습 후보가 생긴다. 내 글은 `alpha beta gamma`를 적용한 뒤 첫 글자 X→전체 지문을 입력하면 원고와 구분된 `alpha` 복습을 확인할 수 있다.

- 원래 부모: `[data-typing-mode="custom"]`, `[data-standard-input]`, `[data-standard-result]`, `[data-custom-draft]`, `[data-custom-apply]`, `[data-custom-input]`, `[data-custom-result]`.
- 복습: `[data-typing-review]`, `[data-typing-review-fragment]` 안 radio, `[data-typing-review-preview]`, `[data-typing-review-start]`, `[data-typing-review-target]`, `[data-typing-review-input]`, `[data-typing-review-result]`, `[data-typing-review-retry]`, `[data-typing-review-close]`, `[data-typing-review-prev]`, `[data-typing-review-next]`.
- 별도 snapshot 실패 안내 `[data-typing-review-unavailable]`. 후보가 없으면 `[data-typing-review-empty]`. locale 조각의 영어 제목은 `Practice missed sections`, 시작은 `Practice this section`이다.

후속 검증: 독립 준비8+실제부모6=**14그룹 PASS**, 독립 MJS lint0/0. 지정 native 담당은 **7/7 PASS·Chrome 종료**를 보고했다. 실제 영어 입력/DOM 초점과 합성 IME/clock의 범위는 `review-browser.md`에 구분한다. native 첫2흐름의 완료 후 재입력/원결과 컨테이너에 포함된 복습 텍스트 기대값은 fixture만 정정했으며 제품 추가수정0이다. 전체 타입은 통합 담당 체크포인트 대기다. Chrome/전체 tsc/빌드/배포/커밋은 작성자가 실행하지 않았다.
