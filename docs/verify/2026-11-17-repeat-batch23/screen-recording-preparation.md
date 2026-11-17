# 23B 화면 녹화 다시 찍기 — 미연결 준비

2026-11-17 KST · writing_versions. [23차 계약](plan.md)과 [기존 코드 조사](../../handoff/2026-11-17-after-batch22-candidates.md)를 읽고 기존 `ScreenRecorder.tsx`를 대조했다. **기존 부모는 수정하지 않았다.** 실제 개인 화면·마이크, OS 권한창, Chrome, 전체 tsc, 빌드·배포·패키지 변경을 실행하지 않았다.

## 준비된 작은 단위

- `src/utils/screenRecording.ts`: 원래 high/medium/low 해상도·bitrate와 30/60 FPS, WebM 지원 형식 선택, 실제 MIME 확장자 판정, 단조 활성 시계, generation이 있는 순수 상태기계.
- `src/lib/screenRecording/ownership.ts`: 한 attempt가 얻은 display/mic/final stream의 track 집합, recorder, AudioContext, listener/timer cleanup을 소유하는 도우미. 중복 track/context를 한 번 정리하고 취소 이후 들어온 자원도 즉시 정리한다.
- `ScreenRecordingSessionPanel.tsx`: 현재 준비/마이크 선택/녹화/일시정지/종료 중을 표시하는 제어형 자식. 직접 캡처하거나 타이머를 만들지 않는다.
- `ScreenRecordingLastResult.tsx`: 마지막 성공 결과의 별도 미리보기·이름·bytes·활성 시간·실제 MIME·시작 때 연결한 오디오 트랙, 명시 다운로드/삭제 확인 UI. 삭제 callback에는 result ID를 전달한다.
- `translations-screen-recorder.json`: 위 자식의 ko/en 조각. **23차 연결 전 공용 메시지에 병합할 필요는 없다.** UI는 현재 경로에서 렌더되지 않는다.

## 상태 계약

`idle → preparing → recording → paused/resumed → stopping → idle`을 기본으로 한다. 마이크를 요청했지만 얻지 못하면 `preparing → audioChoice`이며 ‘마이크 없이 녹화 시작’ 또는 ‘녹화 준비 취소’를 사용자가 명시 선택한다. 재시도 준비는 마지막 성공 결과를 그대로 유지한다.

`ScreenRecordingState.result`는 현재 attempt의 시계/설정/오디오와 별도다. prepare는 result를 지우지 않으며 cancel/fail은 result를 교체하지 않는다. 현재 generation의 stopping 상태에서 비어 있지 않고 MIME/Blob 형식이 맞는 결과를 전달했을 때만 complete를 허용한다. 이미 실패해 idle로 돌아간 attempt의 뒤늦은 complete와 이전 generation의 이벤트는 무시한다. 결과 삭제도 현재 녹화 상태를 초기화하지 않는다.

중복 시작은 preparing/audioChoice/recording/paused/stopping에서 거부한다. 녹화 시간은 `performance.now()`를 주입한 now 포트로 활성 구간을 계산한다. tick 횟수는 시간 계산에 쓰지 않는다. 일시정지와 종료에서 누적하고 resume에서 새로운 활성 구간을 연다. 이전 결과 시간은 새 attempt가 0초로 시작해도 유지한다. 기기 절전과 실제 컨테이너 재생 길이까지 동일하다고 보장하지 않는다.

준비 당시 단위는 **순수 reducer 및 자원 소유 도우미**였다. 22차 체크포인트 뒤 display→mic Promise 체인, recorder callback, URL 소유권, AudioContext 합성과 부모 연결을 완료했다. 최종 구현 및 제어 포트 26그룹 검사는 [연결 결과](screen-recording-implementation.md)를 따른다. 아래 내용은 준비 시 합의한 계약과 검사 계획이다.

## 다음 연결의 media 포트·소유권

