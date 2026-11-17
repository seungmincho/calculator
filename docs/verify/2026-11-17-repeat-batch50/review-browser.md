# 50차 말하기 준비시간 native 검증

**첫 실행8/8 PASS**, Chrome 종료. 격리 context의 getUserMedia를 합성 oscillator→MediaStreamDestination으로 대체했다. 기기 마이크 요청0·스피커 destination 연결0·모델 다운로드0이며, 실제 Chrome MediaRecorder/AudioContext/OfflineAudioContext·Blob·IDB·키보드를 사용했다. 통합 담당의 최종 전체 타입 검사도 통과했다(2026-11-17 09:43:59 KST).

- 기본0초로 실제 음원 Blob 생성·다운로드·OfflineAudioContext 디코딩의 양수 길이/에너지와 muted 재생 진행을 확인했다. 저장한 IDB Blob의 바이트가 다운로드 및 새 방문 열기 후 파일과 정확히 같고 준비시간 필드는 저장하지 않았다.
- 합성 권한을700ms 보류한 뒤3초 native deadline을 확인했다. 준비중 MediaRecorder/제품 AudioContext0·타이머00:00·주요 부모 입력 잠금, 승인 대기와 준비시간이 녹음 길이에 포함되지 않았다.
-5초 준비 취소 및 제어 visibility/pagehide는 recorder/take를 만들지 않았고 자기 stream을 정리했다. 보류했던 interval을 호출하거나 복귀해도 자동 시작하지 않았다.
- 실제 recorder stop 이벤트를 보류하고 monotonic 시계를30초 더 이동해도 저장 시간은 stop 시각까지만 계산했다. 옛 recorder data/stop/error를 직접 호출해도 새 stream/context/현재 녹음이 살아 있고 완료 take는2개뿐이었다.
- 취소된 권한의 늦은 승인 stream만 닫았다.5초 deadline을 제어 시계로 한 번 넘겨 중복 callback을 호출해도 recorder.start1회·녹음 시계00:00이었다.
- 결과의 재녹음 버튼도 같은3초 준비를 사용했다. 취소는 이전 take 보존,5회 제한/텍스트 take/TXT를 유지하고 새 방문 준비 선택은0으로 돌아왔다.
- 권한 거부 오류·SPA 이탈중 준비 정리·옛 interval 무효를 확인했다. 실제 OS 권한창을 시험한 결과로 표현하지 않는다.
- 320px 다크 KO/EN body/문서320px·입력16px·주요 동작44px 이상, Enter로 준비 선택을 확인했다. KO/EN 카운트다운 캡처를 직접 열어 숫자/타이머/취소 안내 줄바꿈을 검토했다.

신규 제품 결함0. JS page error/hydration/unhandled rejection/원시 번역키0. 실제 오디오 코덱/Blob/IDB와 제어 permission·clock·visibility·옛 callback을 분리했다. native 파일의 실제 디코딩 길이와 deadline 수치는 각 evidence에 있다. 개인 음성/실제 마이크/실제 스피커/Whisper·Qwen/90초 사람 녹음은 검증 범위가 아니다.

근거: browser/final-results.json, speaking-zero-native.webm/speaking-reopened.webm 등 실제 파일, 각 evidence·캡처; scripts/check-repeat-batch50-browser.mjs와 browser-fixtures.mjs.

실측 대표값: 기본0초 파일12,751바이트·디코딩0.78초/48kHz/2채널/RMS0.05635.3초 흐름의 합성 권한 대기716.8ms, 승인→native start3023.5ms, 녹음 파일 디코딩1.14초였다. 기기/실행환경 관측값이며 일반 기기 성능 보장은 아니다.

검증 소유4개 runner/4개 fixture의 scoped ESLint를 완료했다. 재사용 header의 미사용 helper 경고4개는 해당 함수/참조를 제거해 해결했고 최종 오류0·경고0이다. 제품 파일은 수정하지 않았다.

최종 타입 근거: 통합 담당 `node --max-old-space-size=2048 ... tsc --noEmit`,09:43:59 KST 시작·free3.36GiB·8.74초·exit0·진단0·chunk0f20ce(동기 종료로 session ID 없음). 첫09:40:26/session62674에서 useSpeakingRecorder.ts131 TS2367 한 건이 있었고 `pageHidden()` 최소 보완 뒤 hook hidden1+parent hidden1·lint0을 확인하고 전체 타입만 재검사했다. 이미 통과한 native는 그대로 보존했으며 새 브라우저 반복은 하지 않았다.
