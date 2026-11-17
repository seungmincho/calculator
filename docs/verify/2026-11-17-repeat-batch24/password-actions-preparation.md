# 24B 부모 미연결 준비

2026-11-17 KST. 새 파일만 작성했고 `PasswordGenerator.tsx`, `password.ts`, wordlist, 공용 원본/생성물은 변경하지 않았다. 23차 체크포인트 뒤 승인 신호까지 부모 연결을 보류한다. 준비 TS는 완성 단위로 편집 중지했다.

## API와 연결할 경계

- `src/utils/passwordActions.ts`: `regeneratePasswordResult(results,index,generate)`는 범위 내 정수 인덱스에서만 기존 생성 callback을 한 번 호출하고 해당 위치만 바꾼 새 배열을 돌려준다. 잘못된 위치는 원본 배열을 유지하며 동일 생성값도 허용한다. 부모는 옵션 검증 뒤 React updater 바깥에서 호출해야 한다.
- `createPasswordCopyGuard()`는 `begin`/`isCurrent`/`invalidate`로 개별·전체 복사 순서와 결과 revision을 관리한다. 부모의 설정/생성/탭 동작 시작 시 동기로 invalidate하고 언마운트도 invalidate해야 한다. 오래된 알림 timer도 해당 token을 검사한다.
- `copyPasswordText(text,isCurrent,ports?)`는 copied/failed/stale을 반환한다. 테스트에서는 writeText/fallbackText port를 주입하고 실제 연결에서는 기본 브라우저 API를 사용한다. 시작 전/비동기 결과 뒤/fallback 전후 최신 여부 확인, legacy 정확히 true만 성공, 임시 textarea finally 제거·초점 복구를 포함한다. OS에 이미 제출한 쓰기를 취소하지는 않는다.
- `PasswordCopyRecovery` props: `text`, `target:number|'all'`, `count`, 선택 `busy`, `onRetry`, `onClose`. 읽기 전용 snapshot, 명시 텍스트 선택, 선택 실패 안내, 재시도/닫기이며 입력16px·버튼44px다. 부모는 새 실패 snapshot마다 request key를 주고 생성/설정/탭/닫기에서 해당 snapshot과 pending 요청을 무효화한다. 자식에는 생성이나 저장 기능이 없다.
- 부모 연결 때 row key를 값 포함 key에서 위치 key로 바꾸고 현재 버튼 초점을 유지한다. 기존 locale→생성 의존이 없다는 점을 보존하며 locale 입력 유지/키보드/실제 초점은 아직 부모 연결 후 검사 대상이다.

## 번역과 검사

`translations-password-actions.json`: `passwordGenerator.actions` 4키, `copyRecovery` 10키, ko/en 모두. 기존 namespace 모듈을 사용하며 canonical 병합은 통합 담당의 몫이다.

| 검사 | 결과 |
| --- | --- |
| `scripts/check-password-actions.ts` | 10그룹 PASS. 세 기존 생성기 한 위치 교체·1회 호출·동일값·잘못된 위치, 요청 순서/무효화, 늦은 성공·거절, 정확한 fallback 결과, 임시 DOM 정리/초점 port |
| `check-password-recovery.cjs` | 실제 자식 KO/EN 2그룹 PASS. snapshot·선택/실패·재시도/대기/닫기 및 크기 클래스. host ref는 제어 포트 |
| 기존 `scripts/check-password.ts` | all passed. 기존 난수·문자 옵션·단어/엔트로피 회귀 |
| 새 제품/검사 4파일 ESLint | exit 0, 오류 0/경고 0 |

검사 출력에 생성된 비밀번호 원문을 기록하지 않았다. 부모의 실제 이벤트·URL·locale·초점 및 Chrome Clipboard/320px 검증을 완료했다고 주장하지 않는다. 전체 tsc·build·Chrome·canonical 번역 변경을 실행하지 않았다.
