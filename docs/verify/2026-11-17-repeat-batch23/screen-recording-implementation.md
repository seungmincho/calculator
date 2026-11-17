# 23차 B 화면 녹화 연결 결과

2026-11-17 KST. `ScreenRecorder` 기존 경로에 연결 완료. 메타·canonical·원본 번역은 통합 담당 소유이며 이 작업에서 수정하지 않았다. 새 의존성·빌드·배포·git 작업은 없다.

## 동작

- 마지막 성공 영상 1개를 메모리에서 보관한다. 새 시도 준비/취소/거부/초기화·녹화·종료 실패 동안 기존 Blob과 URL은 유지하며, 정상 onstop에서 비어 있지 않은 영상 Blob과 실제 MIME 및 새 URL을 확보한 뒤 교체한다.
- 현재 녹화는 preparing/audioChoice/recording/paused/stopping/idle로 구분한다. 준비 중 중복 시작을 막고 명시 취소를 제공한다. OS 선택창을 강제 닫는다고 주장하지 않으며 늦은 허용의 stream을 닫는다.
- display를 받자마자 video ended를 감시한다. 마이크 권한 대기/사용자 선택/오디오 합성 중 공유가 종료되면 현재 attempt를 정리하며 뒤늦은 mic/합성 stream도 닫는다.
- 마이크 실패 시 녹화를 시작하지 않고 ‘마이크 없이 녹화 시작’과 취소를 제공한다. 요청한 옵션과 실제 연결 트랙을 구분한다. 시스템 음성 미제공을 안내하며 실제 소리 여부는 마지막 영상을 재생해 확인하도록 명시한다.
- 기존 high/medium/low·30/60fps·none/system/mic/both 선택을 유지한다. 두 오디오 소스가 있을 때만 AudioContext로 합성하고 실패/중단 시 source·destination·context를 해제한다.
- 활성 시간은 monotonic 시계의 구간 합이며 일시정지를 제외한다. UI에는 구현 용어 대신 일시정지를 제외한 시간과 영상 재생 길이가 다를 수 있음을 안내한다.
- recorder·chunks·모든 tracks·context·타이머가 attempt에 속한다. 오래된 error/data/stop/ended는 현재 attempt와 마지막 결과를 바꾸지 않는다. 오류 뒤의 최종 stop은 성공으로 취급하지 않는다. 종료 확인은 10초 뒤 실패로 정리한다.
- WebM 지원 후보를 확인한 뒤 요청한다. 결과에는 recorder의 실제 MIME과 그 확장자를 사용한다. 새 MP4 선택 기능이나 모바일 지원을 추가한 것은 아니다.
- 마지막 결과는 미리보기/명시 다운로드/확인 후 삭제를 제공한다. 다운로드 요청과 실제 디스크 저장 완료를 구분한다. 이전 ID의 다운로드/삭제 callback은 새 결과에 적용하지 않는다.

## 파일과 API

- `src/utils/screenRecording.ts`: state reducer, clock, 설정·MIME helpers.
- `src/lib/screenRecording/ownership.ts`: attempt 자원 소유; late adoption도 해제하고 동일 track stop을 중복 호출하지 않는다.
- `src/lib/screenRecording/session.ts`: `createScreenRecordingSession(ports,onChange)`, `start/cancelPreparation/continueWithoutMic/pause/resume/stop/deleteResult/getSnapshot/dispose`.
- `src/lib/screenRecording/browser.ts`: 요청 시점에만 media 권한을 호출하는 실제 브라우저 adapter.
- `ScreenRecorder.tsx`, `ScreenRecordingSessionPanel.tsx`, `ScreenRecordingLastResult.tsx`: 설정/현재 녹화/마지막 결과/기존 가이드 UI.
- `translations-screen-recorder.json`: 동일 담당자가 작성한 ko/en patch. root 검토에 따라 시간 안내를 쉬운 문장으로 수정했다.

UI 선택자: `[data-screen-recording-setting="quality|fps|audio"]`, `[data-screen-recording-phase]`, `[data-screen-recording-result]`. 신규 버튼/입력은 44px·16px 및 디자인 토큰을 사용한다.

## 자체 검사

1. `node --experimental-strip-types scripts/check-screen-recording-state.ts`: **10그룹 PASS**. reducer/clock/MIME/owner 및 late resource 해제. owner의 중복 stop 보호 추가 뒤 해당 검사 재실행.
2. `node scripts/check-screen-recording-session.cjs`: **10그룹 PASS**. 실제 session을 제어 media 포트로 실행했다. 중복 시작·늦은 display·mic 대기/선택 중 ended·AudioContext 대기 중 취소·명시 mic 선택·지연 tick/pause·권한/compose/constructor/start 실패·error/empty/MIME/URL/timeout 실패·이전 callback·실제 MIME 파일명·URL 교체/삭제/이탈을 포함한다.
3. `node docs/verify/2026-11-17-repeat-batch23/check-screen-recording-integration.cjs`: **6그룹 PASS**. 실제 browser adapter의 요청 옵션/합성/실패 해제와 실제 부모 KO/EN 이벤트·다운로드 실패·이전 결과/ID 보호·준비 취소를 검사했다.

합계 **26그룹 PASS**, scoped ESLint 제품/검사 10파일 오류 0/경고 0. 제어 포트의 자료는 영상 코덱 출력으로 주장하지 않는다. 위 검사는 실제 개인 화면·마이크 캡처 **0회**, 실제 Chrome 실행 **0회**다. 실제 canvas.captureStream→MediaRecorder의 Blob/재생/다운로드와 모바일 레이아웃은 단일 브라우저 담당이 별도 확인한다.

taxi 담당의 [독립 검토](screen-recording-independent-review.md)는 **8그룹 PASS**, 추가 결함/수정 요청 없음이다. 취소된 이전 compose의 역순 완료·stop watchdog·시계 역행·실제 adapter resume 대기 취소·부모 이탈/설정·자식 삭제확인 교체를 별도 검토했다. 제품 TS는 안정화했으며 전체 타입 검사는 통합 담당의 최종 체크포인트에서 수행한다.

## 별도 실제 브라우저 확인

verify 담당의 [브라우저 보고서](review-browser.md)에서 화면 녹화 **6묶음 PASS**를 확인했다. 검증용 canvas.captureStream→native MediaRecorder VP9 WebM(38,759 bytes, 320×180)의 실제 재생/다운로드와 이전 결과 보존, 늦은 권한/이벤트, 실제 무음 트랙 AudioContext 합성 및 close, 320px EN를 포함한다. 개인 화면·실제 마이크 요청은 0회이며 성공 캡처 입력만 검증 스트림으로 대체했다. 제품 결함은 보고되지 않았고 Chrome은 종료됐다. 이 결과를 자체 제어 포트 26그룹에 중복 합산하지 않는다.
