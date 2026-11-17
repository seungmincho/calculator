# 46차 실제 부모 연결 직전 지도

상태:44/48/49 타입 체크포인트 대기 중 **읽기 문서만** 보완했다. 준비 pure9+child5 이후 제품 TS를 수정하지 않았다. 실제 부모 구현·음성포트 검증은 다음 승인 뒤 한다.

## 적용 함수와 현재 위치

현재 부모의 `text/segments/status/cur/idx/session/live/recoveryRef`를 유지한다. 목록 상태를 기존 원고 state의 두 번째 저장소로 만들지 않는다. 신규 `startFrom`은 열기 직후 stopped 상태의 다음 시작 위치일 뿐, 실제 재생 중 진행은 기존 idx/cur가 계속 소유한다.

`captureReadingDraft()`는 최신 원고/segments와 설정을 복제하고 다음을 전달한다.

- 현재 문장 의미는 `idx.current`이며 단어 boundary의 `word[0]`를 bookmark로 쓰지 않는다.
- recovery는 `canRetryTtsRecovery`가 원문·generation·repeat 문맥에서 유효한 경우에만 우선한다.
- currentIndex는 speaking/paused/반복대기에서 사용하고, stopped는 복원한 startFrom(기본0)을 사용한다.
- 설정은 실제 선택된 derived voice 이름을 우선하고 없으면 요청된 voiceName/null, current rate/pitch/volume/local-only를 사용한다. 음성 객체나 반복 회차는 저장하지 않는다.
- 실제 helper가 text/position/settings 범위를 거부하면 child는 원고를 자르지 않고 오류를 표시한다.

`applyReadingRecord(load)`는 초기 initialized 및 현재 요청의 소유권을 확인한 뒤 동기 적용한다. child가 raw/lock/자체 inputRevision을 확인한 후에만 호출한다. 적용 순서는 **기존 stop/session 증가 → 이전 붙여넣기·링크 안내·recovery/gap 무효화 → repeat off/pass1/word null → 원고·settings·voice intent·startFrom·idx/cur → live ref 새 snapshot**이다. status=stopped를 유지하고 synth.speak/resume을 호출하지 않는다. index=null이면 읽을 문장0 안내, positionMatched=false면 원문은 열되 첫 문장부터 다시 선택하도록 안내한다.

child는 apply 직전에 자신의 busy 소유권을 끝내므로 부모가 자기적용 revision을 올려도 늦은 load 취소 loop를 만들지 않는다. 이후 Play/Space만 startFrom으로 재생하며, reader의 명시 문장 클릭은 기존 해당 문장 재생을 유지한다. 원고편집/명시Stop/정상끝은 startFrom0으로 돌아간다.

## 사용자 세대와 자동 진행의 분리

`inputRevision`은 원문 편집·예제/정리/비우기·붙여넣기 시작·voice/local-only/rate/pitch/volume·repeat 옵션·명시 재생/일시정지/정지/문장 클릭/실패재시도에서만 올린다. 자동 onend/onboundary·반복 다음 회차·cur/word/시간 표시 갱신에는 올리지 않는다. 이 분리로 읽는 중 저장할 문장 snapshot이 음성 callback마다 취소되지 않는다.

엔진 내부 `run`/cleanup용 stop과 사용자 intent wrapper를 구분한다. 부모가 새 사용자 동작을 처리하면 아직 대기 중인 목록 save/load를 child가 취소한다. 삭제와 목록 재조회는 현재 원고·읽기를 건드리지 않는다. 입력 원문 제한은 기존대로 두고 목록 생성 한도만30,000 UTF-16이다.

## local-only 및 늦은 voice 목록

실제 부모의 현재 `speakFrom` 시작 가드는 closure의 `localVoicesOnly && !live.current.voice`뿐이고, live snapshot에 local-only가 없다. 이 상태로 새 목록을 연결하면 이전 closure/설정 commit 시점에 기대가 어긋날 수 있으므로 다음 **두 방어를 실제 코드와 검사에 포함**한다.

