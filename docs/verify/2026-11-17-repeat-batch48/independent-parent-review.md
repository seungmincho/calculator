# 48차 CharacterCounter 독립 부모 검토

2026-11-17. **별도 기대값의 실제 부모 검사8그룹 PASS. 재현 가능한 제품 결함/수정 요청 없음.** 제품 TS/공용 파일/원본 baseline은 수정하지 않았다. 작성자 검사를 다시 실행하여 독립 검사로 집계하지 않았다.

`independent-parent-check.mjs`는 범용29 hook host만 재사용한다. CharacterCounter와 실제 helper를 번들하고 저장소/Clipboard/legacy DOM/Web Lock/명시 confirm/언어 포트는 별도로 만들었다. 복구 자식과 기존 WritingVersionsPanel도 별도 실제 host로 실행하며 부모의 최신 props를 전달했다. WritingVersionsBackup은 이 검사에서 UI 경계로만 남겼고 그 내부 backup 기능을 새로 검증했다고 하지 않는다.

## 확인한 경계

1. **초기 필드 병합20좌표**:5문항×제목/본문/목표/기준을 복원 전에 하나씩 바꾼 실제 이벤트를 실행했다. 기대값은 저장 fixture를 복제하여 해당 좌표만 바꾼 독립 객체다. 초기0쓰기, 나머지 원문·CRLF/emoji·목표/기준, 저장 활성 문항, 명시 기본0번 문항 선택을 대조했다.
2. **실제 수동 복구**:긴 한글/emoji/CRLF 원고 전체의 native 거부+legacy false를 실제 부모에 주입하고 실제 recovery textarea의 원문·readOnly·전체 선택 범위를 확인했다. 명시 retry는 동일 전체 원고를 복사했다. API가 없고 legacy가 throw해도 복구를 표시했다.
3. **복사 요청 소유권**:native 대기 뒤 문항/본문/언어 A→B→A, 일반 복사→맞춤법 복사와 역방향을 실행했다. 최신 작업 뒤 예전 reject의 legacy0/잘못된 복구0을 확인했다. 맞춤법은 고정 URL 및 noopener,noreferrer로만 열기 요청하며 원문을 URL로 보내지 않는다.
4. **undo revision**:수정본의 제목/본문/목표/기준 전체 복원 후 다른 문항 편집·왕복을 거쳐 undo하면 원래 네 필드가 복구됐다. 같은 문항 편집 A→B→A 뒤 캡처한 옛 undo/옛 version restore callback은 새 입력을 덮지 않았다.
5. **전체 초기화와 autosave 경합**:이전 save → clear 확인 → 새 입력/save의3개 대기 작업을6가지 순서로 풀었다. 모두 최신 원고 저장1회/remove0, 현재 표시 원고와 raw 일치, 수동 수정본 key bytes 유지였다. 실제 Web Locks의 FIFO를 모사한다고 주장하지 않고, 늦은 callbacks의 소유권을 더 넓게 흔든 제어 포트 검사다. 정상 명시 전체 초기화는 자동 초안 key만 제거했다.
6. **실제 수정본·Diff 통합 경계**:실제 WritingVersionsPanel에 부모의 문항4 최신 원문/제목을 전달했다. 명시 Diff handoff의 가짜 새 탭 session payload에서 left=저장 수정본, right=현재 원문·CRLF/emoji, sourceTab4와 고정 경로를 독립 JSON 파싱해 확인했다. source versions raw는 그대로이고, 실제 확인 복원→부모 undo는 모든 필드를 되돌렸다. 새 탭/외부 페이지를 실제로 열지는 않았다.
7. **손상/접근 차단/쓰기 확인 실패**:초기 조기 입력과 손상 raw를 보존하고0쓰기를 확인했다. 접근 차단에서도 조기 제목이 남았다. 실제 set 이후 readback throw는 현재 원문을 유지하면서 failed를 표시했다. 이미 쓰기가 있었던 raw를 이전 값으로 rollback했다고 주장하지 않는다.
8. **Strict replay/실제 cleanup**:effect 재실행 뒤 현재 원고와 저장 raw가 유지되고 이전 Clipboard 거부는 fallback을 실행하지 않았다. cleanup 뒤 남은 save/clear/copy를 완료해도 추가 쓰기0/fallback0이었다.

## 증거와 범위

- 실행: `node docs/verify/2026-11-17-repeat-batch48/independent-parent-check.mjs` —8그룹 PASS.
- 결과/제품 SHA: `independent-parent-results.json`.
- 원래 `before-fix.json`, `clear-before-fix.json`, 두 baseline MJS를 검사 전후 SHA로 대조하여 바뀌지 않았음을 확인했다. baseline을 post-fix 기대값으로 수정하거나 `--record`로 덮지 않았다.
- 최초 독립 script의 괄호 누락 SyntaxError는 제품 실행 전 검사 작성 오류였다. 해당 MJS만 고친 뒤8그룹을 실행했으며 제품 결함으로 집계하지 않는다.
- native Clipboard/IME/실제 브라우저 Web Locks/320 화면 검사는 verifier 담당이다. 본 검토는 제품 이벤트/효과·helper의 제어 포트 결과이며 Chrome/개인 원고/공개 RPC/전체 타입/build를 실행하지 않았다.

제품 변경 없이 독립 MJS 범위 lint를 실행해 **exit0/오류0/경고0**을 확인했다. 기존 작성자18그룹과 중복 합산하지 않으며 통합 보고서에는 **독립8그룹**으로 기록한다.