후속 미연결 coordinator는 주입 가능한 포트로 구성한다. `getDisplay(config)`, `getMicrophone()`, `composeAudio(display,mic)`, `createRecorder(stream,mime,bitrate)`, monotonic/wall-clock, timer, object URL 생성/해제를 분리한다. 실제 브라우저 adapter 외에는 navigator/MediaRecorder 전역을 직접 호출하지 않는다. 테스트는 제어 포트와 canvas stream을 사용한다.

한 attempt는 generation, 설정 snapshot, owner, recorder, 자신의 chunks, 실제 audio 연결 정보, 활성 시계, tick timer, 종료 timeout을 가진다. 전역 chunk 배열을 다음 녹화와 공유하지 않는다. 모듈이나 컴포넌트 mount만으로 권한을 요청하지 않는다.

1. `start`는 지원 형식과 설정을 확인하고 preparing 상태를 먼저 확정한다. 이전 결과 URL은 유지한다.
2. display Promise가 끝나면 current generation을 확인한다. stale이면 받은 track만 즉시 닫는다. 현재 attempt이면 owner에 등록한다.
3. **display를 얻은 직후 video track ended listener를 등록한다.** 마이크 권한 대기 또는 audioChoice 중 공유가 끝나면 attempt를 폐기하고 display를 정리한다. 뒤늦게 허용된 mic도 owner가 이미 종료됐다면 즉시 닫고 recorder를 만들지 않는다. 이 요청은 root의 준비 검토에서 추가된 필수 경계다.
4. 요청한 system audio와 실제 display audio track을 구분한다. 요청한 mic를 얻지 못하면 audioChoice에 머무르며 ‘마이크 없이 계속’을 눌러야 녹화를 시작한다. 마이크가 없어도 이전처럼 화면 단독/제공된 시스템음 녹화가 가능하되 포함한 것처럼 표시하지 않는다.
5. 실제 두 오디오 소스를 합쳐야 할 때만 AudioContext와 destination을 만들고 owner에 즉시 등록한다. 부분 생성 실패도 context/source/destination/stream을 정리한다. 합성 stream과 원본 display/mic에 같은 video track이 있어도 한 번 정리한다. AudioContext resume 실패를 무시하고 오디오 포함으로 표시하지 않는다.
6. recorder event는 모두 attempt identity/generation으로 확인한다. dataavailable은 해당 attempt의 chunks에만 넣는다. onerror는 실패를 먼저 확정하고 이후 dataavailable/stop으로 결과를 만들지 않는다. 브라우저 공유 중단은 녹화 중이면 정상 stop 경로, 준비 중이면 준비 실패/취소 경로다.
7. stop은 stopping을 먼저 설정해 중복 호출을 막고 시계를 동결한다. 최종 onstop을 기다리되 10초 종료 확인 제한을 둔다. timeout/error/unmount는 성공 파일을 만들지 않고 해제한다. 캡처 track을 조기에 정리하는 경우 ended listener를 먼저 제거해 자기 정리가 재진입하지 않게 한다.
8. 정상 onstop의 비어 있지 않은 Blob을 구성하고 실제 recorder/chunk MIME을 확인한다. 새 URL 생성까지 성공한 뒤에만 마지막 결과를 교체한다. **새 결과를 확정하기 전에 이전 URL을 revoke하지 않는다.** 생성/형식/빈 Blob 실패는 이전 결과를 유지하고 새 임시 URL만 정리한다.
9. 마지막 결과 URL은 결과 교체·명시 ID 일치 삭제·unmount에서만 revoke한다. 오래된 삭제 확인이나 이전 다운로드 callback이 새 결과를 지우지 않게 현재 result ID를 재확인한다. 다운로드 요청과 실제 디스크 저장 성공은 구분한다.

권한창은 사용자 선택을 기다리는 동안 임의 시간 초과로 다시 요청하지 않는다. 준비 취소는 logical cancellation이며 브라우저 OS 선택창을 강제로 닫는다고 주장하지 않는다. 늦은 허용의 track 정리는 Promise 완료 시 수행한다.

