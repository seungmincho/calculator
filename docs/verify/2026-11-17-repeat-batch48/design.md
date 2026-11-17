# 48차 읽기 설계 — CharacterCounter

이 문서는 구현 전 확정한 설계다. root baseline5건(정상1/문제4)과 추가 clear1건은 보존했으며, 08:43:20 체크포인트 뒤 승인된 구현 결과는 [implementation.md](./implementation.md)에 기록한다.

## 상태와 초기 복원

현 부모는 newTabs/active0으로 시작하고 effect의 queueMicrotask에서 저장본을 읽어 setTabs/setActive한다. 입력은 그 전에 활성화되어 있다. 이를 단순 `edited ? skip restore`로 바꾸면 저장된 나머지 문항까지 빈 기본값으로 남아 이후 자동 저장에서 잃을 수 있다.

제안은 동기 이벤트에서 원고 view와 revision을 함께 갱신하고, 로딩 동안 `touched[5]`의 필드 집합(title/text/target/basis)과 명시 활성 문항 의도를 기억하는 것이다. 실제 값이 바뀌지 않은 이벤트는 수정으로 세지 않는다.

```text
mergeInitial(saved, current, touched, activeIntent)
  each tab.field: touched이면 current, 아니면 saved
  active: 초기 사용자 입력/탭 선택 의도가 있으면 current.active, 아니면 saved.active
```

예: 저장본은 활성3/문항0본문OLD/문항1본문KEEP이고 초기 사용자가 문항0본문NEW만 입력했다면, 복원 후 문항0본문NEW·문항1본문KEEP·기타 저장 metadata를 보존하며 문항0이 보인다. 목표/기준/제목을 먼저 바꾼 경우 해당 필드만 우선한다. 여러 탭에서 초기 편집을 해도 같은 규칙이다.

정상 읽기 자체는 쓰지 않는다. 저장 baseline과 expected raw는 읽은 저장본 그대로 채택하고, 사용자 초기 편집 때문에 병합 결과가 다르면 기존 정상 자동 저장 경로에서만 쓴다. 없는 key는 기존 기본값을 읽은 것으로 처리한다. 손상/차단은 초기 편집을 그대로 두고 해당 key 자동 쓰기를 막는다. cleanup/Strict 재설정 이전 microtask는 새 수명에 적용하지 않는다.

로딩 중 변환/비우기/undo/전체 초기화/수정본 복원처럼 저장 기준이 필요한 명시 작업은 준비 상태와 handler에서 함께 가드하는 안을 우선한다. 텍스트·제목/목표/기준·탭 선택의 빠른 입력은 기록한다. 준비 직후 새 미입력 예시를 삽입하거나 입력을 정규화하지 않는다.

## 최소 편집/undo API 제안

신규 순수 모듈은 기존 WritingDraft를 재사용하며 React/DOM/저장소를 읽지 않는다.

- 문서 state: `{tabs, active, revisions[5], revision, undo|null}`. 전역 revision은 저장/전체 초기화 소유권, 탭 revision은 그 탭 undo 소유권이다.
- `patch(index, fields)`는 실제 변경만 적용한다. 동일 탭의 기존 undo를 무효화하고 copy/save owner의 세대를 즉시 갱신한다.
- `transform(index, fn)`은 기존 tidy/collapseSpaces/joinLines/stripSpecial/upper/lower 결과가 다를 때만 `{token,tab,afterRevision,previous:{text}}`를 만든다.
- 현재 문항 비우기는 확인 후 같은 undo 규칙을 사용한다. 이미 빈 글은 no-op이다.
- `restore(index, draft)`는 기존 수정본 확인을 거친 부모 콜백에서 호출한다. previous는 제목/본문/target/basis 전체이며 복원 후 undo로 모두 되돌린다.
- `undo(token)`은 살아 있는 token 동일성·현재 active===tab·해당 탭 revision===afterRevision을 모두 검사한다. 실패는 no-op, 성공은 새 mutation이며 이전 undo를 끝낸다.
- 탭을 잠깐 이동했다 돌아오기만 하고 원래 탭을 편집하지 않았으면 기존 한 단계 undo를 유지할 수 있다. 다른 탭에서 편집/변환해 새 undo가 만들어지면 단일 기록 규칙대로 교체한다. 같은 탭의 글을 A→B→A로 편집해도 revision이 달라 옛 handler는 무효다.

