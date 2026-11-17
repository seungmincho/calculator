# 24B 비밀번호 항목 재생성 — 독립 검토

2026-11-17 KST. `gpa_scenarios`가 최종 부모 연결과 [24차 B 계약](plan.md)을 대조했다. **추가 재현 결함 없음, 독립 6그룹 PASS.** 제품·기존 작성자 검사·공용 번역은 수정하지 않았다.

## 증거

명령: `node docs/verify/2026-11-17-repeat-batch24/check-password-independent.mjs`

검사 파일 scoped ESLint: `npx eslint docs/verify/2026-11-17-repeat-batch24/check-password-independent.mjs` — **exit 0, 오류/경고 0**.

실제 `PasswordGenerator.tsx`, `PasswordCopyRecovery.tsx`, `passwordActions.ts`, 기존 `password.ts`와 단어 목록을 실행했다. 생성기를 가짜 문자열 함수로 교체하지 않고 Node Web Crypto를 공급해 기존 암호학적 난수 경로를 사용했다. Clipboard/DOM/시간/저장소만 제어 포트로 대체했다. 생성값은 메모리 안에서 비교하며 stdout·파일에 기록하지 않았다.

| 그룹 | 확인한 경계 |
| --- | --- |
| 실제 3모드/위치 교체 | 일반 24자·특수문자·모호 문자 제외·연속 반복 금지, 12자리 PIN, 대문자/숫자/마침표 4단어 조합. 첫/중간/끝 위치를 바꾸고 나머지 값·배열 길이·행 key가 유지되는지 확인. 우연한 같은 값은 실패로 판정하지 않음. |
| locale/검사 입력/설정 URL | 최초 정적 트리에는 생성값이 없음. 언어 전환은 결과를 유지. 강도 확인 입력과 표시 상태는 모드 왕복/locale 후 유지. URL에는 설정과 기존 hash만 있고 생성값/확인 입력·저장소 접근이 없음. |
| 실제 복사 성공/실패·복구 child | native 거절+legacy false에서 성공 표시 없이 정확한 전체 결과를 readonly 복구에 제공. 실제 child 선택/재시도 연결, legacy true만 성공, 임시 textarea 정리·원래 초점 복구 확인. |
| 복사 revision/요청 순서 | 다른 위치 재생성·전체 재생성·설정·탭 변경 뒤 옛 거절은 legacy 복사를 시작하지 않음. 새 전체 복사 뒤 옛 개별 성공이 안내를 덮지 않음. |
| 잘못된 옵션/회복 | 빈 특수문자 설정은 결과/재생성 버튼을 차단하고 대기 복사를 무효화. 유효 옵션으로 돌아오면 실제 결과 생성. 다른 위치 재생성도 이전 복구 snapshot을 제거. |
| 닫기/언마운트/locale | 복구 재시도를 닫은 뒤 늦은 거절 무시. 현재 요청은 locale 변경 후 성공할 수 있음. 언마운트 뒤 거절은 fallback/복구를 만들지 않음. |

## 코드 대조

개별 재생성은 현재 옵션으로 `regeneratePasswordResult`의 한 위치만 바꾸며 행 key를 index로 유지한다. 기존 생성/옵션 검증/엔트로피 구현은 그대로 사용한다. 생성 동작은 locale 번역과 분리돼 있고, 번역용 안내 state에는 비밀번호 대신 키·순번·개수를 보관한다.

개별/전체 복사는 하나의 guard에서 요청 순서와 결과 revision을 공유한다. 결과를 바꾸는 동작과 탭 이동은 즉시 무효화하며, async 완료와 체크 표시 제거 timer도 현재 token을 확인한다. 실패 복구는 snapshot 기준이고 값 변경 뒤 폐기된다. Clipboard에 이미 제출한 시스템 쓰기 자체를 취소한다고 주장하지 않는다.

계약 밖의 새 저장/내보내기/생성 알고리즘 변경은 발견하지 않았다. 실제 브라우저의 native 권한, DOM 버튼 초점 유지, 320px 레이아웃은 verify의 별도 검사로 남기며 이 fixture 결과와 혼합하지 않는다. Chrome·전체 tsc·빌드·배포·커밋은 실행하지 않았다.