1. 화면 `canPlay`는 local-only=true이면 실제 선택 음성이 있으며 `voice.localService===true`일 때만 활성화한다.
2. speakFrom 진입 및 매 조각의 `new SpeechSynthesisUtterance` 직전에 **동일한 최신 live.localVoicesOnly와 live.voice.localService**를 확인한다. local-only=true인데 null/remote면 발화0, stopped/음성 선택 안내다. null voice를 기본 시스템 음성에 넘겨 해결하지 않는다.

현재 `voiceschanged/load`는 선택 이름이 없으면 `tts.voice`로 되돌린다. 목록 load의 `{requestedName, localOnly, generation}` 의도를 별도 ref에 두고, 늦은 voiceschanged는 이 현재 의도를 우선한다. 허용 목록에서 저장 이름이 없으면 허용 fallback과 누락 안내, local0이면 재생 차단을 유지한다. 늦게 음성이 나타나도 자동 speak/resume하지 않는다. 직접 voice/local-only 변경은 이전 record intent를 해제한다. 목록 적용에서 기존 `changeVoice`를 호출하지 않는다(현재 speaking이면 즉시 speakFrom을 호출하는 부수효과가 있다).

목록 열기 자체가 voice preference key를 새로 쓰지 않는다. rate/pitch/volume state 복원은 기존 `tts.settings` effect를 통해 best-effort 저장될 수 있으나, 목록 저장 성공과 같은 결과로 표시하지 않는다.

## 이전 비동기 Clipboard와 원고 교체

현재 `pasteClipboard`는 await 뒤 무조건 changeText한다. 새 목록을 연 뒤 이전 paste가 끝나면 불러온 원고를 덮을 수 있으므로 시작 당시 manuscript-action generation을 캡처하고 readText 완료/실패 직전에 확인한다. 명시 load/직접 편집/새 paste/unmount가 이전 request를 무효화한다. 새 목록은 Clipboard 원문을 요청하거나 자동 붙여넣기하지 않는다.

현재 링크 복사의 copied/copyFailed 및2초 timer도 await 당시 원고/요청 세대를 확인하도록 최소 연결한다. 예전 요청의 성공/실패/timer가 새 원고 안내를 바꾸지 않게 하며 URL1500 한도와 기존 native 성공 정책은 유지한다. 새 수동 복사 UI나 시스템 Clipboard 쓰기 취소 보장은 추가하지 않는다. notice의 기존 flash timer도 새 원고/새 notice를 지우지 않도록 소유권을 확인한다.

## 초기 진입과 남은 실제 부모 검사

URL truthy t → from handoff, URL rate 우선, local-only handoff, session의 정확 raw 소비를 그대로 유지한다. 새 목록 read는 자동 원고 적용0/목록쓰기0이다. 기존 settings 자동 쓰기까지0이라고 잘못 기대하지 않는다. initialized 이전에는 목록액션을 비활성화한다.

다음 실제 부모 fixture는 SpeechSynthesisUtterance와 synth만 제어하여 발화 payload/호출 수를 확인한다. 실제 소리/마이크/원격 발화는 사용하지 않는다.

- speaking/paused/failure/repeat-wait snapshot의 정확 문장, old end/error/boundary/gap callbacks 이후 새 원고 유지.
- 현재 원고를 명시 열기 → 발화0 → 다음 Play가 정확 저장 문장, stale split이면 index0 안내·자발적 시작만.
- saved local-only + local0 + remote만 존재: canPlay 비활성뿐 아니라 이전 handler/직접 speak 경로에도 utterance 생성/발화0. local arrival와 user override 후 늦은 voice load의 의도 보존.
- 목록 load 대기 중 원문/설정/명시 재생 변경 취소, 자기 apply revision은 정상 적용.
- old paste/link reject/success/timer, URL/from 초기 우선/locale 원고 유지, 손상 목록이 정상 TTS를 막지 않음.
- 기존13차 recovery 및 default140/meeting1000 회귀 중 변경 경계만 추가 실행한다. 실제 native 브라우저와 전체 타입은 지정 담당자 범위다.