부모 이벤트의 source는 최신 session/ref snapshot으로 통일한다. React 렌더가 아직 진행되기 전 두 이벤트가 연속 발생해도 이전 closure의 active/tab을 새 문항에 적용하지 않게 한다. setTabs/setActive를 여러 이벤트에서 우회 호출하지 않는다. 복사/되돌리기/초기 복원은 같은 문서 revision과 연결한다.

## 복사·맞춤법 owner

기존 `copyText`는 boolean을 반환하지 않고 execCommand false도 성공으로 처리한다. 신규 actions는 기존 `copyShareResultLink`의 검증된 native/fallback 구현을 재사용하되 CharacterCounter 소유의 작은 요청 controller를 둔다.

`request({kind:'copy'|'speller',text,tab,revision})`는 불변 클릭 snapshot과 새 token을 생성한다. 정상 native 또는 actual fallback true만 copied, 실패는 full text와 문항 label을 복구 UI에 전달한다. 현재 token과 문서/탭/locale context가 살아 있을 때만 fallback·상태·2초 성공 timer를 적용한다. 재시도는 같은 captured text를 새 token으로 시작하고 옛 close/timeout은 새 요청을 지우지 않는다.

일반 복사와 외부 맞춤법의 복사 준비는 같은 owner다. 새 작업/텍스트·제목·목표·기준 변경/탭 이동/transform/restore/undo/전체 초기화/locale/unmount가 이전 요청을 취소한다. 단순 highlight 단어/mark 입력은 복사 대상 원고를 바꾸지 않으므로 원고 revision을 올리지 않는다. textarea는 성공/실패 때문에 지우거나 변경하지 않는다.

복구 자식은 읽기 전용 전체 text, 전체 선택, 다시 복사, 닫기와 선택 실패 안내를 제공한다. 버튼44px/입력16px·토큰·KO/EN을 함께 작성한다. 시스템 Clipboard Promise는 취소할 수 없으므로 이미 OS가 수행한 쓰기를 되돌린다고 주장하지 않고, 앱의 추가 fallback/오래된 안내만 차단한다.

현재 `openSpeller`는 Clipboard await 뒤 `window.open`을 호출하므로 브라우저 사용자 gesture가 끝나 팝업이 차단될 수 있는 순서다(읽기 확인, native 재현으로 집계하지 않음). 최소안은 클릭에서 copy request를 시작하고 **await 전에** 고정 SPELLER_URL을 `noopener,noreferrer`로 동기 열기 요청하는 것이다. 원문을 외부 URL/POST에 넣지 않으며 사용자가 사이트에서 직접 붙여넣는다. 텍스트가 없어도 기존처럼 사이트 열기는 가능하다.

`noopener,noreferrer`의 반환값 null은 성공 시에도 생길 수 있으므로 이를 곧바로 팝업 차단으로 단정하지 않는다. 안내는 '외부 맞춤법 사이트 열기 요청'과 현재 copy 성공/복구를 구분한다. 외부 새 탭 때문에 문서가 hidden이 된 것만으로 이 copy snapshot을 자동 폐기하지 않고, 원고/탭/수명 변화로 소유권을 검사하는 정책을 제안한다. 실제 브라우저 gesture/Clipboard 조합은 native 담당이 확인한다.

## autosave·전체 초기화의 좁은 보완 검토

현재 autosave effect cleanup은 아직 실행되지 않은 microtask만 취소한다. 이미 `saveDraft`가 Web Lock을 기다리는 동안에는 callback에 mounted/revision 가드가 없다. 이는 아직 읽기 위험이다. 전체 초기화 확인 뒤 기다린 callback이 이후 편집된 메모리를 비우는 경계는 root의 추가 JS probe 승인 뒤 실제 재현했다.

