# 오류 문장부터 다시 읽기 — 구현 검사

`TextToSpeech.tsx`, `ttsRecovery.ts`는 오류 당시 본문 전체, 문장 번호/오프셋/문구, 실패 후 재생 세대, 반복 구간·횟수·간격·현재 회차를 메모리에 보관한다. 저장소나 URL에는 추가하지 않는다. 오류 안내의 명시적 재시도만 현재 실패 문장을 다시 읽으며 현재 회차와 남은 반복 횟수를 유지한다.

- 본문 교체/편집, 정지 또는 Escape, 다른 재생 시작, 반복 설정 변경은 이전 실패 위치를 버린다.
- 음성·속도·음높이·음량 변경은 위치를 유지하며 재시도 시 새 설정을 사용한다. 기기 음성 전용 토글은 기존 `stop()` 정책을 유지하므로 실패 위치도 버린다. 기기 음성만 허용한 상태에서 음성이 없으면 재시도할 수 없다.
- `canceled`/`interrupted`는 실패 복구 안내를 만들지 않는 중단으로 처리한다. 내부 정지로 생긴 늦은 이벤트는 세대 검사에서 먼저 무시한다.
- 문장별 settled 플래그와 현재 utterance identity를 함께 확인한다. 같은 재생 세션에서 앞 문장이 늦게 보내는 오류/완료/경계 이벤트도 다음 문장에 영향을 주지 않는다.
- 동기 utterance 생성/`speak()` 예외는 `synthesis-failed` 오류로 같은 복구 경로에 들어간다. 자동 재시도는 없다.

## 자체 검사

- `node scripts/check-tts-recovery.ts`: 25개 PASS. 본문·세대·문장 경계·반복 설정/회차 검증, 마지막 회차, 잘못된 위치/회차, 중단 코드 구분.
- `node docs/verify/2026-11-16-repeat-batch13/check-tts-recovery-component.cjs`: 실제 컴포넌트 이벤트 11그룹 PASS. 중간 문장 재시도, 2회차 실패 후 최종 반복 종료까지 정확한 발화 수(9개 정상+1개 재시도), 본문/반복/정지 무효화, 이전 발화/이전 세대 이벤트, 동기 예외, 음성/속도 변경, 기존 OCR/메모 기기 음성·일회 전달·자동 재생 없음, pause/resume.
- `node scripts/check-tts.ts`, `node scripts/check-text-handoff.ts`(51개): 기존 회귀 PASS.
- `npx eslint src/components/TextToSpeech.tsx src/utils/ttsRecovery.ts scripts/check-tts-recovery.ts`: exit 0.

실제 컴포넌트 이벤트 검사는 React hook과 SpeechSynthesis를 제어한 메모리 실행이다. 실제 OS 음성 합성·모바일 브라우저 검증 결과로 간주하지 않는다. 독립 리뷰는 writing_versions, 브라우저는 batch5_verify, 전체 타입 검사는 batch5_integrate 담당이다. 이 구현 담당은 Chrome·전체 타입 검사·빌드·배포·커밋을 실행하지 않았다.
