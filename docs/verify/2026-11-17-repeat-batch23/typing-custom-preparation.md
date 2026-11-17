# 23A 미연결 준비 상태

후속: 22차 체크포인트 뒤 부모를 연결했다. 최종 상태는 [typing-custom-implementation.md](typing-custom-implementation.md)에 기록한다. 아래는 미연결 준비 시점의 증거다.

2026-11-17 KST. root 승인으로 새 파일만 작성한 뒤 22A 독립 검토를 위해 TS 편집을 멈췄다. **기존 TypingTest 부모와 기존 typingTest 엔진, 메시지 원본은 변경하지 않았고 이 기능은 아직 경로에 연결되지 않았다.**

- `src/utils/customTyping.ts`: 10~1,000 코드포인트 정규화 preview, 불변 attempt 생성/갱신, 명시 IME 확정 뒤 완료, 기존 타수/정확도/오타 계산 재사용. 결과에는 passage 원문을 넣지 않는다.
- `src/utils/typingClipboard.ts`: summary 복사만 수행하며 native 성공/legacy true/실패/stale를 구분한다.
- `src/components/CustomTypingWorkspace.tsx`: draft/확정 target/attempt 분리, active 이탈 시 실행 초기화·타이머 종료, run generation으로 옛 입력/조합/타이머 완료를 거부하도록 작성한 미연결 child.
- `src/components/TypingSummaryCopy.tsx`: pending/copied/failed와 readonly 수동 선택, 다른 결과/언마운트의 늦은 복사 안내를 무효화하도록 작성한 child.
- `translations-typing-custom.json`: ko/en 초안·미리보기·단위/IME·기록 제외·요약 복구 문구. 공용 병합은 아직 요청하지 않았다.

`node scripts/check-custom-typing.ts` **9그룹 PASS**: 9/10/1,000/1,001 및 emoji 코드포인트, newline/tab/space 정규화와 원 초안 보존, 한글 마지막 글자 조합/확정/중복 완료, prefix 오타 확정, KO/EN 기존 속도/정확도, 오타 수정 이력과 불변성, 시계 입력, 실제 복사 성공/legacy false/throw, stale 성공/거부의 fallback 금지.

새 제품 4파일과 도메인 검사 1파일 scoped ESLint **exit 0, 오류/경고 0**. 작성 도중 JSX 닫기와 cleanup ref 경고를 바로잡고 최종 검사를 통과했다.

22A 독립 검토를 마친 뒤 **제품 TS는 고정한 상태로** `scripts/check-custom-typing-component.mjs`를 작성해 **8그룹 PASS**를 확인했다. 실제 child 코드로 정규화 preview/원초안 보존, 진행 중 초안/다음 단위 변경 분리, 마지막 한글 조합/확정·prefix 오타, 이전 textarea의 늦은 composition 완료, 단일 interval과 retry/비활성/언마운트 정리, 앱 언어 변경 보존, paste/drop/IME 키, ko/en 16px·44px 클래스, 지문 없는 요약·복사 실패/수동 선택/재시도/stale 결과를 확인했다. 이 mjs도 scoped lint **exit 0, 오류/경고 0**이며 기존 `node scripts/check-typing-test.ts` 회귀 **PASS**다.

총 준비 증거는 **순수 9 + actual child 8그룹**, 기존 계산 회귀와 scoped lint다. component harness의 제어된 이벤트/시계/Clipboard 포트를 사용했으며 실제 OS IME/브라우저 타이머·DOM·모바일 결과로 주장하지 않는다. 테스트의 JSX 배열 텍스트 추출이 글자 span 사이에 공백을 넣던 단정만 수정했으며 제품 수정은 없었다.

**남은 작업:** 22차 체크포인트 뒤 root 신호를 받아 기존 부모의 타이머/finish 가드와 기본 결과 복사 경로를 최소 연결한다. 부모/URL/기록·실제 브라우저/전체 타입 검사는 아직 완료하지 않았다. 새 번역 조각은 준비 상태이며 통합 병합은 연결 신호에 맞춘다.
