# 27차 B 백색소음 구현 결과

2026-11-17 KST. 26차 체크포인트 뒤 부모 연결을 완료했다. 제품 TS를 고정하고 독립·브라우저 검증을 요청했다. 전체 tsc/Chrome/빌드/배포/커밋은 본 담당이 실행하지 않았다.

## 최종 동작

`WhiteNoise.tsx`의 기존 6종 합성 함수 본문은 그대로 유지하고 source factory로 연결했다. 재생 클릭 전 AudioContext 생성0, 실제 resume 성공·running·현재 attempt·기한 확인 뒤에만 source를 시작한다. 준비 실패/10초 timeout은 해당 owner를 정리한다.

첫 재생 및 다른 타이머 값 변경은 지금부터 새 기한을 만든다. 같은 값 재선택, 종류/음량/페이드는 기한을 유지한다. wall/monotonic 잔여와 native stop 예약을 함께 쓴다. timer0은 무기한, volume0은 재생 중 음소거다. 종류/타이머 교체는 이전 source/gain/context를 정리하고 새 owner로 이동한다.

root가 지적한 **mute-before-resume**를 먼저 보완했다. 이미 시작된 suspended source는 gain 예약 취소+0 후 resume한다. preparing 중 statechange/volume/fade는 음량을 올리지 않는다. Promise 뒤 현재 attempt·기한·running 확인에 성공할 때만 최신 gain을 예약한다. 대기 중 만료되면 음소거를 유지하고 정리한다. OS 자체의 모든 출력 타이밍을 보장한다는 주장과 구분한다.

`WhiteNoiseProfiles.tsx`는 최대6개 설정을 명시 저장/이름 변경/불러오기/삭제한다. load/delete는 화면 확인을 거친다. load 성공 시에만 소리를 멈추고 설정을 적용하며 자동 재생은 없다. 현재 설정·재생 조작·선택 변경/취소/storage event/unmount는 lock 대기를 무효화한다. 손상/future/차단/quota는 입력을 유지하고, 쓰기 뒤 확인 실패는 별도 안내한다.

수정 UI는 토큰·44px 조작·16px 입력을 적용했다. 화면 가이드의 수면·이명 효능과 dB 단정은 실제 기능 설명으로 교체했다. 공용 FAQ/SEO는 통합 담당이 관리한다.

## 검사

- 준비 `scripts/check-white-noise.ts`: **11그룹 PASS**. strict 설정/저장·한도·CAS/readback/실패. 유틸은 준비 후 불변이다.
- `scripts/check-white-noise-session.ts`: **12그룹 PASS**. 준비10에 mute→resume 순서/대기 중 unmute 차단/만료 정리 영향2그룹 추가.
- `docs27/check-white-noise-parent.mjs`: 실제 부모/프로필/controller/adapter **8그룹 PASS**.

부모8그룹은 6종 버퍼 길이/유한 표본/loop·초기 무음·음량0, type/volume/locale/타이머 기한, load의 stop·자동재생0, mute/resume 기한 경과, 준비 실패/취소/언마운트, CRUD/확인, quota/확인불가/손상/future 이름 보존, settings/cancel/storage/unmount에 의한 대기 load 취소, 이벤트 없이 바뀐 raw의 lock 내부 CAS, load 성공 안내가 부모 inputKey 변경 후에도 유지되는 경계를 포함한다. 하위 시나리오를 별도 그룹으로 중복 집계하지 않는다.

제품/TS검사9파일 scoped ESLint **0오류/0경고**. 마지막 비동기 flush 보강 뒤 JS 부모 fixture도 **exit0/경고0**으로 종료했다. 합계10파일의 범위 검사를 마쳤다. 초기 추가 assertion 실패는 deferred lock 결과의 microtask 완료 전에 DOM을 읽은 검사 포트 문제였고 제품 수정은 없었다.

실제 스피커·개인 오디오·외부 요청은0이다. native adapter 검사는 제품 API 호출 코드를 fake AudioContext로 실행한 것이다. 실제 OfflineAudioContext 파형·native 브라우저는 검증 담당의 별도 범위다. OS 절전·청각 안전/치료 효과를 검증했다고 주장하지 않는다.

## 검증 인터페이스

상태 `[data-white-noise-player]`: `data-noise-phase`, `data-noise-generation`, `data-noise-remaining`(ms/무기한 빈 값), `data-noise-deadline`(wall epoch ms/없으면 빈 값).

재생 `[data-noise-play]`, suspended의 `[data-noise-stop]`, `[data-noise-type="white|pink|brown|rain|wind|wave"]`, `[data-noise-timer="0|5|10|15|30|60"]`, `[data-noise-volume]`, `[data-noise-fade]`.

저장 `[data-noise-profile-name]`, form `[data-noise-profile-save]`, `[data-noise-profile-select]`, `[data-noise-profile-load]`, `[data-noise-profile-confirm="load|delete"]`, `[data-noise-profile-rename]`, `[data-noise-profile-rename-save]`, `[data-noise-profile-delete]`, `[data-noise-profile-reload]`, `[data-noise-profile-cancel]`.

key/schema 및 Web Locks 미지원 한계는 [준비](white-noise-preparation.md)/[설계](white-noise-implementation-design.md)에 있다. KO/EN 최종 `translations-white-noise.json`은 통합 담당에게 전달했다.
