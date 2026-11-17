# 46차 TTS 읽던 원고 목록 — 실제 부모 독립 검토

2026-11-17. 준비 단계 독립8그룹을 반복하지 않고 새 `TextToSpeech`→`TtsReadingList` 연결을 검토했다. 작성자의 `tts-parent-harness.mjs`에서 실제 두 컴포넌트와 저장소/음성/Clipboard/잠금 포트만 재사용했다. 기존 작성자 assertions는 실행·복제하지 않았으며 직접 만든 원고 `First. Second. Third.`의 수동 위치(0..6,7..14,15..21)와 기대값을 대조했다. 제품 수정은 taxi 담당만 수행했다.

## 발견 및 영향 검증

**P2: 최신 음성 목록이 빈 배열이면 이전 로컬 음성을 계속 재생.** `voiceschanged`에서 `getVoices()`가 `[]`를 반환할 때 기존 early return이 이전 voice/state를 유지했다. local-only 상태임에도 Play가 활성화되며 캡처된 이전 Play callback 및 진행 문장의 onend에서 각각 새 발화1개가 생성됐다.

- 수정 전 두 경로 근거: `independent-parent-empty-voices-before-fix.json`.
- 검사: `node docs/verify/2026-11-17-repeat-batch46/check-reading-parent-independent.mjs --match='empty current'`.
- taxi 최소 수정: 빈 목록에서도 `availableVoices`와 `live.voice`를 즉시 비우고 `voices=[]`/로컬 음성 안내 반영. 저장된 음성 요청 의도와 초기 목록 대기 정책은 유지.
- 수정 후 정지·다음 문장·반복 대기 callback 세 경로 모두 Play 비활성/새 발화0 PASS.
- 영향 검사에서 로컬 음성이 다시 나타나면 Play는 활성화되지만 intent 없는 분기의 `noLocalVoice` 안내가 남는 후속 모순도 확인했다. taxi가 nonempty 목록 도착에도 현재 local-only/허용 음성에 맞춰 안내를 정리했고, 세 경로 모두 로컬 음성 재도착 후 재생 가능·옛 안내 제거 PASS다.

## 독립 고유 8그룹

1. 빈 현재 음성 목록: 화면 버튼·이전 진입 callback·다음 문장·반복 대기 조각 차단. 로컬 음성 재도착 때 재생 가능/안내 복구 확인.
2. hydration 이전 직접 원문 편집이 URL보다 우선, 준비 전 목록 저장 비활성·목록 행 미복원. 언마운트 뒤 pending load/paste가 원고나 저장 bytes를 바꾸지 않음.
3. 저장 음성 intent는 빈 목록→원격만→저장 local 음성의 늦은 도착에도 유지. 목록 load는 자동발화0이고 이후 Play만 저장 위치·rate/pitch/volume으로 발화. 명시 음성 선택 뒤에는 늦은 목록이 이전 저장 음성을 되살리지 않음.
4. capture 위치는 실패 복구→speaking/paused→복원된 startFrom 순서로 실제 부모 상태와 일치. rate 변경에도 실패 위치 유지, Stop은0. 자동 onend는 inputRevision을 올리지 않아 잠금 대기 중 저장된 문장 snapshot을 덮지 않음. 반복 대기는 첫 문장 위치를 저장.
5. 명시 load는 이전 utterance end/error/boundary·반복 gap callback을 무효화하고 stopped/반복off·저장 시작 위치로 복원. 자동 speak0, 다음 Play만 시작. 읽기 목록 bytes/voice preference key 보존, 기존 `tts.settings` best-effort effect 쓰기만 허용. 정상 끝은 다음 시작0으로 정리.
6. pending load 뒤 직접 text/rate/voice/repeat/play/paste intent 6종은 AbortSignal과 revision으로 취소. 자동 voice arrival는 명시 원문 작업이 아니므로 대기 load를 취소하지 않으며 최신 voice로 복원.
7. 이전 paste/link의 늦은 성공·거절과 copied 타이머는 새로 불러온 원고/안내를 덮지 않음. 새 링크는 복원된 전체 원고와 속도를 포함. 실제 OS Clipboard 쓰기를 취소한다고 주장하지 않음.
8. OCR/메모 전달이 목록보다 우선하고 local-only·정확 raw consume·새 탭 자동발화/초기 cancel0을 유지. `t`가 있으면 URL 원고/속도가 우선하고 미사용 handoff raw 보존. 유효한 원문 slice이나 현재 chunk와 불일치하는 저장 위치는 원고를 열고0번부터·위치 변경 안내, 자동발화0. locale 변경은 원고를 바꾸지 않음.

검사는 `check-reading-parent-independent.mjs`에 있다. 초기6그룹과 영향2그룹을 별도로 실행했으며 반복을 합산하지 않는다. 초기 hydration 검사에서 목록을 읽기 전에는 load 행 자체가 없다는 실제 초기 정책에 맞춰 fixture를 저장 버튼 비활성/행 없음으로 고쳤다. 제품 결함으로 집계하지 않는다.

실제 SpeechSynthesis/OS 소리·마이크·원격 음성 호출·실제 브라우저를 사용하지 않은 제어포트 검증이다. native 담당의 OS/API 모사 검증과 구분한다. 제품 TS/공용 번역/전체 tsc/빌드/배포/커밋 변경·실행 없음.

최종 상태: **실제 부모 독립8그룹 PASS, 추가 미해결 결함0**. 준비 독립8그룹과 합계16 고유 그룹이며 재실행을 더하지 않는다. 빈 목록 P2와 재도착 안내의 영향 재검증은 해당1그룹만 수행했다. 독립 MJS 범위 ESLint 최종 exit0, 오류·경고0.
