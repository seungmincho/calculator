# 24B 부모 연결 완료

2026-11-17 KST. 23차 전체 타입 검사/Chrome 종료 체크포인트 후 연결했다. [준비 상태](password-actions-preparation.md)의 새 유틸/자식을 실제 `PasswordGenerator.tsx`에서 사용한다. 자체 검사 뒤 TS 편집을 멈추고 독립/브라우저 결함 대응을 우선한다.

## 구현

- 일반 비밀번호/PIN/단어 조합에서 각 행을 현재 옵션으로 한 번만 재생성한다. 다른 위치는 그대로 유지하며 우연한 같은 값도 허용한다. 행 key는 값이 아닌 고정 위치이므로 재생성 버튼 DOM을 유지한다. 기존 `password.ts`와 wordlist/옵션 검증/엔트로피는 변경하지 않았다.
- 설정/프리셋/생성 모드 변경은 기존처럼 전체 결과를 갱신한다. 초기 URL 복원 뒤에만 생성하며 첫 HTML에는 생성값이 없다. 초기 복원은 취소 가능한0ms callback, 이후 생성은 사용자 동작에서 실행한다. 설정과 생성의 연결을 effect 대신 이벤트로 옮겨 복사 세대 무효화와 새 결과 적용이 같은 동작에서 이뤄지게 했다. 설정 URL 직렬화 규칙은 그대로다.
- 앱 locale은 결과를 재생성하지 않는다. 기존 코드에도 직접 locale 생성 의존은 없었으며 이를 보존했다. 결과 안내는 비밀값이 없는 키/순번/개수로 보관해 렌더에서 번역한다. 강도 확인 입력과 표시 여부도 유지한다.
- 개별/전체 복사가 한 guard를 공유한다. 실제 성공만 체크 표시하고 2초 timer도 해당 요청을 확인한다. 설정/모드/개별·전체 재생성/닫기/언마운트는 대기 응답을 무효화한다. 새 복사가 옛 거절 뒤 legacy 복사를 시작하게 하지 않는다.
- 실패 snapshot은 읽기 전용 선택/재시도/닫기로 복구한다. 다른 대상 복사를 시작하면 이전 복구 대상은 제거하고, 같은 대상 재시도 동안에는 해당 snapshot과 대기 상태를 유지한다. 값 변경 뒤 복구 대상은 폐기한다. 이미 OS에 제출한 쓰기 자체는 취소하지 않는다.
- 입력16px·행 버튼44px, 긴 값 줄바꿈/작은 화면 버튼 wrap을 적용했다. 실제 초점과 320px overflow는 브라우저 담당 검증 대상이다. 생성값·검사 입력을 저장소/URL/로그/네트워크에 추가하는 경로는 없다.

## 선택자·번역

`[data-password-row="index"]`, `[data-password-value="index"]`, `[data-password-regenerate="index"]`, `[data-password-regenerate-all]`, `[data-password-copy="index|all"][data-password-copied="true|false"]`, `[data-password-copy-recovery]`. 기존 탭 `#pg-tab-random|pin|passphrase|check`, 강도 입력 `#pg-check`를 유지한다.

`translations-password-actions.json`의 ko/en14키가 최종 조각이며 준비 뒤 추가키는 없다. canonical 생성/메타는 통합 담당이 맡는다.

## 검사와 다음 단계

- 준비 순수10그룹 + 실제 복구 자식 KO/EN2그룹 PASS, 기존 `check-password.ts` all passed.
- `check-password-parent.mjs` 실제 부모6그룹 PASS: 세 모드 한 위치·동일값/안정 key, 전체/설정·무효 옵션·locale/강도입력/설정URL, 실제 복사 포트 텍스트 대조·false 복구, 4종 변경×늦은 성공/거절, 새 요청/닫기 경합, locale 중 복사/언마운트. 생성값은 메모리에서만 비교하며 원문을 로그에 남기지 않았다.
- 최종 제품/검사6파일 scoped ESLint exit0, 오류0/경고0. 슬라이더 렌더 helper에 이벤트 callback을 넘기는 방식에서 refs 규칙이 경고한 부분은 독립 `PasswordSlider` 컴포넌트로 정리했으며 규칙을 끄지 않았다.

부모 fixture는 실제 부모 소스에 제어 난수/Clipboard/DOM 포트를 주입한다. 실제 브라우저 clipboard·DOM focus와 동일하다고 주장하지 않는다. 다음 검사는 독립 검토와 verify의 실제3모드/복사/초점/KO·EN/320px이며 전체 tsc는 해당 완료 뒤 통합 담당이 실행한다. 이 담당자는 Chrome·전체 tsc·build·canonical 수정·배포를 실행하지 않았다.
