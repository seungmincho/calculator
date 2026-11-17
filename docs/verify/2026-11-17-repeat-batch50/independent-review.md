# 50차 말하기 녹음 준비 — 독립 hook/부모 검토

상태: **독립 실행 8그룹 PASS, 재현된 미해결 제품 결함 없음.** 제품 TS를 수정하지 않았다. 작성자 19그룹과 기존 회귀 7그룹은 이 수에 합산하지 않았다. `npx eslint docs/verify/2026-11-17-repeat-batch50/independent-speaking-check.mjs`는 오류·경고 없이 exit 0이다.

## 실행 범위

명령: `node docs/verify/2026-11-17-repeat-batch50/independent-speaking-check.mjs`

실제 `SpeakingPractice` → `useSpeakingRecorder` → `speakingPreparation` 경로를 실행했다. 작성자의 `speaking-recorder-harness.mjs`에서는 범용 React 이벤트 호스트와 제어 I/O 포트만 재사용했다. 작성자 검사 파일/assertion은 가져오지 않았다. 파일 읽기 경계에서는 호스트를 메모리에서 확장해 `decodeSpeakingAudio`에 지연 Promise 포트만 추가했으며, 공유 호스트 파일은 변경하지 않았다.

MediaRecorder·AudioContext·마이크 권한·시계·타이머·AI·저장은 제어 포트다. 완료 Blob은 Node의 실제 Blob으로 확인했다. 개인 마이크, 실제 오디오 장치, AI 모델 다운로드, 외부 API 및 Chrome 호출은 모두 0이다. 실제 브라우저의 권한 UI·녹음 파일 재생 길이·성능·모바일 배치는 이 검사 결과로 주장하지 않는다.

## 독립 기대값과 결과

| 그룹 | 독립 검사 경계 | 결과 |
|---|---|---|
| 1 | 0/3/5초를 70초 이상 늦은 권한 승인으로 시작. 0.125ms 단위 관측·deadline 직전·시계 역행·8초 이상 누락된 callback에 별도 `ceil(delay - maxElapsed/1000)` oracle 적용. 준비 중 recorder/context/완료 생성 0, 실제 관측 완료시각에 start 1회 | PASS |
| 2 | 권한 전 hidden, 권한 후 hidden, 권한 후 pagehide 각각 취소. 다음 run을 먼저 승인한 후 이전 permission/예약을 역순으로 전달. 이전 stream만 stop, 복귀 자동 시작 0. 이미 녹음 중인 background 정책은 그대로 | PASS |
| 3 | 실제 1.25075초에 stop 요청 후 native stop callback을 12초 늦춰도 기록 길이 불변. 중복 stop/start 요청 차단. 완료한 recorder의 data/error/stop/tick을 새 녹음 중 직접 호출해 새 stream/context/상태·Blob 내용 불변, 완료는 각 1회 | PASS |
| 4 | 권한 대기 120초와 준비 지연 15초 뒤 실제 start를 기준으로 90초 제한 확인. 89.99975초에는 stop 0, 90초 초과에는 stop 1. AudioContext close 실패와 중복 terminal callback에서도 소유 자원을 각 1회 정리 | PASS |
| 5 | 실제 부모의 KO에서 캡처한 모드/새 연습/file/text/save/title/transcript/start 핸들러를 requesting/preparing/stopping 및 EN/KO 변경 후 실행. 기존 선택 take·원문·제목·설정 유지, 추가 권한/읽기/저장/AI 0 | PASS |
| 6 | 파일 decode 대기 중 녹음/추가 입력 차단. 명시 취소 후 새 준비를 시작하고 이전 decode 성공 전달. 서로 다른 두 파일을 역순 완료/실패시켜 최신 파일 Blob·길이만 반영. unmount 후 decode 완료는 추가 작업 없음 | PASS |
| 7 | 저장 중 새 연습/녹음 차단과 title/transcript 편집 허용을 함께 확인. 처음 저장 snapshot은 그대로, 늦은 commit 뒤 최신 원문 유지. 다음 저장은 commit의 revision basis 사용. 준비 옵션은 record/로컬 저장에 추가되지 않음 | PASS |
| 8 | 초기 effect replay, 취소한 요청의 늦은 거절, unmount 후 캡처한 recorder callbacks 직접 호출. 현재 자원을 이전 거절이 닫지 않고 unmount 자원 정리는 1회, 완료 take는 0 | PASS |

그룹 3·8의 옛 callback 직접 호출은 소유권 검증을 위한 제어 순서다. 실제 브라우저가 중복 이벤트를 해당 순서로 전달한다는 관찰과 구분한다. 그룹 6의 파일 포트는 실제 오디오 코덱 디코딩을 수행하지 않는다. 저장 검사는 기존 저장 API의 부모 호출/basis 경계이며 IndexedDB 원자성 재인증은 아니다.

## 원본 근거 보존 및 검토 파일

검사 시작/종료에 아래 두 파일의 SHA-256 동일성을 확인했다. root 원본 normal 2개·old callback 문제 2개 관측은 수정하거나 재기록하지 않았다.

- `before-ownership.json`: `96FBCF6C2238DDD1075B9E9FBCCB60F3C3EE0352C835A2DB8E29440D715E7BBF`
- `probe-recorder-ownership.mjs`: `69EA790E71B4C1197687F09D2919FC2136980E3A9B470CACAD094669372EE7AF`

검토 시 제품 SHA-256:

- `src/hooks/useSpeakingRecorder.ts`: `88BAD0558FAEEB8D52E72FAEBD29693DB12291A05C958DD81953FFAD7DEDC3E2`
- `src/utils/speakingPreparation.ts`: `E5CB8881FF5F1EA70855A954FF28331D8DE068F6D717763379C996C3D4BD828B`
- `src/components/SpeakingPractice.tsx`: `395F3BFAA0FF7CD03BDF11C82936BE43C76056F60648FDD7FEED19ED470F7A6E`

전체 타입 검사·빌드·배포·커밋·canonical 번역 수정은 실행하지 않았다. 제품 추가 수정 요청은 없다.
