# 46차 읽기 목록 — 실제 부모 연결

2026-11-17. 부모 연결/작성자 검사 완료, 제품 TS 고정. **준비 pure9+child5+부모9=자체23그룹 PASS**다. 준비 독립8은 별도이며, 실제 부모 독립/native/전체 타입은 담당자의 후속 결과를 기다린다.

독립 부모 검사에서 `voiceschanged`의 최신 목록이 `[]`일 때 이전 local voice가 남는 P2가 재현됐다. 빈 목록도 state와 available/live ref에 즉시 반영해 이전 Play 핸들러와 다음 문장 진입을 차단했다. 기존 초기 로딩 timeout과 record voice intent는 유지한다. 독립 `--match=empty` 영향1 및 기존 작성자 local-only 영향1 PASS, `TextToSpeech.tsx` 추가 scoped ESLint exit0/경고0. 원래 before-fix 관측 JSON은 보존했고 자체23에 반복 영향 검사를 더하지 않는다.

같은 영향 경계에서 local voice가 돌아온 뒤 이전 noLocalVoice 안내만 남는 모순도 수정했다. record intent가 없는 목록 갱신도 현재 허용 음성 유무로 안내를 정리하며, stopped/speaking/repeat-wait 및 복구 안내를 포함한 독립 empty 영향1과 부모 lint0를 확인했다.

## 구현과 보존

`TextToSpeech.tsx`에 `TtsReadingList.tsx`/`ttsReadingRecords.ts`를 연결했다. key/lock은 `toolhub-tts-reading-list-v1`, schema/version·strict parser·CAS/readback은 준비 계약 그대로다. 최대8개/원문30,000 UTF-16/이름40/음성이름512이며 입력을 잘라 저장하거나 자동 축출하지 않는다. 기존 textarea의 입력 한도는 변경하지 않았다.

저장 위치는 유효 recovery → speaking/paused의 idx 문장 → stopped의 복원 startFrom(기본0)이다. 원문 offset/slice를 대조하고 반복 pass/gap/generation/음성 객체는 저장하지 않는다. 열기는 명시 확인과 raw/lock/입력 세대 검사를 통과해야 한다. 부모는 기존 stop/session으로 old utterance/gap/recovery를 무효화하고 원문·설정·음성 의도·startFrom을 적용한다. **자동 발화0**, 다음 Play/Space만 저장 문장부터 시작한다. 현재 split과 위치가 다르면 원문을 열되 첫 문장 재선택 안내를 제공한다. 삭제/재조회는 현재 원문·발화를 바꾸지 않는다.

음성 복원은 현재 기기 목록과 마지막 record intent를 사용한다. 늦은 voiceschanged가 기존 tts.voice로 방금 연 원고의 선택을 덮지 않는다. 직접 voice/local-only를 바꾸면 record intent를 해제한다. local-only=true이면 localService===true인 음성만 선택하며 **canPlay, speakFrom 진입, 각 utterance 생성 전** 모두 최신 live 설정을 검사한다. local0/null/remote이면 발화0/안내이고, 늦은 음성 도착도 자동 재생하지 않는다.

명시 원고/설정/재생만 inputRevision을 증가시키며 자동 진행은 저장 snapshot을 취소하지 않는다. 원고 열기 뒤 이전 Clipboard readText가 원고를 바꾸지 못하고, 링크의 늦은 성공/실패/timer는 요청·수명·언어 세대로 무효화한다. 이미 OS에 맡긴 Clipboard 작업 자체를 취소한다고 주장하지 않는다. 새 Clipboard 대안 UI/원격 모델은 추가하지 않았다.

초기 URL truthy t가 from보다 우선하고 URL r은 기존 속도 우선이다. from의 local-only/정확 raw 소비/자동발화0을 유지한다. hydrate 전 명시 편집 원고는 URL로 덮지 않는다. 목록은 initialized 이전 비활성, 초기 목록쓰기0/자동 적용0이다. 기존 tts.settings의 rate/pitch/volume 저장은 별개이므로 모든 초기쓰기0으로 표현하지 않는다. 목록 열기는 voice preference key에 새 writer를 추가하지 않는다.

