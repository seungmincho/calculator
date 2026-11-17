# 27차 B 읽기 설계 — 소리의 종료 기준과 설정 6개

2026-11-17 KST. 25차 타입 검사 직전 **문서만 작성**했다. `WhiteNoise.tsx`와 공용 번역은 미수정이며 신규 TS도 아직 없다. 이 문서는 [27차 계약](plan.md)과 [후보 조사](../../handoff/2026-11-17-time-audio-candidates.md)의 구현 API를 구체화한다. 25차 발견 대응이 우선이다.

## 기존 경계

부모는 6종 합성 버퍼 함수를 가지고 있다. `startNoise`는 매번 context를 만들며 이전 것을 닫고, interval이 실행될 때마다 남은 값을 1씩 뺀다. 종류 변경은 같은 함수를 불러 타이머를 다시 시작하고, 타이머 설정 변경은 현재 interval에 반영되지 않는다. `resume()` 확인 없이 `isPlaying=true`를 표시한다. 종류/음량/타이머 값 자체는 저장하지 않는다.

합성 공식과 white/pink/brown 2초·rain/wind/wave 4초 반복 버퍼는 유지한다. 기존 함수의 별도 browser adapter 이동은 부모 연결 때 수행하며, 미연결 준비에서 부모를 바꾸지 않는다. 수면/집중 효과를 새로 주장하지 않는다.

## 시간 정책

- 설정은 `{type, volume, timerMinutes, fade}`. type 6개 allowlist, volume 정수 0~100, timerMinutes 0/5/10/15/30/60, fade boolean(기본 false)만 허용한다.
- 재생 클릭 시 `deadline={wallEnd,monotonicEnd}`를 만든다. 타이머 0은 `null`이며 무기한이다. 시작/resume 준비 시간도 이 기한 안에 포함한다. 타이머를 **다른 값**으로 바꾸면 클릭 시점부터 새 N분으로 만든다. 같은 선택 버튼 재클릭은 기존 기한을 유지한다.
- 남은 ms는 두 기준의 남은 값 중 더 짧은 값으로 계산하고 0 아래를 막는다. JS tick 횟수에 따라 감소시키지 않는다. wall clock 후퇴로 시간을 늘리지 않고, 절전으로 monotonic이 멈춘 환경에서도 실제 벽시계 기한을 확인한다. 시스템 시계를 앞으로 바꾸면 일찍 종료될 수 있음을 검사 범위에 남긴다.
- 종류/음량/페이드 변경은 기한을 유지한다. 중지·설정 불러오기는 종료하고, 다시 재생 클릭은 새 기한이다. 종료 후 남은 시간은 0이며 타이머 없음은 남은 시간 숫자 대신 명시 문구다.
- 음량 0은 재생 중 음소거로 표시하고 중지와 구분한다. 화면 복귀·context statechange 때 먼저 기한을 검사한다. 지났으면 close하고 `resume()`을 호출하지 않는다. 브라우저가 context를 중단하면 중단 상태를 표시하고 명시 ‘계속 듣기’에서만 resume한다. 기한은 유지한다.

## 오디오 소유권/API

신규 `src/utils/whiteNoise.ts`는 설정 검증/clone, deadline 생성·남은 시간·fade envelope/예약 계획만 담당한다. clock 입력은 `{wallMs,monotonicMs}`이며 브라우저 API를 부르지 않는다.

신규 `src/lib/whiteNoise/session.ts`는 `createWhiteNoiseSession(ports)` → `start(settings)`, `change(settings)`, `resume()`, `stop()`, `dispose()`, `getSnapshot()`를 제공한다. ports는 clock, context/source 생성, interval/watchdog, 복귀 listener, 상태 통지다. 상태는 `idle|preparing|playing|suspended|error`와 설정·남은 ms·기한이다. Hook/React 없이 fake 포트로 검사할 수 있게 한다.

각 attempt는 고유 generation과 context/source/gain·timer/listener를 소유한다. 새 start/type 교체/timer 변경은 이전 자원을 먼저 mute/stop/disconnect/close하고 새 attempt로 이동한다. type 교체는 이전 deadline을 새 attempt에 전달하고 timer 변경만 새 deadline을 전달한다. volume/fade는 현재 gain 예약만 갱신한다. 아직 준비 중인 attempt도 현재 설정과 동일한 기한 규칙을 따른다.

`AudioContext` 생성은 명시 재생 또는 이미 시작한 재생의 사용자 설정 변경에서만 발생한다. mount/파일 import/저장본 load에서는 생성 0회다. source 시작 전 `await ctx.resume()` 및 `ctx.state==='running'` 확인, 그 뒤 attempt와 기한을 다시 확인한다. 준비 10초 watchdog은 정리 후 실패 상태로 끝낸다. 늦은 resume/ended/rejection은 원 attempt만 정리하고 현재 상태를 바꾸지 않는다. native close rejection은 회수하되 이미 폐기한 상태를 다시 성공으로 표시하지 않는다.

