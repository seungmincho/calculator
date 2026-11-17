# 24B 비밀번호 개별 재생성·복사 복구 읽기 설계

2026-11-17 KST. [계약](plan.md)의 B 읽기 설계다. 22차 체크포인트 후 부모 미연결 준비를 승인받아 [유틸/자식 준비](password-actions-preparation.md)를 완성했다. 부모 연결은 23차 체크포인트 뒤 신호까지 보류한다.

## 확인된 코드와 최소 변경

- `PasswordGenerator.tsx`의 `generate`는 이미 `t`에 의존하지 않는다. 현재 코드에서 언어 변경만으로 전체 재생성되는 직접 경로는 찾지 못했다. 이 분리를 유지하고 실제 locale 변경 회귀를 추가한다. 번역은 결과 생성 조건에 넣지 않는다.
- `src/utils/password.ts`의 `generatePassword`/`generatePassphrase`, 기존 검증·단어 목록·엔트로피를 그대로 사용한다. 생성기를 새로 만들거나 중복 제거·재추첨하지 않는다. PIN은 기존 숫자 전용 `pwOpts`를 그대로 쓴다.
- 한 행 동작은 현재 모드/옵션이 유효하고 인덱스가 존재할 때 기존 생성기를 한 번 호출한 후 해당 위치만 교체한다. 난수 호출은 React 상태 updater 바깥에서 수행해 updater를 순수하게 유지한다. 무효 옵션이면 호출하지 않는다.
- 현재 행 key가 `${i}-${v}`라 값이 바뀌면 버튼 DOM이 교체된다. 목록에 정렬/개별 삭제가 없으므로 위치 `i`를 안정 key로 사용하면 해당 위치 버튼과 초점을 유지할 수 있다. 새 행 ID나 저장 schema는 필요하지 않다.
- 각 행에 44px 재생성 버튼과 순번을 포함한 접근성 라벨을 둔다. 좁은 화면의 긴 문자열은 줄바꿈하고 버튼은 별도 공간을 확보한다. 강도 확인 입력·표시 여부는 생성 결과와 계속 분리한다.

## 복사 상태와 선택 복구

현재 copy는 `execCommand`의 false를 무시하고 catch 뒤에도 copied를 설정한다. 전체/개별을 같은 요청 세대로 관리하고 다음 최소 API를 검토한다.

`copyPasswordText(text, isCurrent, ports?): Promise<'copied' | 'failed' | 'stale'>`

ports는 선택적 `writeText`와 동기 `fallbackText`만 가진다. 실제 성공만 copied이며 legacy는 정확히 true일 때만 성공이다. 비동기 거절 뒤 fallback을 시작하기 전과 완료 뒤 최신 요청인지 확인한다. DOM fallback은 임시 textarea를 finally로 제거하고 기존 초점을 복구한다. 기존 QR/Markdown의 같은 패턴을 참고하되 다른 도구 이름을 가진 유틸을 비밀번호 화면에 직접 결합하지 않는다.

- 화면이 `revision`, `copyRequest`, mounted 상태를 소유한다. 개별/전체 생성·설정 변경·탭 이동은 revision을 동기 증가시켜 대기 중 응답을 먼저 무효화한다. 새 복사는 이전 복사 요청을 대체한다. 언마운트도 무효화하며 알림 timer를 정리한다.
- 복사는 클릭 당시 텍스트·행/전체 대상·개수를 고정한다. 늦은 성공/실패와 예전 2초 timer가 새 체크 표시·복구 대상을 덮지 못하게 요청 번호를 확인한다. 이미 OS에 제출한 쓰기 자체의 취소나 최종 OS 순서는 보장하지 않는다.
- 실패하면 현재 snapshot만 읽기 전용 textarea에 표시하고 명시 선택/재시도를 제공한다. 재생성/설정/탭 변경은 복구 텍스트도 즉시 제거한다. 강도 확인 입력을 이 패널로 노출하지 않는다.
- 안내는 비밀값이 없는 이벤트 종류·순번·개수로 보관하고 렌더에서 번역한다. locale만 바뀌어 결과·검사 입력·진행 복사가 자동 재시작되지 않게 한다. 생성 결과/복구 snapshot은 URL·저장소·로그·요청에 넣지 않는다.

## 소유와 검증 경계

예상 소유는 부모 `PasswordGenerator.tsx`, 필요하면 독립 `src/utils/passwordActions.ts`, 전용 검사, `translations-password-actions.json` ko/en 조각이다. 기존 난수 유틸·wordlist는 읽기만 하며 공용 번역/메타는 통합 담당이 변경한다.

검사는 기존 `scripts/check-password.ts` 회귀와 실제 부모 fixture를 구분한다. 부모 fixture에서 세 생성 모드의 한 위치 교체/나머지 동일, 동일 난수값 허용, 무효 옵션 무호출, 설정 전체 갱신, locale 전환 시 값·강도 검사 입력 보존, 설정 URL에 비밀값 없음, 성공/거절/legacy false 및 지연 응답·timer 경합을 확인한다. Chrome 담당은 실제 현재값 복사·선택 복구, 버튼 DOM 초점 유지, KO/EN 및 320px을 확인한다. 테스트는 생성된 가짜 데이터만 사용하고 비밀번호 내용을 로그에 출력하지 않는다.