제품 파일은 부모 `TextToSpeech.tsx`, 준비 `TtsReadingList.tsx`, `ttsReadingRecords.ts`, `tts.ts`다. 준비 이후 helper 정책 변경 없음. KO/EN `translations-tts.json` **44leaf** 최종이며 준비본과 값 동일, canonical/가이드/메타는 통합 담당 소유다.

## 검사 근거

- `node scripts/check-tts-reading-records.ts`9 + `check-reading-list-child.mjs`5 PASS는 preparation에 있다. 부모 연결 중 helper는 바꾸지 않아 전체를 반복하지 않았다.
- `node docs/verify/2026-11-17-repeat-batch46/check-tts-parent.mjs` — 실제 부모+실제 자식 **9그룹 PASS**: URL/from/early input, speaking/paused/failure capture,load/old speech+gap/no autoplay,local0 실제 발화0/voice 도착·override/대기중 최신voice,load 중6종 intent+unmount,late paste/link/locale ABA,stale split/30,001 입력 보존,기존 exact recovery/current settings/sync throw,손상목록 독립·삭제/재조회 발화 유지.
- `node docs/verify/2026-11-17-repeat-batch46/check-tts-legacy-bridge.mjs` — 기존13차 실제 callback **11그룹 PASS**. 원래 검사/assertion은 수정하지 않고 새 LayoutEffect/Language/읽기목록 host 포트만 연결했다. 두 번째 반복 회차·남은 회차/모든 repeat 필드/cancellation/pause-resume/OCR·메모장까지 포함한다. 새23그룹에 중복 합산하지 않는다.
- 준비 단계 기존 `check-tts.ts` PASS, `check-tts-recovery.ts`25checks PASS, `check-meeting-handoff.ts`11checks PASS 유지. default140/meeting1000 정상 회귀와 invalid max RangeError/max1 pair2 UTF-16 예외는 준비 검사 범위다.
- 마지막 링크 버튼 초기 ready/복사 상태 보완 뒤 부모 `clipboard`1그룹만 영향 재실행 PASS했다(중복 합산0).
- 부모/child/util2/TS검사/JS검사4 **9파일 scoped ESLint exit0/경고0**. 기존 부모 baseline lint0에서 새 진단0. bridge의 처음 CJS require-import lint4건은 MJS로 바꾸고 같은11회귀를 재확인했다. 제품 결함으로 집계하지 않는다.

실행한 최종 lint 명령:

```text
npx eslint src/components/TextToSpeech.tsx src/components/TtsReadingList.tsx src/utils/ttsReadingRecords.ts src/utils/tts.ts scripts/check-tts-reading-records.ts docs/verify/2026-11-17-repeat-batch46/tts-parent-harness.mjs docs/verify/2026-11-17-repeat-batch46/check-tts-parent.mjs docs/verify/2026-11-17-repeat-batch46/check-reading-list-child.mjs docs/verify/2026-11-17-repeat-batch46/check-tts-legacy-bridge.mjs
```

host는 실제 제품을 번들하고 SpeechSynthesis/Utterance·Clipboard·lock·저장소·시계를 합성 포트로 제어한다. 실제 음성/마이크/개인 원고/공개 RPC/Chrome/전체 타입/build를 작성자가 실행하지 않았다. 준비 독립8과 실제 부모 독립은 구분한다.

## Native/독립 선택자

| 목적 | 선택자 |
| --- | --- |
| 상태 | `[data-tts-root]`: data-tts-status/current/start-from/ready |
| 원고/설정 | 기존 #tts-text/tts-voice/tts-rate/tts-pitch/tts-volume |
| 재생 | `[data-tts-play]`, `[data-tts-stop]`, `[data-tts-retry]`, reader `[data-i]` |
| 옵션/안내 | `[data-tts-repeat]`, `[data-tts-local-only]`, `[data-tts-voice-notice]`, `[data-tts-resume-position]` |
| Clipboard | `[data-tts-paste]`, `[data-tts-copy-link]` |
| 목록 | data-tts-reading-list/name/save/record/load/delete/confirm=load 또는 delete/cancel/refresh/error/success |

FileReader는 없다. Clipboard readText/writeText 지연으로 비동기 원고 경계를 확인한다. old utterance onend/onerror/onboundary·반복 gap·voiceschanged는 session/voice intent 검증 대상이다. 실제 발음이나 원격 전송 시험 대신 합성 speech 포트와 native 저장/UI/키보드를 분리한다.