유한 타이머는 `source.stop(ctx.currentTime + remainingSeconds)`를 예약한다. fade true이면 마지막 30초 동안 선형으로 0에 도달하도록 AudioParam에 예약한다. 설정 변경 시 `cancelScheduledValues(now)` 후 현재 envelope의 음량을 고정하고 남은 fade를 다시 예약한다. fade 구간에서 음량을 바꾸어도 원 deadline은 그대로다. 무기한에는 fade/stop 예약이 없다.

타이머를 무기한으로 바꿀 때 이전 source의 예약 종료를 잘못 남기지 않도록 새 attempt/source를 사용한다. 종류/타이머 변경의 짧은 전환음 공백은 허용하며 이전/새 소리를 겹쳐 재생하지 않는다. 실제 OS 앱 정지/모바일 절전 중 정확한 종료를 보장하지 않는다.

브라우저 adapter `src/lib/whiteNoise/browser.ts`는 기존 합성 공식을 제공하고 native context로 연결한다. runtime에서는 실제 AudioParam 예약/stop을 사용하며, 검증은 fake ports와 OfflineAudioContext의 무음 출력만 사용한다. 사용자의 실제 스피커 재생은 검사하지 않는다.

참고 근거: [W3C Web Audio의 source stop](https://www.w3.org/TR/2021/REC-webaudio-20210617/#dom-audioscheduledsourcenode-stop), [AudioContext resume](https://developer.mozilla.org/en-US/docs/Web/API/AudioContext/resume), [AudioParam 선형 예약](https://developer.mozilla.org/en-US/docs/Web/API/AudioParam/linearRampToValueAtTime). stop은 audio currentTime 기준이며 아직 실행되지 않은 예약을 바꿀 수 있다. resume 성공은 Promise와 현재 state를 확인해야 하며, 앱의 벽시계 기한 보장은 이 API 자체의 기능이 아니다.

## 저장 API

신규 `src/utils/whiteNoiseProfiles.ts`:

```
key: toolhub-white-noise-profiles-v1
{version:1, revision:nonnegativeSafeInteger,
 profiles:[{id,name,settings:{type,volume,timerMinutes,fade}}]}
```

6개/이름 trim 후 1~40 UTF-16 code units/제어문자 금지, ID ASCII 영숫자·underscore·hyphen 1~80. 이름은 NFKC+소문자 기준 중복을 막는다. envelope/각 행/settings의 알려지지 않은 필드, 중복 ID/이름, 잘못된 값·미지원 version을 거부하고 raw를 보존한다. 전체 UTF-8 16KiB 상한이다. 재생 상태·기한·버퍼는 schema에 없다.

`parse/read`, `apply action(add|rename|delete)`, `write(expectedRaw,action)`, `withWhiteNoiseProfilesLock(action,signal)` API를 준비한다. lock 내부에서 현재 raw와 expected를 대조하고 revision을 1 올린다. setItem throw(쿼터/차단)는 입력을 유지하며, 쓰기 후 read 실패는 `unconfirmed`로 분리해 ‘저장 안 됨’이라고 단정하지 않는다. readback 불일치도 재조회 안내하며 rollback하지 않는다. Web Locks 미지원은 raw CAS/readback으로 보완하되 완전 동시 쓰기 원자성은 주장하지 않는다.

부모 연결 때 새 `WhiteNoiseProfiles.tsx`가 명시 저장·불러오기·이름 변경·개별 삭제와 재조회/오류를 맡는다. 불러오기는 확인 후 저장소 raw+선택 record+현재 설정 signature를 lock 안에서 다시 확인한다. 그동안 설정 변경/새 선택/취소/storage event/unmount면 AbortController+generation으로 늦은 적용을 막는다. 성공한 load만 소리를 stop하고 설정만 적용한다. 실패는 기존 현재 설정과 소리를 임의로 바꾸지 않는다. 모든 action은 실패한 이름 입력을 보존한다.

## 검증/분담

순수 검사는 strict schema/한도·정규화 중복·revisionoverflow/CAS·readbackunknown·quota, 지연tick/벽시계후퇴·수면모사/종류·음량·타이머 변경 및 마지막 30초 envelope를 확인한다. session 포트 검사는 resume 실패·hung·역순 성공, stop/언마운트, 이전 ended, 기한 뒤 복귀, 시도별 close·disconnect·listener 제거를 확인한다.

이후 실제 부모 fixture는 저장본 load가 자동 재생하지 않음·dirty 설정의 늦은 load 차단·설정/음소거/상태·재시도·두 탭 경계를 확인한다. 단일 브라우저 담당이 OfflineAudioContext의 실제 gain/종료 파형과 KO/EN 320px를 검증한다. 공용 번역/메타는 통합 담당만 변경한다. ko/en fragment는 본 담당이 같은 UI와 함께 작성한다.

현재 예상 소유 파일은 위 신규 유틸/port/adapter/검사, `WhiteNoiseProfiles.tsx`, 후속 `WhiteNoise.tsx` 최소 연결, `translations-white-noise.json`이다. 기존 부모/canonical/전체 tsc/Chrome은 현재 준비 범위에서 수정·실행하지 않는다.
