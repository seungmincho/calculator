# 41차 메모장 — 실제 부모 독립 검토

2026-11-17 KST. **새 실제 부모 독립9그룹 PASS, 재현된 추가 제품 결함/수정 요청 없음.** 준비 순수/Recovery 독립13그룹과 별도로 집계하며 준비 검사를 불필요하게 반복하지 않았다. 작성자 실제 부모10그룹·기존 회귀51도 이 수에 포함하지 않는다.

제품 `Notepad.tsx` → `useNotepadWorkspace.ts` → 실제 persistence/import/draft 및 기존 TTS handoff를 번들링한 컴포넌트 host를 사용했다. 작성자 `notepad-parent-harness.mjs`의 React/브라우저 I/O 포트만 재사용하고, fixture·이벤트 순서·예상 메모 내용/ID·저장 bytes·전달 텍스트는 `independent-parent-check.mjs`에 따로 작성했다. 작성자 검사 assertion은 재사용하지 않았다. 제품/공용 파일을 수정하지 않았고 Chrome/전체 tsc/빌드/실제 사용자 메모에 접근하지 않았다.

## 실행 결과

```text
node docs/verify/2026-11-17-repeat-batch41/independent-parent-check.mjs
Notepad independent actual parent: 9 groups passed
```

1. **초기/StrictMode/편집 우선** — ready 전 실제 handler를 호출해도 새 메모를 만들지 않는다. effect 재설정/초기 읽기는 저장0. 준비 뒤 입력한 CRLF·공백·한글 조합 중 문자·탭·이모지를 locale KO→EN→KO와 초기 timer 이후에도 그대로 표시하고400ms 저장1회로 확인했다.
2. **원래 외부 변경·clear 회귀** — dirty 상태에서 다른 탭 raw가 들어와도 현재 본문/선택을 유지하고 자동 write0. 옛 preview scope로 함께 보관하면 적용0, 현재 preview를 명시 선택하면 로컬/외부의 모든 내용4개를 보존한다. 외부 key 삭제와 storage key=null도 목록을 비우지 않으며, 현재 preview의 명시 동작 이후에만 복원 저장한다.
3. **실제 부모 ID 충돌·undo** — 기존 `a`, 외부 `a/1000-9`와 생성기 후보 `1000-9`를 구성해 최종 ID `a/1000-9-1/1000-9`를 확인했다. 같은 본문이어도 제목이 다른 합법 메모는 분리 보존한다. 파일 가져오기 뒤 편집한 원고는 이전 undo handler로 되돌아가지 않는다.
4. **원래 늦은 파일 회귀** — 파일 읽기 중 편집하면 이전 완료는 현재 원고에 반영하지 않고 다음 순차 파일 읽기도0. 새 파일 뒤 오래된 거절·같은 파일 재선택·정상/손상 파일 혼합·명시 취소·언마운트 뒤 거절을 확인했다. 입력의 file value를 비우고 정상 추가 내용과 개별 오류 파일명을 유지한다.
5. **삭제 undo/안내 timer** — 삭제 복원 후 새 삭제의 undo가 이전6초 callback으로 지워지지 않는다. 후속 편집 후 이전 undo는 삭제한 메모를 되살리거나 새 내용을 덮지 않는다. TXT는 클릭 당시 최신 본문이고 URL은 cleanup 때 회수한다.
6. **잠금 안 own basis** — 첫 저장의 실제 lock action을 실행한 직후 Promise continuation 전에 다음 입력/저장을 시작해 두 번째 저장도 정상 완료됨을 확인했다. 이전 대기 저장은 새 편집 세대로 취소되어 세 번째/네 번째 초안 중 마지막 내용만 추가 저장한다. notes key 잠금만 사용했다.
7. **숨김/이탈/복귀** — visibility hidden의 앞당긴 flush는 잠금 확인 전 `saving`이며 성공을 선표시하지 않는다. 그 뒤 pagehide는 pending AbortSignal을 취소하고 쓰기0. 돌아오기 전에 외부 raw가 바뀌면 pageshow는 현재 메모리 원고를 유지하고 external 상태로 재확인하며 자동 덮기0.
8. **확인 불가/손상 원본** — 실제 setItem 뒤 readback throw는 `unconfirmed`이고 rollback/자동 재시도0. 그 사이 최신 편집을 보존하고 명시 재조회는 확인된 기존 저장만 basis로 채택한다. 명시 retry는 최신 원고를 쓴다. 손상/미지원 원문은 새 메모 편집 뒤에도 bytes를 유지하고 원본 raw 백업과 현재 JSON 백업을 각각 내보낸다.
9. **읽어주기/설정 분리** — 실제 선택 범위가 새 격리 TTS target의 기존 session payload로 전달되고 source/opener/경로를 유지한다. 원고 수정 뒤 이전 선택 handler는 전달0, 전체 전달은 최신 텍스트다. settings quota는 본문 저장을 막지 않고 메모리 글꼴 설정을 유지한다. 명시 설정 retry 성공 뒤 새 대기 설정은 pagehide로 취소되어 이전 확인값을 유지한다.

## 검사기 보정과 한계

첫 실행은2번에서 실제/예상 문자열 목록이 같았지만 VM realm 배열 prototype이 달라 Node strict deepEqual이 실패했다. 반환 목록을 host `Array.from`으로 옮기는 **검사기만** 보정했다. 이후9그룹 모두 통과했다. 제품 결함으로 집계하지 않는다.

hook host의 useDeferredValue는 identity 포트이므로 브라우저 입력 지연·큰 원고 통계 성능을 검증한 결과가 아니다. Web Locks는 실제 같은 키/current/AbortSignal 경로를 호출하되 acquisition을 제어한 포트다. native 탭 간 잠금·실제 파일 선택·Clipboard·시각 layout·IME 브라우저 입력은 verifier 담당이며 이 보고서의 완료 범위에 포함하지 않는다.

Recovery의 표시와 버튼 자체는 준비 독립에서 실행했고, 이번 검사는 실제 부모가 넘긴 최신 view와 callback을 사용했다. 저장 실패 안내를 확인된 디스크 내구성이나 모든 환경의 원자성 보장으로 해석하지 않는다.

최종 독립 JS1파일 scoped ESLint **exit0·오류0·경고0**. 제품 수정 없이 검토를 완료했고 새 검증이 필요한 실제 발견 사항은 없다.
