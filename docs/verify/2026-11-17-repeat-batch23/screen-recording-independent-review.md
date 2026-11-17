# 23B 화면 녹화 독립 검토

2026-11-17 KST. 담당 `/root/taxi_repeat`. 제품 변경 없이 실제 session·browser adapter·부모/자식 코드를 검토하고 **8개 독립 검사 그룹을 통과**했다. 현재 재현 가능한 제품 결함과 수정 요청은 없다.

## 검토 범위와 방법

- 계약: `plan.md` B의 마지막 성공 결과 1개 보존, 시도별 자원 소유, 준비 취소·늦은 완료 무효화, 활성 시간, 실제 오디오·MIME, 명시 다운로드·삭제.
- 제품: `src/utils/screenRecording.ts`, `src/lib/screenRecording/{session,browser,ownership}.ts`, `ScreenRecorder.tsx`, `ScreenRecordingSessionPanel.tsx`, `ScreenRecordingLastResult.tsx`.
- `scripts/check-screen-recording-session.cjs`의 제어 가능한 Track/Stream/Recorder와 포트를 재사용했다. 작성자 검사 전체를 다시 집계하지 않고 별도 실행 순서·경계를 추가했다.
- 부모/자식은 기존 `component-harness.cjs`로 실제 TSX를 번들해 이벤트·상태 연결을 실행했다. React 훅/DOM 포트는 제어된 모형이며 실제 브라우저·React 동시 렌더링 검사라고 주장하지 않는다. 오디오 합성은 실제 browser adapter 코드에 제어 AudioContext를 제공했다.

## 추가로 확인한 경계

| 그룹 | 독립 검사와 결과 |
| --- | --- |
| 1 | 기존 성공 결과 → 합성 대기 시도 취소 → 새 녹화 시작 → 이전 합성 역순 완료. 이전 video/late mixed track/context만 정확히 정리하고 새 녹화·이전 Blob/URL은 유지한다. 새 성공 때만 이전 URL을 해제한다. |
| 2 | 마이크 요청이 이미 종료된 audio track만 반환하면 명시적 오디오 선택 상태가 된다. 그 상태에서 취소·늦은 계속 클릭은 recorder를 만들지 않으며 기존 결과와 설정을 보존한다. |
| 3 | stop 중 기존 결과를 삭제한 뒤 timeout이 발생하고 새 녹화를 시작한다. 캡처해 둔 이전 timeout/data/stop/error 콜백은 새 녹화를 실패시키거나 삭제 결과를 되살리지 않는다. 중복 stop은 recorder.stop을 한 번만 호출한다. |
| 4 | tick 지연과 역행 시간 표본, 중복 pause/resume, 긴 정지 구간을 조합했다. 활성 구간 합은 7,750ms이며 새 권한 대기에도 완료 결과의 시간은 바뀌지 않는다. |
| 5 | MIME 지원 검사 예외 후 마지막 WebM 후보까지 탐색한다. 요청 후 원본 config 객체를 바꾸어도 quality/FPS/bitrate snapshot을 유지한다. 형식이 다른 chunk는 기존 성공 결과를 교체하지 않는다. |
| 6 | 실제 adapter의 두 오디오 소스 합성이 AudioContext.resume을 기다릴 때 owner를 해제한다. 늦은 resume 완료가 새 stream을 반환하지 않고, source disconnect 2회·context close 1회·각 입력 및 destination track stop 1회로 정리한다. |
| 7 | 실제 부모 이벤트로 low/60/both 설정 → 마이크 거부 → 준비 취소 → 다시 시작 → 언마운트를 실행했다. 설정이 유지되고 늦은 display/audio는 해제되며 후속 마이크 요청·recorder·타이머가 생성되지 않는다. |
| 8 | 실제 결과 자식의 삭제 확인을 연 상태에서 결과 ID를 교체하면 확인 상태가 초기화된다. 다운로드·삭제는 새 ID를 전달한다. 오디오 선택 자식은 안내와 두 선택만 표시하고 사용자가 계속 버튼을 누르기 전 콜백을 실행하지 않는다. |

정적 대조에서도 `current(attempt)`와 owner 해제를 통과한 시도만 상태를 바꾸며, recorder/chunks/stream/context/타이머가 시도에 귀속되어 있다. 기존 결과 URL은 유효한 새 Blob·MIME·URL이 확보된 뒤에 해제한다. 권한 획득 직후 video `ended`를 연결하므로 마이크 대기/선택/합성 중 종료도 관찰한다. 새 설정은 idle에서만 조작할 수 있고 현재 결과와 마지막 성공 결과의 시간·오디오·파일 정보가 분리되어 있다.

## 실행 증거와 한계

```text
node docs/verify/2026-11-17-repeat-batch23/check-screen-recording-independent.cjs
Screen recording independent review: 8 groups passed; no real capture/browser

npx eslint docs/verify/2026-11-17-repeat-batch23/check-screen-recording-independent.cjs
exit 0 — 오류 0 / 경고 0
```

독립 검사는 실제 개인 화면·마이크를 요청하지 않았다. OS 선택창, 실제 MediaRecorder 코덱/Blob 재생, native 다운로드, 320px 레이아웃과 실제 브라우저 권한 동작은 전담 브라우저 결과와 구분한다. 시스템 소리가 실제 포함됐는지 또는 컨테이너 재생 길이가 표시 시간과 정확히 같은지는 이 검사로 보장하지 않는다.

이번 검토에서 제품 TS·번역·공용 파일을 수정하지 않았다. 24A PDF 준비 TS도 고정 상태를 유지했다. 전체 타입 검사·Chrome·빌드·배포·git 작업은 실행하지 않았다.
