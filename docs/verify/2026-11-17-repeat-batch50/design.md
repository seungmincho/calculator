# 50차 말하기 녹음 준비시간 — 연결 설계

상태: **읽기 설계만 완료**. 44/48/49 전체 타입 체크포인트 전 제품·검사 TS를 작성하지 않았다. 구현은 root 신호 뒤 시작한다.

## 확인한 현재 경로

- `src/hooks/useSpeakingRecorder.ts`의 유일한 소비자는 `src/components/SpeakingPractice.tsx`다. 현재 `start()`는 permission 승인 직후 recorder/context를 만들고 `start(250)`한다. 100ms meter/timer는 `performance.now()` 기반이며 최대 90초, 최소 0.5초와 빈 Blob 거부를 사용한다.
- 부모의 시작은 녹음 카드 메인 버튼과 기본 점검의 `basic.retry` 두 곳이다. `busy`는 requesting/recording·AI 처리·저장·캐시 삭제를 포함한다. mode/new session/open record/text take/선택 take 등 일부는 disabled에 의존하므로 새 준비 상태를 UI와 실제 handler 양쪽에 연결한다.
- 기존 record v1·revision CAS, Blob/take/피드백, 20개 기록·5 take, URL 요약, TXT/오디오 내보내기, 재녹음 비교는 변경 대상이 아니다. 번역은 `speakingPractice`, 자기 namespace 등록은 이미 있다. 기존 `cancel/requesting/record/rerecord/stop` 문구를 재사용한다.
- root의 `before-ownership.json`은 actual-hook 제어 포트 4관찰이다. 정상 완료·permission 취소는 정상이며, 저장한 옛 `onerror`/`onstop`을 직접 호출하면 새 stream을 닫거나 완료를 중복 전달한다. **native 브라우저가 그 순서로 이벤트를 보낸다는 증거가 아니다.** 기존 증거와 probe는 덮어쓰지 않는다.

## 최소 API와 파일 소유

| 파일 | 변경 |
|---|---|
| 새 `src/utils/speakingPreparation.ts` | `SpeakingPreparationSeconds = 0 \| 3 \| 5`, 값 검증과 monotonic deadline/남은 정수 초를 계산하는 작은 순수 제어 모듈. MediaRecorder/DOM/저장 의존 없음 |
| `src/hooks/useSpeakingRecorder.ts` | 기존 `start()` 호환을 유지하는 `start(delay = 0)`; `preparing`, `remaining`, 동기 `isBusy()` 추가. 기존 `recording/requesting/seconds/level/error/stop/cancelRequest` 유지. cancelRequest는 requesting/preparing 취소로 확장 |
| `src/components/SpeakingPractice.tsx` | 페이지 메모리 `preparationSeconds=0`; 두 시작 버튼을 공통 시작 handler로 연결. busy·필드 잠금·준비 UI·상태 선택자 연결 |
| `scripts/check-speaking-preparation.ts` | 순수 clock/경계 검사 |
| docs50의 새 actual-hook/parent MJS | 제어 permission/recorder/context/clock과 실제 부모 이벤트 검사. 이전 root probe는 변경하지 않음 |
| `docs50/translations-speaking-preparation.json` | KO/EN `speakingPractice.preparation` 조각. canonical/generated/meta는 integrate 소유 |

별도 자식은 현재 작은 선택 3개와 숫자 UI에는 필수가 아니다. 부모 내부에 기존 스타일로 연결해 파일 수를 늘리지 않는다. 구현 중 검증을 쉽게 하는 작은 내부 타입/함수 변경은 같은 소유 범위에 둔다.

## 상태와 시간

`idle → requesting → preparing(3/5초) → recording → stopping → idle`. 0초는 permission 후 preparing을 건너뛴다. stopping은 native stop 완료를 기다리는 내부 소유 상태이며 새 시작을 허용하지 않는다.

1. start 직전에 유효 delay와 현재 작업 부재를 동기로 확인하고 새 run을 먼저 소유한다. 빠른 더블 클릭으로 permission 요청이 두 개 생기지 않는다. 부모 두 버튼도 동일한 최신 busy/횟수 검사와 오류 초기화를 사용한다.
2. permission이 **승인된 시각**에 `deadline = performance.now() + delay * 1000`을 만든다. 권한 대기 중 지난 시간은 준비나 녹음 시간에 넣지 않는다. 순수 제어는 이전 관측보다 뒤로 가는 clock을 남은 시간 증가로 반영하지 않는다.
3. 준비 tick은 `ceil((deadline - monotonicNow) / 1000)`으로 3→2→1을 갱신한다. tick 횟수로 차감하지 않는다. 지연된 tick/큰 시간 점프에서도 현재 run의 준비를 한 번만 완료한다. 준비 중 recording seconds와 level은 0, MediaRecorder.start·Blob·전사·AI 호출은 0이다.
4. deadline이 지난 현재 run만 recorder/AudioContext·meter를 만들고 녹음을 시작한다. 녹음 시작 시각은 여기서 새로 잡으므로 준비 3/5초가 90초 상한에 들어가지 않는다. 기존 MIME 후보 순서와 timeslice 250ms, 최소 0.5초·빈 Blob 거부는 유지한다.
5. 일반 수동/90초 stop은 해당 run의 recorder만 한 번 정지한다. stop 완료 전에는 start 재진입을 차단한다. 완료 callback은 한 번만 전달하며 current run의 시작시각·chunks·MIME만 사용한다.

## 자원과 늦은 callback 소유권

현재 여러 전역 ref를 `release()`가 닫는 방식 대신 한 run 객체가 자신의 permission token·phase·stream·recorder·context·chunks·시작시각·timer handle을 소유한다. `active.current === run && alive && !run.closed`를 비동기 진입/재진입마다 검사한다.

