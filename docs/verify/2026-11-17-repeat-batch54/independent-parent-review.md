# 54차 틀린 구간 재연습 — 실제 부모 독립 검토

상태: **실제 부모 6그룹 PASS, 추가 재현 결함·제품 변경 요청 없음.** 앞서 완료한 순수/실제 자식 준비 8그룹과 구분하며 독립 고유 합계는 **14그룹**이다. 작성자 20그룹은 여기에 합산하지 않는다. 이 문서는 부모 연결 이후 결과이며 `independent-preparation-review.md`의 미연결 시점 근거를 대체하거나 소급하지 않는다.

## 실행과 대상

```text
node docs/verify/2026-11-17-repeat-batch54/independent-review-parent.mjs
npx eslint docs/verify/2026-11-17-repeat-batch54/independent-review-parent.mjs
```

부모 검사는 첫 실행에서 6그룹 모두 통과했다. Node의 기존 `MODULE_TYPELESS_PACKAGE_JSON` 재해석 안내는 종료 코드 0에 영향이 없으며 package를 변경하지 않았다. MJS scoped ESLint 결과는 아래 최종 기록을 따른다.

`typing-review-parent-harness.mjs`의 제어 I/O만 재사용하고 작성자 assertion은 가져오지 않았다. 실제 `TypingTest`·`CustomTypingWorkspace`·`TypingMistakePractice`와 같은 실제 branded helper 모듈을 연결했다. 저장 bytes·타이머 ledger·고정 오류 위치·이전 결과/공유 props·원문을 독립 기대값으로 대조했다. 부모나 공용 host를 수정하지 않았다.

## 별도 기대값과 결과

| 그룹 | 확인한 경계 | 결과 |
| --- | --- | --- |
| 1 | daily/short/long/time 네 실제 모드에서 첫 오타를 수정한 뒤 완료. 원 history는 정확히1회, daily는 해당 모드만1회 기록한다. 재연습 오류 완료·retry 정답 완료·close·이전 timer 호출 후에도 원 결과/ShareResult props/URL/저장 bytes/쓰기 횟수는 그대로다 | PASS |
| 2 | 시간제에서 첫 오타를 확정 후 수정하고 두 번째 위치를 조합 중인 상태로 timeout. snapshot은 기존 확정 위치0만 포함하고 조합 중 위치1과 미입력 suffix는 제외한다. timeout 이후 compositionend는 원 snapshot/기록을 바꾸지 않으며 다음 실행에서 조합 입력만 있었으면 후보0이다 | PASS |
| 3 | 내 글 `\t alpha  beta\n gamma `의 기존 정규화와 확정 target을 유지. 위치1의 고친 오타만 재연습하고, 진행 중 다음 원고·다음 언어·UI locale를 바꿔도 확정 원문/복습 언어/입력은 그대로다. 복습 완료는 draft·원 결과·storage를 덮지 않는다 | PASS |
| 4 | 기본 복습→내 글→새 적용→기본 모드 이동에서 활성 interval 최대1. 이전 textarea onChange/compositionend/timer를 직접 호출해도 다른 복습과 새 원 연습을 바꾸지 않는다. 새 적용·unmount는 복습 실행을 정리한다 | PASS |
| 5 | 내 글 한글 조합 중 잘못된 자모를 정답으로 확정한 위치는 새 ledger에서 제외하고, 끝 글자 `가`를 명시 확정한 위치9만 포함한다. 기존 점수는 원래 임시 오류 누적2를 유지하며 새 ledger 정책을 원 채점에 소급하지 않는다. 완료 후 중복 compositionend는 원 결과/snapshot을 바꾸지 않는다 | PASS |
| 6 | capture helper만 제어 실패시켜도 기본 기록/원 결과와 내 글 원고/원 결과는 남는다. 별도 unavailable 안내와 null snapshot만 표시하고 재연습 실패를 원 완료 실패로 취급하지 않는다 | PASS |

실행 전 fixture를 읽으면서 결과 전에는 ReviewBoundary가 없다는 실제 JSX 계약에 맞춰 null child 관찰로 정리했고, 기존 오류2 안내는 실제 번역 문자열과 비교하도록 했다. 이 준비 정리는 제품 결함·수정 전 실패 관측으로 집계하지 않는다. 이후 제품 실행은 첫 시도 PASS였다.

## 범위와 한계

- clock·interval·storage·focus와 IME 이벤트는 제어 포트다. 실제 OS IME·브라우저 렌더링·입력 지연 성능의 증거로 표현하지 않는다.
- 원 history/daily API의 실제 부모 쓰기를 관찰하지만 원래 저장 오류 처리 정책을 새로 재설계하거나 전 저장 환경을 인증하지 않는다.
- 재연습에는 새 기록·공유·URL 쓰기가 없음을 실제 연결에서 확인했다. 기존 TTS/다른 도구·전 모드 엔진 전체 재검사는 범위 밖이다.
- 준비 때 해결한 내부 composing ref key guard는 `independent-preparation-review.md`에 별도 기록돼 있다. 이번 부모 단계의 추가 제품 결함은 없다.

## 검토 제품 해시

- `src/components/TypingTest.tsx`: `820e26c5a6d87a27a255b43e33791283cef4173e3c33d1d684928bb350ebc753`
- `src/components/CustomTypingWorkspace.tsx`: `eddd48ae81b9c4041d99ac98b01cb08222bcd31d73278ed5379c40a24474773c`
- `src/components/TypingMistakePractice.tsx`: `729bcb66b42f68aa2c0a304f96e1be447ca9342d15b4f2c09fcde1b4b45e5ef5`
- `src/utils/typingReview.ts`: `30c30bb03abff99c68a779b2e6765ae67e6e4cd1db5d994bf965ec990ff1e9eb`

기존 `typingTest.ts`·`customTyping.ts`·`existing-typing-observations.json`은 준비 단계 해시와 동일하며 검사 전후 불변 assertion도 통과했다. 제품 TS·canonical·공용 host·기존 baseline 변경0. Chrome·전체 타입·빌드·배포·커밋 실행0.

최종 lint: 위 MJS 1파일 scoped ESLint **exit 0, 오류·경고 0**. 준비 MJS 2파일 lint0은 이전 근거로 유지하며 불필요하게 재실행하지 않았다.