별도 `check-character-clear-baseline.mjs --record`에서 초기 읽기0write → clear 확인으로 lock1대기 → 새 원고 입력 → 옛 clear 실행을 확인했다. 표시 중인 새 원고가 빈 문자열이 되고 key remove1회가 발생했다. 아직 새 autosave 대기 callback은 실행하지 않았으므로 화면의 최신 입력 소실과 초기화 side effect만 확정한다. 원래 root `before-fix.json`을 바꾸지 않고 `clear-before-fix.json`에 분리 보존했다. parent guard의 좁은 범위에 이 경계를 포함하도록 root가 승인했다.

제어 잠금 probe 및 구현 검증 항목:

1. 저장A가 대기 중 새 원고B/탭 변경/unmount가 발생하면 A callback은 쓰기·안내0인가.
2. 전체 초기화 확인 뒤 잠금 대기 중 새 입력/문항 변경이 있으면 이전 확인이 새 내용을 삭제하지 않는가. 새 입력 삭제 경계는 baseline 추가 재현 완료이며 수정 후 반대 기대값으로 확인한다.
3. 이전 callback completion이 새 save/clear의 busy/status를 바꾸지 않는가.

필요하면 부모의 생존 session token+전역 문서 revision으로 잠금 안과 continuation을 둘 다 가드한다. save의 raw/baseline 갱신은 write/readback 확인 직후 잠금 안에서 수행하여 새 정상 쓰기의 기준이 늦지 않게 한다. 취소한 옛 autosave는 최신 요청의 basis를 바꾸지 않는다. 전체 초기화는 확인 당시 revision/expectedRaw가 같을 때만 remove/readback 후5기본탭을 적용한다. 대기 중 편집으로 취소된 경우 새 입력은 남기고 취소 상태를 간단히 안내한다.

기존 `withWritingStorageLock`의 API를 모든 caller에 확대하거나 versions/backup writer를 함께 리팩터링하지 않는다. 이 parent 안의 같은 mutation 경계에 필요한 guard로 한정한다. Web Locks 미지원에서도 기존 raw CAS/readback을 유지하며 전환경 원자성을 보장하지 않는다. 손상 raw 교체 권한은 기존 명시 전체 초기화 확인에만 있다.

## 기존 기능 접점과 검증 표

| 접점 | 유지·추가 확인 |
|---|---|
|5개 tab/button·제목/본문·target/basis/preset | 기존 parseWritingDraft와 분석 함수 유지, 초기 touched merge·탭 copy ABA·각탭 원문 보존 |
| transform·현재 clear·undo | 원문만 작업 snapshot, 현재 clear confirm 취소0, no-op undo 생성0, 후속 입력/old handler0 |
| WritingVersionsPanel current/activeTab/onRestore | current는 최신 실제 탭 객체, restore의 기존 명시 확인/CAS 유지, 부모 callback에 최신 tab/ready 가드와 전체필드 undo |
| version save/delete/compare20개 | 기존 key/schema/한도/UI 동작 유지, parent 입력 수정이 목록/이름을 초기화하지 않음 |
| WritingVersionsBackup11 | 기존 선택 추가/ID 충돌/손상·미래/용량·lock 범위 유지, parent undo와 현재5탭 불변 |
| writingDiffHandoff25 | 저장본 좌측/현재 우측 원문과문항 번호, 고정 session key/명시 새창·TTL/50k한도 유지, copy와 원고 변경이 payload를 조용히 바꾸지 않음 |
| marks/topWords/search highlighting | 통계/분석 함수 그대로, 원고 변경 아닌 mark 변화가 undo를 불필요하게 지우지 않음 |
| 전체 clear | 명시 확인·자동초안 key만 제거·수정본20개 key 불변·실패 입력보존·대기 편집 가드 |

실행검사는 root baseline을 변경하지 않는 새 fixed-regression 파일에 작성한다. baseline4실패가 해결되는 기대값과 정상 native1을 먼저 확인하고, 초기 다른 문항/필드 보존·undo restore 전체필드·copy retry/manual·autosave/clear 대기 경계를 추가한다. 기존 charCount/versions/backup/diff 전체 검사는 실제 변경 영향이 있을 때만 필요한 범위로 수행한다. 최종 selector는 `data-character-*`를 제안하며 현재 제품에 존재한다고 문서화하지 않는다.
