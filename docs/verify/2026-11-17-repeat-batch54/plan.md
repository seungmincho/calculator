# 54차 후보 — 틀린 단어·공백 주변 다시 연습

상태: 구현·공용 통합·독립14그룹·실제Chrome7/7·전체2GB 타입 첫 실행을 통과했다.10:15:57 KST 사전확인/session68215 exit0이며 최종 근거는 [완료 보고서](report.md)를 따른다. 아래 원래 설계/관측은 당시 계약 근거로 보존한다.

## 현재 있는 기능과 없는 흐름

- `src/components/TypingTest.tsx:145`의 `finish`는 기본 4모드 결과를 최근100개/일일 기록에 저장한다. `:373`은 놓친 자모 집계, `:402`는 원래 **전체 지문**을 reset하여 다시 연습하는 버튼이다. 틀린 문장/단어를 골라 별도로 시작하는 경로는 없다.
- `src/components/CustomTypingWorkspace.tsx:141`의 retry도 `attempt.target` 전체를 다시 시작한다. `:146`은 놓친 자모 목록뿐이다. `src/utils/customTyping.ts:30`에는 코드포인트 위치별 `mistakes`가 있지만 완료 `result`는 집계만 보관한다. `src/utils/typingTest.ts:81`의 `topMissed`는 자모 상위5개라 어느 문장·단어에서 틀렸는지 역산할 수 없다.
- [23차 구현 기록](../2026-11-17-repeat-batch23/typing-custom-implementation.md)과 [완료 보고서](../2026-11-17-repeat-batch23/report.md): 내 글10~1,000코드포인트·초안/확정본 분리·명시 IME 완료·같은 글 재연습·기록 분리·요약 복사를 완료했다. 이 기능을 다시 신규 기능으로 만들지 않는다.
- 작은 순수 읽기 probe(`probe-existing-typing.mjs`)로 실제 지문 길이와 기존 오류 보관을 확인했다. 한글 짧은 글 최대29/긴 글148/시간제1,945, 영어56/226/1,373코드포인트다. 시간제는 같은 고정 문장들을 두 번 섞으므로 seed는 길이에 영향을 주지 않는다. 고쳤던 오타 위치0은 custom attempt에 남지만 result는 위치를 포함하지 않았다. `existing-typing-observations.json`에 기록했으며 UI/브라우저 실행 증거는 아니다.

## 추천하는 최소 범위

**완료 결과 아래 별도 ‘틀린 구간 연습’ 자식에서 한 구간씩 명시 시작한다.** 기존 전체 지문 retry/내 글 초안/확정 원문/원 결과는 그대로 둔다. 전체 문장을 다시 읽고 타이핑하는 대신 틀린 단어와 필요한 공백 문맥을 반복할 수 있다. 첫 범위에서 문장·단어 두 모드, 일괄 큐, 자동 다음 구간, 새 공유·복사·저장 기능까지 만들지는 않는다.

1. 기본4모드와 내 글의 **완료 시점**에 원고·연습 언어·시도 ID·확정 입력에서 틀렸던 코드포인트 위치를 메모리 snapshot으로 고정한다. 완료 전에는 구간 시작 버튼을 노출하지 않는다. 시간제에서 아직 입력하지 않은 suffix는 오타 후보가 아니다.
2. 후보는 공백으로 나눈 토큰 단위다. 일반 글자 오류는 그 토큰을, 목표 공백의 오류는 양옆 토큰과 사이 공백 전체를 취한다. 토큰은 언어학적 단어 분석이 아니며 문장부호도 원문대로 포함한다. 동일/겹치는 범위만 합치고 같은 단어의 다른 위치는 별도 후보로 유지한다. 20개씩 표시하며 전체 후보 수를 밝힌다.
3. 각 후보는 원 snapshot의 `[codePointStart, codePointEnd)`와 정확한 slice다. 미리보기에서 공백을 식별할 수 있도록 표시하되 실제 타자 target의 공백·문장부호를 trim/collapse/NFC 변환하지 않는다. 내 글의 기준은 정규화된 **확정 지문**이며 작성 중 원본 초안은 건드리지 않는다.
4. 사용자가 후보와 ‘이 구간 연습’을 누르면 별도 타자칸을 시작한다. 구간 1~1,000코드포인트를 허용한다. 기존 내 글10자 최소값은 바꾸지 않는다. 너무 긴 후보는 잘라서 다른 구간인 것처럼 시작하지 않고 한도 안내로 비활성화한다. 현 기본 원고 최대1,945/내 글1,000 범위에 맞춰 snapshot 방어 상한은10,000코드포인트로 제안한다. 미래 내장 원고가 이를 넘으면 복습만 명시 중지하고 원래 연습은 유지한다.
5. 복습 결과는 이번 구간의 완료·정확도·오타 위치 수만 보여 준다. 짧은1글자 구간의 속도를 일반 평균/최고 기록과 비교하지 않는다. ‘같은 구간 다시’와 ‘닫기’를 제공한다. 정확한 원문 입력 완료를 강제해 정답을 외우게 하는 방식이 아니라 기존처럼 오타를 포함한 입력도 명시 확정 후 결과로 보여 준다.

## 원 결과·IME·비동기 보호

