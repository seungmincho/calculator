# 36차 DutchPay 부모 연결

2026-11-17 KST. 33/34 전체 타입 체크포인트 후 승인된 부모 연결을 마쳤다. 제품 TS는 final ready로 freeze하며 독립/native 발견 대응을 우선한다. **브라우저·독립 최종 검토·전체 타입은 별도 단계**다. 이 담당은 Chrome/전체 tsc/빌드/배포/커밋을 실행하지 않았다.

## 구현

`DutchPay.tsx`를 준비 storage/copy/복구 child에 연결했다. 최근 저장과 계좌는 기존 두 key/schema 그대로이고, 정상 초기 읽기는0 write다. 초기 RAF에서 URL/legacy URL을 먼저 복원한 뒤 ready를 켠다. 그 전 조작 UI와 handler/공유는 막는다. 새 주소 writer는 현재 URL의 d/ro/legacy total·people 소유 키만 바꾸고 관계없는 중복 query/hash/history.state를 보존한다. 새 roLink는 기존처럼 origin/path+d+ro만 사용한다.

최근 저장은 클릭 당시 State를 정확히 codec 왕복 검증한 뒤 commit한다. 100항목은 지원하고101항목은 현재 폼과 저장 raw를 그대로 두고 안내한다. 손상/미지원/초과 raw를 빈 정상값으로 덮지 않는다. 마지막 확인 목록과 현재 폼, 기록 상태, 복사 상태를 분리했다. 저장 도중 편집한 폼을 성공 응답이 되돌리지 않으며 과거 저장 성공은 현재 폼 revision이 다르면 표시하지 않는다. 값이 A→B→A로 돌아와도 과거 저장 성공이 부활하지 않는다.

save/delete/load는 같은 recent key Web Lock과 raw basis를 사용한다. 수동 load만 폼을 바꾸며 대기 중 편집/새 조회/이탈은 이전 load를 취소한다. 재조회는 목록/basis만 바꾸고 폼/계좌를 적용하지 않는다. quota/read 차단/readback 확인 불가/충돌은 실패 안내로 구분하고 rollback하지 않는다. 실패한 key만 쓰기를 막는다.

계좌는 편집 즉시 메모리 공지에 반영하고 기존 자동 저장을 유지한다. 최신 입력만 lock을 통과하고 자기 verified write의 basis를 callback 안에서 먼저 갱신한다. `storage` event는 queued write를 무효화하고 현재 입력을 유지한 채 명시 재확인을 요구한다. recheck는 자동 재저장하거나 메모리 입력을 덮지 않는다. account와 recent의 외부 변경 상태가 서로 전파되지 않는다.

amount/notice/link 복사는 하나의 요청 guard, 현재 원문 scope, 완료 token을 사용한다. native 성공/legacy true만 성공이며 전체 literal 복구를 제공한다. 입력/계좌/ro/locale 변경·다른 출력·언마운트 뒤 stale fallback/안내를 막고 input/locale A-B-A에서도 이전 피드백이 부활하지 않는다. 닫기/복구 재시도 성공은 유효한 원래 copy 버튼으로 focus를 돌린다. 기존 nested CopyBtn을 실제 button 렌더 helper로 바꿔 상태 변화 때 버튼 컴포넌트를 새 타입으로 remount하지 않는다.

ShareResult는 제품 수정 없이 기존 resultKey와 래퍼 capture로 연결했다. 공유 버튼 클릭은 지역 copy guard를 취소하고 지역 copy 시작은 ShareResult resultKey를 바꾼다. amount/notice/link 각각과 공용 링크의 양방향6조합을 실제 ShareResult로 검증했다. 이미 제출된 OS Clipboard·share UI 자체의 취소는 보장하지 않는다.

계좌는 d/최근 기록/ro 공지·DOM에 들어가지 않는다. 편집 notice와 사용자가 명시 공유하는 ShareResult text에는 기존처럼 포함된다. ro는 접근 통제/암호화가 아니며 저장·계좌 입력 UI는 숨긴다. 현재 계산 수학과 URL codec은 수정하지 않았다. 간단 반올림/여행 정산의 실제 부모 결과도 별도 손계산 기대값으로 확인했다.

## 파일과 번역

- 제품: `src/components/DutchPay.tsx`, `DutchPayCopyRecovery.tsx`, `src/utils/dutchPayStorage.ts`, `dutchPayCopy.ts`.
- 저장 utility 부모 단계 추가는 `createDutchPayAccountWriter.externalChange()` 하나이며 큐 취소/메모리 보존의 도메인 회귀를 추가했다.
- `translations-dutch-pay.json`: KOEN **32leaf**씩. 준비31키에 `storage.loading`1개 추가. 기존 guide/description/canonical/menu/meta는 통합 담당 소유다.

## 자체 검증

