# 50차 후보 — 말하기 연습실의 녹음 준비 카운트다운

상태: 완료(미배포). 작성자 19·독립 8·Chrome 8흐름과09:43:59 KST 전체2GB 타입 재검사·번역/범위lint/diff를 통과했다. [완료 보고서](report.md). 아래 실행 계약과 사전 조사/수정 전 근거는 이력으로 보존한다.

## 현재 동작과 사용자 가치

`SpeakingPractice.tsx`는 기존 자기소개/업무 보고 모드, 최대90초/5회 녹음, Whisper tiny 기본 점검·선택형 생성 코칭, 재녹음 비교와 기기 기록20개를 제공한다. `useSpeakingRecorder.ts`는 마이크 허용 직후 `MediaRecorder.start(250)`를 호출한다. 사용자가 허용 창을 닫고 화면에서 시선을 돌리거나 첫 문장을 준비할 별도 대기 시간은 없다.

녹음 버튼 근처에 `바로 시작 / 3초 준비 / 5초 준비` 선택을 추가한다. 기본은 기존대로 바로 시작이다. 재녹음·기본 점검의 다시 녹음 버튼에도 같은 선택을 사용한다. 이 옵션은 현재 페이지 동안만 유지하고 원문/음성/기록 저장 형식·URL에는 넣지 않는다. 수요 순위는 실제 새 분석 데이터로 확인한 것이 아니다.

## 최소 계약

- 준비 카운트다운은 **마이크 권한이 실제 승인된 뒤** 시작한다. 권한 요청 중에는 기존 허용 대기/취소를 보여 준다. 권한 창에서 기다린 시간은 준비 시간에도 녹음 시간에도 포함하지 않는다.
- 준비 중에는 큰 남은 숫자와 명시 취소를 보여 준다. 녹음 시간은00:00, 녹음 Blob/전사/모델 요청은0이다. 기본 소리나 진동을 추가하지 않는다. 준비 완료 뒤에만 MediaRecorder가 실제 녹음을 시작하며 기존90초 상한은 그 시점부터 계산한다.
- 카운트다운은 절대 종료시각과 monotonic clock으로 계산한다. interval 횟수만 빼지 않는다. 준비 중 hidden/pagehide·취소·언마운트는 즉시 대기·마이크 stream/AudioContext를 정리한다. 화면으로 돌아왔다고 자동 녹음을 시작하지 않는다. 이미 진행 중인 녹음의 background 정책까지 임의로 확대하지 않는다.
- 버튼의 빠른 중복 입력·늦은 권한 성공/거절·옛 timeout/interval·StrictMode replay는 요청/녹음 세대로 구분한다. 늦은 permission stream은 그 stream의 tracks만 정지시킨다. 옛 recorder의 ondataavailable/onstop/onerror가 새 recorder·새 세션의 stream/context를 해제하거나 오래된 take를 추가하지 못하게 한다.
- 준비/권한/녹음 동안 mode 변경·기록 열기·파일 입력·직접 입력·중복 재녹음은 현재 busy 계약에 맞게 막는다. 취소/실패 후에는 즉시 새 준비를 선택해 재시도할 수 있다. 실패/취소를 완료된 녹음으로 저장하지 않는다.
- timer/lifecycle는 순수 제어 모듈, 실제 getUserMedia/MediaRecorder/AudioContext는 훅 포트로 분리할 수 있다. 기존 public 훅 소비자는 현재 확인상 SpeakingPractice 한 곳이다. 최대시간/최대횟수/0.5초 최소/Blob MIME 선택·기록 형식은 유지한다.
- UI는44px 이상 선택/취소/녹음 제어와16px 입력을 사용한다. 숫자는 tabular-nums, 준비 상태를 읽기 쉬운 문장으로도 제공한다. 매100ms마다 screen reader 안내를 갱신하지 않고 정수 초 전환만 안내한다.320 KO/EN에서 녹음·취소가 화면 밖으로 밀리지 않는지 확인한다.

## 읽기에서 확인한 검토 지점

현재 훅의 `rec.onstop`은 alive만 확인하고, `rec.onerror`는 요청 세대를 대조하지 않는다. `release()`는 호출한 recorder 자체가 아니라 current stream/context를 해제한다. `probe-recorder-ownership.mjs`는 실제 훅에서 정상 1초 완료와 권한 취소 후 늦은 허용의 자원 해제를 확인했다. 이어 이전 recorder의 저장한 error/stop 콜백을 새 녹음 도중 직접 호출하면 새 stream이 해제되고 녹음 플래그가 꺼지며, stop은 이전 take를 다시 추가함을 확인했다(`before-ownership.json`, 4개 관측). 이는 제어된 콜백 실행으로 소유권 검사가 없음을 보여 주는 근거이며, 실제 브라우저가 이 순서로 중복/늦은 이벤트를 전달했다는 증거는 아니다. 준비 단계 추가 시 해당 소유권 경계만 최소 보완한다. baseline JSON은 덮어쓰지 않는다.

`cancelRequest()`는 현재 permission-only 흐름에서는 token을 증가시키고 requesting을 해제한다. 준비 단계가 생기면 이미 허용된 stream도 있으므로 이 경로의 자원 해제와 옛 finally의 상태 덮어쓰기 방지를 함께 설계해야 한다.

## 검증

순수 clock은0/3/5초·큰 시간 점프·중복 tick·취소·재시작을 검사한다. 실제 훅은 권한 지연/거절, 준비 중 취소·숨김, 같은/새 세대 recorder late data/stop/error, AudioContext/MediaRecorder 생성 실패,90초 자동종료와 최소 녹음 시간을 확인한다. 기존 실제 저장·재녹음 비교·기본 모델 무다운로드 회귀는 바뀐 녹음 경계 위주로 유지한다.

native 검증은 격리된 Chrome의 가짜 마이크/합성 음원을 사용하고 실제 개인 마이크나 음성을 요청하지 않는다. 녹음 시작 이전 Blob0·준비 제외한 실제 파일 길이·취소 뒤 새 녹음·320 KOEN을 확인한다. 실제 Android/iPhone 권한 UI/백그라운드 정책과 음질은 데스크톱 모사로 보장하지 않는다. 제품 담당은 hook/child/부모와 KOEN fragment를 함께 소유하며 canonical·가이드·메타는 통합 담당이 쓴다.
