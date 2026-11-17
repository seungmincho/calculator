# 54차 오타 구간 연습 — 독립 검토 준비

2026-11-17. 현재 **기존 코드·계약 읽기 단계**다. 새 유틸/자식 ready 신호 후 별도 기대값으로 실행한다. 제품 TS·canonical·공용 호스트·원본 probe/JSON은 수정하지 않았다. root 조율에 따라 52차 실제 부모가 먼저 준비되면 그 독립 검사를 우선하고 54차를 이어간다.

## 읽기에서 확인한 연결 경계

1. 기존 기본 `TypingTest.errorsRef`와 내 글 `attempt.mistakes`는 조합 중에도 `wrong`인 위치를 수집한다. 새 복습 후보는 기존 점수 집계에서 역산하지 않고 별도 committed 집합을 써야 한다. 기존 정확도/자모 집계 변경은 범위 밖이다.
2. `diffTyped`는 마지막 한글이 목표의 prefix이면 명시 확정 후에도 `composing`으로 분류할 수 있다. 새 확정 오류 수집기는 `customTypingStatuses(..., false)`와 동일하게 그 위치를 오류로 취급해야 한다. 조합 중에는 확정 집합에 추가하지 않는다.
3. 시간제 종료는 `typedRef` 전체를 새로 확정한 것으로 처리하지 않아야 한다. 직전 확정 이벤트에서 모은 위치만 snapshot으로 고정하면 아직 입력하지 않은 suffix와 타임아웃 때의 미완성 조합을 후보에서 제외할 수 있다.
4. 원고 기준은 내 글의 `attempt.target`이다. 현재 draft는 별도 값이고 CR/LF/tab·연속 일반 공백 정리는 명시 적용에서 이미 수행한다. 복습 구간의 codepoint slice를 추가로 trim/NFC/collapse하면 안 된다.
5. `CustomTypingWorkspace`는 active=false 때 원래 시도를 새 대기 상태로 만들고 타이머를 정리한다. 복습도 이 active 수명과 원본 시도 ID 변경을 따라 종료해야 한다. 단순 draft 편집·UI locale 전환은 완료 snapshot의 원고를 바꾸지 않는다.
6. 기존 기본 `focusInput`의 timeout은 mounted/standardActive만 확인한다. 새 복습 focus에는 origin/run 소유권을 따로 검사해 오래된 시작 이벤트가 새 타자칸에 focus하지 않게 해야 한다. 이는 읽기상 integration 위험이며 새 기능의 실행 결함으로 기록하지 않는다.

위 1~3·6은 작성자에게 구현 전 전달했다. 기본/내 글 점수·URL·기록 쓰기 경로 전체를 리팩터링하라는 요청은 하지 않았다.

## 독립 실행 예정

- **오류 ledger:** 임의 고정 지문의 코드포인트와 입력을 독립 비교한다. 확정 오타→수정, composing 중 잘못된 자모→정상 확정, 조합 종료 중복, 마지막 확정 prefix, 입력 길이보다 뒤인 미입력 영역 제외를 구분한다.
- **구간 oracle:** 반복 토큰의 다른 위치는 별도, 목표 공백 오타는 양옆 토큰과 정확한 사이 공백, 겹친 범위만 합침. 원본 slice와 `[start,end)` 일치, NBSP/emoji/결합 자모/문장부호, 경계 공백, 1/1000/1001 및 10000 snapshot 상한을 검사한다. 단어의 언어학적 의미/편집거리 정렬은 주장하지 않는다.
- **불변/권한:** 외부 error array 변경, origin/fragment ID 불일치, 다른 snapshot의 fragment, 잘못된 인덱스, source 브랜드/동결 경계를 검증한다.
- **실제 자식:** 첫 표시 focus 0, 명시 start/retry에서만 focus, 코드포인트 원문 exact, IME ref+event true/229·Enter/Escape, paste/drop/beforeinput 거부, 완료1회, close/active false/새 origin/unmount의 타이머·늦은 input/예약 무효화를 별도 host에서 실행한다.
- **분리:** 이 child에는 원래 기본 기록이나 custom draft 저장 포트를 제공하지 않는다. 부모 연결 후에는 두 storage key bytes와 원 결과·원 draft를 실제 parent fixture에서 별도로 확인한다. 순수/child PASS를 부모 연결 PASS로 표현하지 않는다.

공용 React 이벤트 호스트만 재사용 가능하며 작성자 assertion은 가져오지 않는다. 제어 clock/IME event는 실제 모바일 입력기와 구분한다. Chrome·전체 tsc·빌드·배포·실사용 데이터 접근은 수행하지 않는다.

## 읽기 시 원본 SHA-256

- `src/components/TypingTest.tsx`: `4cbf764e7c486671d493eb8b4878e881da006010db27cce84ea6c42a4e24c654`
- `src/components/CustomTypingWorkspace.tsx`: `d595332e572199bb8d8915ce13ff9ed6f9ba392c3e1e9b15d9bb8b214e4323a0`
- `src/utils/customTyping.ts`: `582cd5e56585833b67c01669ad339c8137d7cb4f5e6a089517faa53bdfeceb24`
- `src/utils/typingTest.ts`: `6b0f4e82861516a2f27a40b11185585faf3230849763789c64c232b02217296d`
- `existing-typing-observations.json`: `77af9b4b62af3c5a4f299cce9c7e456a0e8deb616910daf2b29b6fea3a8a58b8`