## MIME·음성·표시 범위

우선 기존 WebM 후보에 대해 `isTypeSupported`를 확인한다. 모두 false이면 지원 실패를 안내하고 미지원 WebM을 강제로 요청하지 않는다. 실제 결과 MIME에서 확장자를 판정하며 이름만 WebM/VP9로 하드코딩하지 않는다. mp4 MIME의 확장자 판정 helper는 오표기 방지를 위한 것이며 새 MP4 인코딩 옵션이나 모바일 캡처 지원을 추가했다는 뜻이 아니다.

오디오 UI의 ‘연결됨’은 녹화 시작 때 연결한 트랙을 뜻한다. 요청 옵션만 보고 마이크/시스템음을 포함했다고 표시하지 않는다. 트랙이 존재해도 소리가 실제로 있었는지 보장할 수 없으므로 마지막 결과를 재생해 확인하도록 안내한다. 실제 source의 audio track 종료를 관찰하는 경우 현재 연결 상태 안내를 추가하되 이전 구간까지 음성이 없었다고 단정하지 않는다.

## 현재 검사와 남은 검사

`node --experimental-strip-types scripts/check-screen-recording-state.ts` **10그룹 PASS**: 결과 유지/권한 취소·초기화 실패, 중복 시작·stale generation, micChoice/실제 audio 분리, delayed tick·일시정지 제외, 시계 역행/중복 전환, error 뒤 complete·빈/다른 MIME 거부, 정상 교체·명시 삭제, MIME 지원/확장자, 자원 중복 해제·handler 분리, 늦은 display/mic/context/recorder 정리. 실제 media capture는 0회다.

상태/owner/검사 3파일 및 자식 2파일 scoped lint 오류·경고 0. 이 준비 검사에는 아직 전체 recorder event loop, Blob 재생, URL 교체 및 부모 렌더 연결이 포함되지 않는다.

22차 체크포인트 뒤 coordinator와 부모를 연결할 때 우선할 검사는 다음과 같다.

- display 지연 허용/거부, 중복 시작, 취소 후 새 attempt, 언마운트 후 허용.
- display 확보 직후 ended, mic 대기/audioChoice에서 ended 후 늦은 mic 허용.
- pause/resume, 백그라운드 tick 지연, stop/error/data/stop의 순서, 오래된 이벤트의 새 attempt 간섭 없음.
- 마지막 파일이 있는 상태에서 권한 취소/AudioContext·recorder constructor·start·URL 생성/빈 Blob 실패 후 이전 미리보기·다운로드 유지.
- 새 정상 파일 확정/명시 삭제/unmount의 URL·stream·context·timer 해제.
- verify 단독 실제 canvas.captureStream→MediaRecorder→비어 있지 않은 영상 Blob→다운로드/재생. 실제 개인 화면·마이크는 캡처하지 않으며 OS 선택창/실기기 검증으로 과장하지 않는다.
- KO/EN·320px·44px/16px와 현재/이전 결과의 명확한 구분.

## 공식 API 근거

[W3C MediaStream Recording 초안](https://www.w3.org/TR/mediastream-recording/)은 recorder의 실제 MIME과 상태/이벤트 의미를 정의한다. 초안의 구현 차이가 있을 수 있으므로 API 반환/이벤트를 확인한다. [MDN error event](https://developer.mozilla.org/en-US/docs/Web/API/MediaRecorder/error_event)는 오류 뒤 최종 dataavailable과 stop이 올 수 있음을 설명한다. 따라서 stop 자체를 성공의 충분조건으로 취급하지 않는다. [MDN performance.now](https://developer.mozilla.org/en-US/docs/Web/API/Performance/now)는 단조 시계와 OS 절전 중 구현 차이를 설명한다. tick 횟수 기반 시간을 대체하되 영상 재생 길이와 동일하다고 약속하지 않는다.