- 저장 **13그룹 PASS**: 준비12+external event1. 같은 key의 실제 utility/제어 storage/lock port로 경쟁·실패·unknown write·최대 legacy339,201B/100·101손실을 확인.
- 복사 포트 **4그룹 PASS** 및 실제 KO/EN 복구 child **2그룹 PASS**: 준비 당시 파일 불변으로 결과 유지.
- 실제 부모 **11그룹 PASS**: 처음10그룹 전체 통과 뒤 손계산 간단/여행1그룹을 추가해 그 그룹만 별도 실행. URLready/Strict·query/history,100/101,키별실패,계좌경합,load편집취소/두basis,save중편집,메모리공지,copy복구/초점/A-B-A,실제ShareResult6방향,ro/privacy/legacy/cleanup.
- 총 **30 자체그룹**이며 실제 브라우저/독립 결과를 여기에 더하지 않는다. 기존 `scripts/check-dutch-pay.ts` 계산/URL 회귀도 별도로 PASS.
- 제품/검사8파일 lint에서 제품 오류0, 검사 JS의 unused 선언1경고만 제거했다. 해당 JS 재검사도 **exit0·오류0·경고0**으로 최종 범위 경고0이다.

```powershell
node --experimental-strip-types scripts/check-dutch-pay-storage.ts
node --experimental-strip-types docs/verify/2026-11-17-repeat-batch36/check-dutch-pay-parent.mjs
node --experimental-strip-types scripts/check-dutch-pay.ts
```

부모 fixture는 실제 부모·utility·ShareResult를 실행하고 RAF/Clipboard/DOM/저장/locks만 제어한다. 복구 child는 props 포트로 관찰하며 준비2그룹의 별도 실제 렌더 근거와 구분했다. 초기 VM에 btoa/atob를 빠뜨려 발생한 오류는 host 포트만 보완했다. native Web Locks/실제 Clipboard/320px DOM focus/PNG는 native 담당의 별도 단계다. 합성 계좌 문자열을 로그/캡처에 남기지 않는다.

## Native/독립 선택자와 fixture

- `[data-dutch-root]`의 `data-dutch-ready`, `data-dutch-readonly`. 초기 ready=false, RAF 뒤true.
- `[data-dutch-title]`, `[data-dutch-person="index"]`, `[data-dutch-mode="s|t"]`, `[data-dutch-item-name="index"]`, `[data-dutch-item-amount="index"]`, `[data-dutch-add-item]`, `[data-dutch-add-person]`, `[data-dutch-reset]`.
- `[data-dutch-save]`, `[data-dutch-recent-status="saving|loading|saved|deleted|error"]`, `[data-dutch-recent-recheck]`, `[data-dutch-recent]`, `[data-dutch-load="encoded d"]`, `[data-dutch-delete="encoded d"]`. 현재 list 항목에만 load/delete가 있다.
- `[data-dutch-account]`, `[data-dutch-account-status="idle|dirty|saving|saved|error"]`, `[data-dutch-account-retry]`, `[data-dutch-account-recheck]`. 초안/오류일 때 retry/recheck 표시.
- `[data-dutch-notice]`, `[data-dutch-copy="notice|link|tr0|tr1|..."]`/`data-dutch-copied`, `[data-dutch-copy-recovery]`, `[data-dutch-copy-select]`, `[data-dutch-copy-retry]`, `[data-dutch-copy-close]`.
- `[data-dutch-share-boundary] [data-share-action="copy|share|save"]`, `[data-dutch-edit-readonly]`.
- lock 이름은 **`dutchPay.recent` / `dutchPay.account`** 그대로. 최근 pending UI는 다른 목록 작업을 막고 폼 편집은 가능; load 대기 중 폼 편집 시 취소된다. 최근 재조회·외부 storage event·unmount도 취소한다.
- 정상 legacy fixture는 기존 `encodeState(State)`와 `prepareDutchPayRecent(state,timestamp).entry`로 만든다. raw는 `[entry,...]` 최대10이며 계좌는 `JSON.stringify(syntheticString)`이다. URL100항목으로 방문한 뒤 `[data-dutch-add-item]` 한 번 클릭하면 실제 편집101항목을 만들어 저장거부를 검증할 수 있다. 기존 decoder는101항목 URL을100으로 자르므로101항목 URL만 주입하고 보존을 주장하지 않는다.
- 초점/선택 검증은 연결된 버튼으로 close/retry 성공 시 돌아오는지 확인한다. CSS는 변경한 입력16px·조작44px 및 명시 모바일1열을 사용한다.

독립 담당 gpa가 현재 검토 중이다. 통합 담당이 최종32leaf canonical 병합·생성1578 및 두 컴포넌트 정적130사용/오류0을 확인했으므로 native final ready를 통지했다. 전체 타입 완료 전 제품 전체 완료로 보고하지 않는다.
