# 27B 백색소음 독립 검토

2026-11-17 KST · 검토: team_rotation. 실제 부모·프로필·session/browser/audio·순수 설정/저장 유틸을 읽고, 독립 실행 **6그룹 PASS**를 확인했다. 현재 범위에서 추가 제품 수정이 필요한 재현 결함은 없다. 제품/29차 준비 TS는 수정하지 않았으며 새 파일은 docs27의 JS/MD뿐이다.

검사: `node docs/verify/2026-11-17-repeat-batch27/check-white-noise-independent.mjs` (exit0).

검사 파일 scoped ESLint도 exit0, 오류0·경고0이다. 최초 fixture의 this-alias2건은 화살표 함수의 lexical this로 정리한 뒤6그룹 및 lint를 재확인했다. 제품 수정은 없다.

## 확인한 경계

1. **기존6종 합성 보존:** 읽기 전용 `git show HEAD:src/components/WhiteNoise.tsx`와 현재 파일을 TypeScript AST로 분리해 white/pink/brown/nature(3종)의 네 함수 body가 동일함을 확인했다(줄바꿈 정규화만 적용). 실제 부모에서 사용자 클릭 전 AudioContext0,6종의 기존2초/4초 buffer·loop·유한 샘플, 음량0 재생과 자원 종료를 확인했다.
2. **native resume 직전 무음/늦은 만료:** 부모→실제 browser ports→실제 session/audio adapter 전체를 연결하고 native AudioContext 객체만 제어했다. 이미 시작한 source의 suspended→resume에서 gain0 호출이 native resume보다 앞선다. Promise 대기 중 volume/fade/statechange/pageshow는 nonzero gain을 예약하지 않는다. wall clock만 기한을 넘긴 뒤 pageshow와 늦은 resume 성공을 주어도 idle을 유지하고 nonzero gain0회·context close1회다.
3. **최신 gain·종료 기준·오래된 이벤트:**20초 남은 상태에서 resume 대기 중 fade+80%로 바꾸면 확인 후 gain은 `0.8×20/30`이다. 종류 변경은 이전 deadline을 유지하고 타이머 변경은 지금부터 새 기한을 만든다. 이전 pending resume/ended가 새 attempt를 바꾸지 않는다. timer0은 종료 예약을 제거하며 locale가 설정/interaction signature를 변경하지 않는다. cleanup 뒤 owned listener가 제거되고 모든 context가1회 닫힌다.
4. **실제 부모/프로필 연결:** 프로필의 load 성공 callback을 실제 부모에 연결했다. 재생 중 load는 stop→settings 적용만 하며 새 AudioContext를 만들지 않는다. 부모의 새 inputKey로 프로필을 다시 렌더해도 성공 안내가 남는다. 언어 변경은 설정을 덮거나 자동 재생하지 않는다.
5. **lock 대기 취소:** 실제 child가 Web Locks 제어 포트에서 대기하는 동안 부모 음량 변경/취소/외부 storage conflict/언마운트를 각각 적용했다. 뒤늦은 lock callback은 현재 설정을 덮지 않고 쓰기0·새 오디오0이다. parent interaction→inputKey/layout invalidation 연결도 실행했다.
6. **CAS/readback/손상:** 실제 두 child가 같은 storage snapshot을 읽고 차례로 저장하면 두 번째 stale raw 쓰기는 conflict이고 이름 입력을 보존한다. setItem 성공 뒤 readback 차단은 unconfirmed로 표시하고 다시 저장하지 않으며 재조회 후 두 기록을 확인한다. 손상 JSON/future version/잘못된 설정/읽기 차단은 원래 raw를 보존하고 초기화 쓰기를 하지 않는다.

## 읽기 검토

- 남은 시간은 wall/monotonic deadline의 최소값과 마지막 표시값으로 제한한다. volume/fade는 같은 owner의 예약을 갱신하고 다른 타이머는 source 예약까지 정리한 새 owner로 이동한다.10초 준비 watchdog과 모든 callback은 attempt identity/released 상태를 확인한다.
- profile 저장은 strict known-key v1/revision·6개·이름40·16KiB이며 실행 상태/버퍼를 저장하지 않는다. authoritative raw를 재파싱해 변조된 snapshot 배열이 쓰기로 들어가지 않게 하고 raw CAS/readback을 한다. Web Locks 없는 fallback은 완전한 다중 문맥 원자성을 보장한다고 주장하지 않는다.
- 초기 hydrate는 목록만 읽고 설정 자동 적용/AudioContext 생성이 없다. 프로필 입력과 재생 조작은 분리되며 load 성공 때에만 현재 재생을 중지한다.

## 근거 한계

작성자의 assertions는 재실행하거나 독립 결과로 합산하지 않았다. 기존 component-harness를 사용했지만 독립 fixture는 실제 browser adapter를 교체하지 않고 native AudioContext/clock/DOM/lock 객체를 제어했다. 합성 함수 동일성은 HEAD와의 코드 근거다. 제어 포트는 실제 브라우저의 정책·Web Locks·OfflineAudioContext 파형 검증과 구분한다. Chrome/스피커 출력/전체 tsc/빌드/배포/공개 요청은 실행하지 않았다. OS 절전 중 정확한 실행이나 수면 효과도 검증 주장 밖이다.
