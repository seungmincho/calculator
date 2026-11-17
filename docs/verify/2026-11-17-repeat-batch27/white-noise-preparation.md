# 27차 B 미연결 준비 결과

2026-11-17 KST. 25차 전체 타입 검사 체크포인트 후 승인된 [읽기 설계](white-noise-implementation-design.md)에 따라 신규 단위만 작성했다. **기존 `WhiteNoise.tsx`, 공용 번역·메타는 변경하지 않았다.** 부모 연결·실제 스피커 재생·Chrome·전체 tsc·빌드·새 의존성은 0회다.

## 파일/API

- `src/utils/whiteNoise.ts`: 6종/기존 6개 타이머/정수 음량/페이드의 strict 검증, clone, wall+monotonic deadline, 잔여 ms, AudioParam 예약 계획.
- `src/utils/whiteNoiseProfiles.ts`: `toolhub-white-noise-profiles-v1`, 6개/이름40/UTF-8 16KiB, version1/revision/known-key strict parse·add/rename/delete·raw CAS·readbackunknown·load 재조회·AbortSignal Web Locks helper.
- `src/lib/whiteNoise/audio.ts`: native AudioContext/source/gain 소유권과 실제 예약 API adapter. source 생성 도중 실패해도 context를 닫고, 정리는 멱등이다.
- `src/lib/whiteNoise/session.ts`: framework 독립 attempt coordinator. start/change/resume/stop/dispose/getSnapshot과 `idle|preparing|playing|suspended|error` 상태.
- `src/lib/whiteNoise/browser.ts`: 생성 자체는 무음인 browser ports. 실제 기존 버퍼 생성 함수를 callback으로 받는다. 아직 부모가 연결하지 않아 AudioContext를 만들지 않는다. 기존 합성 공식을 복제/변경하지 않았다.
- `scripts/check-white-noise.ts`, `scripts/check-white-noise-session.ts`.
- `translations-white-noise.json`: KO/EN 각 **63개** leaf 키 구조 일치. 부모/UI 연결 전 준비 조각이며 공용 병합은 통합 담당의 시점에 따른다.

`WhiteNoiseSettings={type,volume,timerMinutes,fade}`. source factory는 `(AudioContext,type)=>AudioBufferSourceNode`이며 후속 부모에서 기존 합성 함수를 전달한다. controller의 `change()`에는 검증된 설정만 제공하며 잘못된 설정은 clone 단계에서 거부된다. 저장본 load는 후속 UI가 lock/현재 입력 generation/raw 확인에 성공한 뒤 `stop()`→`change()` 순서로 적용한다.

재생 클릭 또는 **다른 타이머 값**으로 변경할 때 deadline을 만든다. 같은 타이머 선택/종류/음량/페이드는 기존 기한 유지. 종류·타이머 교체는 이전 attempt의 source 예약까지 정리하고 새 owner로 이동한다. 음량·페이드는 같은 owner의 gain 예약만 바꾼다. timer0은 native stop 예약이 없고 volume0은 재생 중 음소거다.

준비는 최대 10초, `resume()` 완료·native state running·현재 attempt·기한을 확인한 뒤에만 source를 시작한다. 중단 후 계속 듣기는 명시 action이며, 복귀 때 기한이 지났으면 재개 없이 정리한다. interval은 남은 값을 빼는 대신 실제 기한을 조회한다. 예약된 native 종료는 AudioContext 시간축을 쓰고 앱은 wall/monotonic과 복귀 검사를 함께 사용한다. OS 절전 동작이나 치료 효과는 보장하지 않는다.

## 자체 검사

`node scripts/check-white-noise.ts`: **11그룹 PASS**.

설정 6×6×3×2 조합/잘못된 값, 지연tick·벽시계후퇴·monotonic 수면 모사, 30초 fade envelope/음량0, CRUD clone/revision·실행정보 미저장, 6/40/정규화 이름 중복, 손상/미지원/unknown/중복ID/revision overflow, UTF-8 16KiB 정확 경계, stale raw·변조 snapshot 방어, quota/차단/쓰기 후 읽기 실패, readback 덮임·load clone, pre-aborted lock 및 미지원 fallback을 확인했다.

`node scripts/check-white-noise-session.ts`: **10그룹 PASS**.

무음 초기화, 준비 상태/97초 지연tick, type/same timer/new timer/off 전환, fade 중 음량·옵션 변경, 역순 resume/옛 ended/stop, 거부/비running 완료/10초 timeout/factory·watchdog 실패, 명시 resume·절전 후 기한 종료, unmount/재진입/조기 ended, 실제 adapter의 AudioParam 호출/예약 stop 순서·이벤트 해제, 부분 생성/start 실패 정리를 확인했다.

이 10그룹은 실제 controller/adapter 코드를 제어된 포트로 실행한 결과다. 실제 AudioContext 파형이나 브라우저 정책을 검증한 것으로 표현하지 않는다. OfflineAudioContext 파형과 실제 부모/저장 UI는 후속 연결 이후 독립 브라우저 담당이 확인한다. 실제 사용자 스피커 출력은 발생시키지 않았다.

신규 제품/검사 **7파일 scoped ESLint 오류 0/경고 0**. 최초 fixture의 prefer-const 1건은 callback closure만 정리한 뒤 해당 파일 lint0을 확인했다. 나머지 6파일은 최초 lint에서 오류/경고0이었다. 번역 구조 검사 KO/EN 63키 일치.

## 체크포인트/남은 작업

현재 신규 TS 단위는 안정화했고 편집을 중지할 수 있다. 26차 Base64Converter 독립 검토 요청이 오면 우선 전환한다. 다음 연결 승인 전에는 WhiteNoise 부모/canonical을 바꾸지 않는다.

후속으로 남은 것은 저장 패널의 실제 generation/취소 UI, 현재 부모에 source factory/controller 연결, 상태/음소거/명시 resume 표시와 토큰 정리, 실제 부모 fixture, native OfflineAudioContext 파형 및 KO/EN 320px, 독립 검토/전체 타입 검사다. 미연결 준비를 제품 완료로 표시하지 않는다.

### root 읽기 검토 후 보완할 resume 경계

26차 타입 검사 직전 root가 이미 시작된 suspended source의 resume 경계를 지적했다. 현재 구현은 resume 전/Promise 후 기한을 확인하지만, native context가 실제로 다시 진행한 뒤 JS 후속 검증까지의 순간에 이전 gain으로 출력될 가능성은 별도로 막지 않았다. ‘기한 후 앱이 새 start를 호출하지 않음’과 ‘그 구간에 물리 출력이 없음’은 다른 보장이다.

26차 체크포인트 뒤 adapter `mute()`(현재 gain 예약 취소+0) → 기존 source resume → 현재 attempt/기한/running 재검증 → 최신 설정 schedule 순서로 보완했다. preparing 중 statechange·volume·fade는 gain을 복구하지 않는다. 지연 resume 중 기한 경과 시 mute를 유지하고 정리한다. 제어 포트 영향2그룹과 실제 부모 영향검사가 통과했으며 최종 결과는 [구현 보고서](white-noise-implementation.md)에 기록했다.
