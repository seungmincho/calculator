# 메모장 → 읽어주기 구현 검사

- `scripts/check-text-handoff.ts`: 51 checks PASS. 출처·10분 TTL·30,000자, OCR 호환, 새 탭 저장/readback·실패 닫기, 일회 소비/CAS, 선택 범위·메모 수정 검증.
- `scripts/check-repeat-use-next.ts`: 23 checks PASS. `check-notepad.ts`, `check-tts.ts`: PASS.
- `TextToSpeech.tsx`, `textHandoff.ts`, `check-text-handoff.ts` scoped ESLint: exit 0.
- Notepad ESLint baseline 확인: `git show HEAD:src/components/Notepad.tsx | npx eslint --stdin --stdin-filename src/components/Notepad.tsx`는 기존 `relTime`의 `Date.now()` 호출(298행)에서 `react-hooks/purity` 1건. 현재 파일을 같은 stdin 방식으로 검사하면 같은 코드(342행)에서 같은 오류 1건. 저장소의 규칙 설정이나 inline disable은 추가하지 않았다. 별도 CLI 확인에서 해당 기존 규칙만 제외한 Notepad 검사는 exit 0이다. 따라서 Notepad 전체 lint 통과로 보고하지 않는다.

본문을 URL에 넣지 않고 `toolhub-ocr-tts-v1`의 `source: 'notepad'` payload를 새 대상 탭 sessionStorage로만 전달한다. 대상 탭은 opener를 끊은 뒤 쓰기/readback을 확인하고 내부 경로로 이동한다. 명시적 재생 전에는 읽지 않으며 기기 음성만 활성화한다. 기존 OCR 동일 탭 전달 API/키는 유지한다.

브라우저 독립 검증은 별도 담당자가 수행한다. 전체 타입 검사·빌드·배포는 실행하지 않았다.
