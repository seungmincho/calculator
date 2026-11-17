# 23A 내 글 타자 연습 독립 검토

2026-11-17 KST. 제품 담당의 최종 focus 보완 이후 코드를 읽고 실제 부모/자식 handler와 별도 수치 기준으로 검사했다. **수정이 필요한 제품 결함은 발견하지 않았다.** 제품 파일·공용 번역은 수정하지 않았고 24B 준비 TS도 고정 상태를 유지했다.

검토 파일은 `TypingTest.tsx`, `CustomTypingWorkspace.tsx`, `TypingSummaryCopy.tsx`, `customTyping.ts`, `typingClipboard.ts` 및 기존 계산기 `typingTest.ts`다. 검사 소유 파일은 이 문서와 `check-typing-independent.mjs`뿐이다.

## 독립 실행 결과

`node docs/verify/2026-11-17-repeat-batch23/check-typing-independent.mjs` **8그룹 PASS**.

1. ASCII/한글/astral 코드포인트 9·10·1,000·1,001 경계 및 선언한 whitespace만 정리. NBSP/zero-width 등 다른 문자를 임의로 지우거나 1,001자를 잘라 허용하지 않는다.
2. 계산 함수에서 기대값을 다시 가져오지 않은 수치 대조: `각` 10개는 30타, 15초에120타/분. 영문10자는30초에4WPM. 두 위치를 틀렸다 고쳐도 정확도80%·오타2. 마지막 받침을 확정하지 않은 오타는 조합 종료 후27타·정확도90%·빠진ㄱ1개이며 중복 확정은 같은 완료 상태를 유지한다.
3. 실제 부모의 오늘/짧은/긴/시간제 네 모드가 완료되고 기존 기록 schema와 최근100개 한도를 유지한다. 오늘의 문장만 일일 횟수를 갱신하고 중복 composition 종료가 다시 기록하지 않는다. 영문 세 모드 속도를 문자 수·시간에서 별도로 계산해 대조했다.
4. 실제 custom 입력의 native `isComposing=false`라도 compositionStart 상태가 유지되는 동안 완료를 보류하고 compositionEnd에서 한 번만 완료한다. 개인 지문·초안은 부모 URL과 기록 bytes에 추가되지 않고 custom 요약에는 지문이나 URL이 없다.
5. 명시 retry 직후 render 전의 옛 composition handler, 이전 interval 및 표준↔custom 반복 왕복을 확인했다. 활성 interval은 최대1, 숨겨진 기본 타이머의 늦은 callback은 기록하지 않으며 옛 입력이 새 시도를 완료하지 않는다.
6. 초안·다음 단위·앱 locale 변경은 진행 중 확정 지문/입력/단위를 바꾸지 않는다. 새 focus 보완은 명시 apply/retry/Escape에서만 host focus를 요청하며 첫 진입·locale·모드 왕복에는 추가 요청하지 않는다.
7. 연습 입력의 paste/drop/beforeinput 차단과 IME Escape/229 무간섭을 확인했다. 초안 작성칸에는 같은 차단을 적용하지 않는다.
8. 실제 공통 복사 자식에서 다른 결과로 바뀐 뒤 늦은 Clipboard 거절이 legacy 복사를 실행하지 않는다. 현재 요청의 거절+legacy false는 실패 및 현재 readonly 요약 선택으로 이어지고, 비활성 뒤 늦은 성공도 안내를 만들지 않는다.

## 코드 경로와 검증 한계

`CustomTypingWorkspace`는 항상 부모에 유지되고 active 이탈 시 실행만 초기화한다. draft와 확정 target은 별개이며 기본 기록 저장 함수는 부모의 표준 finish에만 있다. 개인 지문은 summary 구성에서 제외되고 custom 화면은 ShareResult를 생성하지 않는다. 기본 공유/설정 URL은 기존 네 모드 상태를 그대로 사용한다.

부모와 자식은 기존 VM component harness에서 각각 실제 소스를 컴파일하고 부모 prop을 자식에 전달했다. 시계·interval·storage·Clipboard·focus ref는 제어 포트다. 실제 DOM focus, OS Clipboard, 실제 모바일 IME 또는 브라우저 타이머를 검증했다고 주장하지 않는다. 해당 검증은 verify 담당에게 맡겼다. 부모의 최종 bootstrap은 취소 가능한0ms restore라 fixture도 초기 render 후 해당 callback을 수행했다.

제품 작성자의 자체 검사 전체를 다시 실행하지 않았고 위 독립8그룹만 실행했다. 독립 mjs 한 파일 scoped ESLint exit0, 오류0/경고0. 전체 tsc·Chrome·build·canonical 메시지 수정은 하지 않았다.