- run 정리는 idempotent하며 자기 timer/stream/context만 해제한다. 옛 run 정리는 최신 ref나 UI 상태를 덮지 않는다. timer callback은 run뿐 아니라 자신에게 할당된 예약을 확인하므로 timer ID 재사용/취소 callback 직접 실행에도 안전하다.
- `ondataavailable/onstop/onerror`는 capture한 run과 rec identity를 검사한다. closed/옛 callback은 chunk 추가·take 완료·오류 표시·새 자원 정리 모두 0이다. 완료/실패는 먼저 소유권을 종료시켜 중복 callback도 거부한다.
- 취소/실패/unmount는 먼저 요청과 예약을 무효화한 뒤 이벤트 handler 해제·자기 recorder 정지·tracks stop·AudioContext close를 수행한다. close 실패를 회수하고 나머지 정리는 계속한다. 일부 생성/연결/start 실패도 이미 획득한 자기 자원을 해제한다.
- 늦게 승인된 permission은 반환된 **그 stream**의 tracks만 정지한다. 늦은 rejection/finally는 현재 requesting/preparing/recording 상태를 바꾸지 않는다.
- Strict setup→cleanup→setup에서 새 lifecycle은 활성화하되 이전 run을 되살리지 않는다. 예전 permission/timer/recorder callback은 이후 lifecycle에서도 무효다. 번역 변경은 recorder hook effect를 재시작하거나 take/설정을 초기화하지 않는다.

## 취소·화면 숨김·부모 잠금

- 명시 cancel은 permission 또는 준비만 중단한다. 완료 take를 추가하지 않고 seconds/remaining/level을 0으로 되돌린다. 취소 직후 새 0/3/5 선택과 새 시작이 가능하다.
- requesting/preparing 중 `document.hidden` 또는 `pagehide`면 취소한다. permission 승인 직전/준비 tick에서도 hidden을 확인해 숨김 이벤트와 경합해도 자동 시작하지 않는다. 화면 복귀·pageshow·언어 변경은 자동 재시작하지 않는다. 이미 recording인 경우의 기존 background 정책은 이번 범위에서 바꾸지 않는다.
- 부모 busy에 preparing과 native stopping을 포함한다. 준비 옵션, mode/new session/open record, file/text take, take 선택, title/transcript, save/transcribe/coaching 시작은 기존 busy 정책에 맞춰 차단한다. 상태를 바꾸는 주요 handler에도 최신 ref와 hook의 동기 isBusy를 사용해 옛 활성 핸들러로 세션을 교체하지 못하게 한다.
- 저장 중 title/transcript 편집을 허용하는 기존 20차 계약은 유지한다. 저장/목록·검색·공유 경로를 새 저장 정책으로 확장하지 않는다. record 완료는 current session에서만 append되며 취소 후 old recorder가 새 연습에 take를 넣지 못한다.

## UI·번역·native 선택자

녹음 카드에 `녹음 준비 / 바로 시작 / 3초 준비 / 5초 준비` 선택을 둔다. KO/EN 조각은 `preparation.label/immediate/three/five/hint/preparing/remaining`을 기본으로 사용하며 필요한 취소 안내만 추가한다. 권한을 허용한 뒤 준비하며 준비 시간은 녹음에 포함되지 않는다는 짧은 hint를 제공한다. 새 동의·계정·소리·진동은 없다.

준비 중 큰 tabular 숫자와 `N초 후 녹음을 시작해요` 상태 문장을 표시하고 녹음 시간은 00:00을 유지한다. 정수 초가 달라질 때만 polite 상태 문구가 달라진다. 기본 start는 preparing 문구로 비활성화하고 명시 cancel을 나란히 제공한다. 옵션/cancel/재녹음은 최소 44px, 기존 입력은 16px, 모바일은 flex-wrap/grid-cols-1을 유지한다.

예정 선택자: `[data-speaking-preparation="0|3|5"]`, `[data-speaking-recorder-phase]`, `[data-speaking-countdown]`, `[data-speaking-record]`, `[data-speaking-record-cancel]`, `[data-speaking-rerecord]`. 최종 API/라벨은 구현 ready 때 verifier에게 다시 통지한다.

## 검사 경계와 실행 순서

1. 순수 0/3/5·반초·deadline 경계·큰 점프·중복 tick·clock rollback·취소/재시작·옛 예약을 검증한다.
2. 실제 hook으로 permission 지연/거절/취소·빠른 두 start·준비 중 cancel/hidden/pagehide·화면 복귀 무실행·AudioContext/MediaRecorder 생성/start 실패·Strict replay를 검사한다. 준비 동안 start/Blob/완료 0과 tracks/context 정확 소유를 확인한다.
3. root probe의 두 old callback 경계를 수정 뒤 기대값으로 별도 검사한다. late data/stop/error가 새 stream/context·상태·take 수를 바꾸지 않는지, 90초는 실제 start 이후인지, 0.5초 경계와 빈 Blob도 확인한다.
4. 실제 부모의 메인/기본 점검 재녹음, 5회 제한, session/기록/직접 입력/file 잠금·옛 handler, 기존 텍스트 연습·저장/비교·locale 보존을 변경 접점만 검사한다. 저장/AI 전체 회귀를 중복 확대하지 않는다.
5. 작성자 scoped lint·stable freeze와 최종 번역 조각을 전달한다. 독립/Chrome·전체 타입은 지정 담당에게 넘긴다. 실제 native는 가짜 마이크·합성 음원만 사용하며 개인 마이크·사람 음성·Whisper/Qwen 다운로드는 0이다. 준비 제외한 Blob 길이는 native 포트가 별도로 확인하며 제어 callback 검사 결과와 구분한다.
