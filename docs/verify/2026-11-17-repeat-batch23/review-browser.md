# 23차 독립 브라우저 검증

최종 **11/11 PASS**: 타자5개·녹화6개. 계획의 관련 경계를 한 흐름에 묶어 검사했으며 별도 실행 횟수나 root의 시각 검토를 추가 그룹으로 세지 않았다. JS page error·hydration 오류·처리되지 않은 Promise 거부0. 최종 Chrome 종료 뒤 통합 담당에게 전체 타입 검사 가능 신호를 전달했다.

기존 `http://127.0.0.1:3039`, 한 Chrome의 순차 격리 컨텍스트, 서비스워커·외부 요청 차단을 사용했다. 제품 파일·패키지·서버·빌드·전체 타입 검사는 수정하거나 실행하지 않았다. [실행 스크립트](../../../scripts/check-repeat-batch23-browser.mjs) · [최종 결과](browser/final-results.json) · [사전 계획](browser-scenarios.md).

| 사례 | 확인한 결과 |
|---|---|
| 타자 지문 경계 | 9/10/1,000/1,001 코드포인트, emoji UTF-16 길이와 구분, newline/tab/중복 공백 미리보기 정규화, 입력 무잘림·명시 적용. textarea 자체의 CRLF→LF 정규화는 원 초안 정책과 구분 |
| 실제 입력·합성 IME | 영어 키 입력 완료100%·오타0·WPM 표시. 한글 마지막 글자 composition 중 미완료→end 뒤 완료1회, 중복 end 무시, 확정된 자모 prefix 오타1개. custom 결과는 기존 history/daily bytes 비변경 |
| 타이머·초안 분리 | 기본 시간제 시작→custom 이탈 뒤65초 단조 시계 이동에도 숨은 완료/기록0. custom 초안/다음 단위 변경은 확정 지문·진행 단위 유지. 앱 EN 전환 중 active interval1, retry/ESC/모드 이탈 뒤0. 모드 왕복 초안·확정본 보존, 명시 적용 시에만 교체 |
| 복사·기본 기록 회귀 | 실제 native Clipboard 요약 읽기·지문/공유URL 미포함. reject+legacy false 실패→readonly 수동 전체 선택→legacy true 성공, 늦은 거부 뒤 fallback0. 기본 daily 정상 완료는 기존 history와 일일 횟수 각각1 증가하며 실패 복구 UI도 동작 |
| 타자320 EN | native Ctrl+V와 합성 drop 차단, readonly Ctrl+A 선택, apply/retry/ESC 뒤 새 타자칸에 실제 DOM focus. 가로폭320·입력16px·주요 버튼44px |
| 실제 녹화 파일 | 테스트 canvas.captureStream→native MediaRecorder VP9→실제 WebM38,759byte. EBML header·파일명/실제 MIME·320×180·video readyState4 및 재생 시간 증가 확인. 내려받은 bytes가 미리보기 Blob bytes와 동일 |
| 단조 활성 시간 | performance.now offset으로 지연을 모사했을 때 시계가125초를 반영, pause 중300초 이동은 제외, resume 뒤 표시00:02:08. 실제 녹화 컨테이너 재생 길이와 같은 시간이라고 주장하지 않음 |
| 이전 성공 결과 보존 | display 거부·recorder constructor 실패·start 실패·빈 chunk·object URL 생성 실패5가지 뒤 동일 result ID/URL/메타데이터 유지. 이전 WebM 실제 다운로드 가능·실패 시도 tracks 정리 |
| 늦은 권한·준비 종료 | 준비 중 설정 잠금/중복 시작 버튼 부재. 준비 취소 뒤 늦은 display tracks 종료, mic 대기 중 display ended→늦은 mic 종료·recorder0. 경로 이탈 뒤 늦은 display도 종료 |
| 오디오 선택·합성 | mic 거부 후 녹화 미시작·명시 ‘마이크 없이’ 선택, system track 미제공 안내. 검증용 무음 system/mic 트랙을 실제 AudioContext로 합성하고 새 성공 결과 교체·원래 URL revoke·context close1·tracks 종료 |
| 이벤트·삭제·모바일 | error→늦은 data/stop으로 기존 파일 미교체, 이전 recorder 이벤트가 새 녹화에 영향0. 현재 track ended는 정상 새 결과 확정. 명시 삭제 취소/확인·URL 해제. EN320 현재 시도와 마지막 결과 분리, medium/60fps 요청 전달, 이탈 뒤 tracks/context/timer/URL 정리 |

실제 산출물: [검증 캔버스 녹화 WebM](browser/synthetic-canvas-recording.webm), [실패 후 보존한 이전 WebM](browser/previous-after-failures.webm). 첫 파일은 실제 브라우저 디코딩·재생까지 확인했다. 둘 다 검증용 캔버스만 포함하며 개인 화면이나 마이크 내용이 없다.

모바일: [타자 요약 복구](browser/typing-custom-320-dark-english.png), [타자 상단](browser/typing-custom-320-dark-top.png), [현재 녹화와 이전 결과](browser/screen-current-and-last-320-dark-english.png), [재생 확인한 마지막 결과](browser/screen-last-result-320-dark-english.png). 네이티브 video controls, sticky 헤더/하단 탭과 개발 Issue 표시는 제품 회귀 오류로 집계하지 않았다.

검증 경계: OS 화면 선택창·개인 화면·실제 마이크 요청은 **0회**다. `getDisplayMedia`/`getUserMedia` 반환만 검증 캔버스와 무음 destination 트랙으로 대체했다. 성공 경로의 MediaRecorder·Canvas·AudioContext·Blob·다운로드·video 재생은 네이티브 브라우저 구현이다. 권한 거부·오류·늦은 콜백·빈 chunk·시계 이동은 제어 주입이며 실제 OS/모바일 기기 지원 또는 물리 마이크의 음성 품질을 검증한 것으로 확대하지 않는다. 한글 IME는 합성 DOM 이벤트 검사이며 실제 모바일 키보드 검증이 아니다.

초기 타이머 검사1개는 Playwright clock 설치가 interval 관찰 함수를 덮어 관찰값을 얻지 못한 테스트 코드 문제였다. 실제 timer API를 유지하고 Date/performance의 읽기 시각만 이동하는 관찰 방식으로 수정한 해당 사례만 재실행했다. 제품 수정은 필요하지 않았다. 마지막 모바일2개는 실제 DOM focus·영상 재생 준비 후 캡처 근거를 보강해 다시 확인했으며 11개 집계에 중복 추가하지 않았다. 초기 `*-failure.*`는 진단 자료이고 최종 판정은 `*-evidence.json`/`final-results.json`의 PASS다.

전체 타입 검사는 이 브라우저 검사와 별도로 통합 담당이 수행한다. 빌드·배포·커밋·푸시는 실행하지 않았다.