- 복습은 기본 `finish/save`, `typing-test-history-v2`, `typing-test-daily-v1`를 호출하지 않는다. 원고/복습 지문/오타 목록을 URL·localStorage·네트워크·요약에 추가하지 않는다. 원 결과의 기존 ShareResult/요약/전체 retry는 유지한다. 복습 시작·종료·재시도만으로 원고/원 결과를 reset하지 않는다.
- 기존 `errorsRef`/`attempt.mistakes`는 최종 확정 여부와 별개로 일부 입력 중 오류도 기록한다. 새 복습 위치는 **별도 확정 오류 Set**에서 수집해 기존 정확도·오타 집계를 바꾸지 않는 안을 추천한다. `isComposing`/compositionRef가 true인 이벤트에서는 확정 오류를 추가하지 않고 compositionend의 최종 문자열로만 추가한다. 나중에 고친 확정 오타도 복습 후보로 남긴다. 마지막 한글 prefix가 확정됐다면 `customTypingStatuses(..., false)`와 같은 정책으로 오타로 판단한다. 시간 종료 시 아직 조합 중인 글자를 임의로 확정하지 않는다.
- 위치는 기존 비교와 같은 코드포인트 기준이며 grapheme/편집거리 정렬을 새로 보장하지 않는다. 삽입/삭제로 뒤쪽 위치가 달라지면 해당 위치들이 오타로 관측되는 기존 방식임을 설명한다. 이때 틀린 단어의 원인 분석이나 문법 오류라고 표현하지 않는다.
- 새 자식은 `originId + fragmentId + runGeneration`으로 늦은 interval/input/composition/focus를 차단한다. 새 원본 시도·명시 새 지문 적용·다른 작업공간 이동·언마운트는 복습 타이머를 정리한다. 기본/내 글/복습 interval은 동시에 실행되지 않아야 한다. 초안만 편집하거나 앱 locale을 바꾸는 것은 이미 확정된 복습 target을 바꾸지 않는다.
- paste/drop/insertFromPaste·Drop은 타자칸에서 막고 작성 초안칸 정책은 유지한다. IME 조합 중 Enter/Escape/229를 가로채지 않는다. 완료는 한 번만 확정하며 새 복습을 명시 시작/재시도했을 때만 렌더 후 입력칸으로 focus한다. 첫 표시/locale/미리보기만으로 모바일 키보드를 띄우지 않는다.

## 예상 소유 파일/API

- `src/utils/typingReview.ts` 신규: `captureTypingReview(originId,target,lang,committedErrors)` → frozen source/범위 검증·후보, `createTypingReviewAttempt(snapshot,fragmentId)` → 정확한 slice의1~1,000자 attempt. 결과는 기존 `updateCustomTypingAttempt`/명시 IME 상태 로직을 재사용하되 기존10자 constructor를 우회하는 **검증된 별도 생성기**로만 만든다. 제품 구현 전 공통화 필요 여부는 작은 코드 경계로 결정한다.
- `src/components/TypingMistakePractice.tsx` 신규: controlled 완료 snapshot과 active 여부, 후보 페이지·명시 시작·독립 재시도/닫기. 부모 snapshot ID가 달라지면 옛 선택/시도 초기화. 제어44px/입력16px·키보드 label/공백 설명·320px를 함께 설계한다.
- `TypingTest.tsx`, `CustomTypingWorkspace.tsx` 최소 연결: 기존 finish와 별도로 확정 오류 위치를 모으고 완료 snapshot만 자식에 전달한다. 기존 `typingTest.ts`의 점수·단어목록/KST seed/기록 schema는 변경하지 않는다. `customTyping.ts`도 필요한 타입 재사용 이상 변경하지 않는 것이 우선이다.
- 작성 담당이 KO/EN `typingTest.review` 조각과 검사 파일을 함께 소유한다. messages/page/menu/발견 문서의 실제 반영은 통합 담당만 한다.

## 검증 기준과 한계

순수: 고쳤던 오타/미입력 제외·반복 단어 위치·붙어 있는 후보 병합·잘못된 인덱스/원문 불일치 거부, 공백/emoji/자모/문장부호/1·1,000·1,001 및 snapshot 불변. 기본 지문 수치/기존 단위 회귀는 변경 영향만 확인한다.

실제 부모·자식: 기본4모드/내 글 완료 후 복습, original result/text/draft/두 기록 raw bytes 불변, 시간제 untouched suffix 제외, 합성 한글 IME final/중복/늦은 callback·Esc·paste/drop, 재연습/새 원고/모드 왕복 타이머 최대1, locale·focus, 새 원 snapshot에 이전 버튼이 적용되지 않음. native 담당은 실제 영어 입력·합성 IME·320px KO/EN·DOM focus를 별도로 검증하며 실제 모바일 한글 입력기와 구분한다.

이 문서는 코드 읽기와 작은 순수 probe에서 도출한 **미구현 설계**다. 구간 추출·새 child·한글 IME 개선·사용성 효과를 이미 구현/검증했다고 주장하지 않는다. 원래 입력/점수 엔진을 대규모로 바꾸거나 학교/직업별 속도 권고를 추가하지 않는다.

읽기 probe MJS만 ESLint exit0/오류·경고0. Chrome/전체 타입/빌드/제품 TS/공용 메시지 변경은 수행하지 않았다.
