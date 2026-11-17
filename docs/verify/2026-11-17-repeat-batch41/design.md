# 41차 메모장 원고 보호 — 구현 전 설계

상태: 읽기 조사와 합성 데이터의 기존 codec 왕복 측정만 완료했다. 41차 제품·검사 TS는 작성하지 않았고, 36차 제품 TS는 final-ready 상태로 고정했다. 36차 독립 11그룹과 native 8흐름은 추가 제품 결함 없이 통과했다. 이 문서는 41차 구현 결과가 아니다.

## 확인한 기존 경로와 범위

- `src/components/Notepad.tsx`: `persist`가 현재 배열을 조건 없이 쓰고, 초기 손상 backup 쓰기 실패를 무시한 뒤 빈 메모를 연다. 400ms debounce와 pagehide/visibility flush, 외부 storage 즉시 적용, 파일 읽기 전 snapshot 복원, 전체 배열 toast undo가 원고 손실의 접점이다.
- `src/utils/notepad.ts`: 기존 key는 `toolhub-notepad-notes`와 `toolhub-notepad-settings`. 저장은 `Note[]`, 백업은 `{app:'toolhub-notepad',version:1,exportedAt,notes}`다. `parseNotes`는 누락 필드 보정·잘못된 항목 제거·중복 ID 재발급을 하므로 안전한 저장본 검증과 다르다. `mergeNotes`의 timestamp 최신 우선은 가져오기에서만 사용되며 이 작업에서는 부모가 안전한 새 병합을 사용한다. 기존 함수와 기존 회귀 oracle를 바꿔 성공 판정을 약화하지 않는다.
- `scripts/check-notepad.ts`의 v1, 백업, 정렬/검색, 찾기·바꾸기, settings, 글자 수 회귀를 보존한다. 앞선 읽어주기 선택 범위 전달과 locale 보존도 연결 회귀다.
- `check-notepad-baseline.mjs`와 `before-fix.json`의 실제 storage/import 핸들러 3재현을 읽었다. 기존 SHA와 before-fix는 덮어쓰지 않고 이후 별도 fixed fixture를 만든다.
- 실제 부모에는 **모두 삭제 버튼이 없다**. 삭제·모두 바꾸기·가져오기 3종 toast undo가 있다. 모두 삭제 기능을 추가하지 않는다. `Ctrl/Cmd+S`는 현재 메모 TXT 다운로드라는 기존 의미를 유지한다.

## 핵심 상태와 저장 API

새 독립 파일의 제안 API이며 아직 제품에 존재하지 않는다.

| 파일 | 역할/API |
| --- | --- |
| `src/utils/notepadPersistence.ts` | `inspectStoredNotes(raw)`, `readNotepad(storage)`, `commitNotepad(expectedRaw, notes, ports)`. `ok/raw/notes`와 `unavailable/corrupt/unsupported/quota/conflict/unconfirmed/cancelled`를 구분한다. |
| `src/utils/notepadDraft.ts` | 현재 원고·확인 basis·revision·외부 candidate를 관리하는 작은 controller. `initialize/edit/requestSave/retry/recheckExternal/applyMergedExternal/activate/dispose`와 immutable snapshot을 제공한다. |
| `src/utils/notepadImport.ts` | 파일별 파싱 결과, 충돌을 보존하는 `mergeImportedNotes`, 작업 세대와 취소 포트. 파일 읽기와 ID 공급자를 주입한다. |
| `src/components/NotepadRecovery.tsx` | 저장 상태·명시 재시도·외부 변경 확인/함께 보관·원문/TXT/백업 다운로드를 표시한다. 기술적인 key·CAS 용어를 제품 문구에 노출하지 않는다. |
| `src/components/Notepad.tsx` | 기존 조작을 controller의 한 mutation 통로에 연결하고 editor/selection/undo/import/focus 세대를 동기화한다. |
| `scripts/check-notepad-persistence.ts`, `scripts/check-notepad-import.ts`, docs41 실제 부모 JS | 저장 포트와 병합 순수 검사, 실제 이벤트/Strict replay/파일·undo 검사를 분리한다. |
| `docs/verify/2026-11-17-repeat-batch41/translations-notepad.json` | 같은 담당자가 새 `notepad.persistence/importRecovery` KO/EN 조각을 작성한다. canonical과 가이드/메타는 통합 담당이 갱신한다. |

상태는 `draftNotes + activeId`, `draftRevision`, `confirmedRaw + confirmedNotes`, `lastAttempt`, `externalCandidate`, `status`로 나눈다. React state만으로 늦은 callback을 판정하지 않고 이벤트 시점에 ref/controller를 먼저 갱신한다. dirty는 마지막 확인 저장본과 현재 의미값이 다른지로 판정하며, 저장 성공은 요청한 revision에만 귀속한다. 저장 중 더 입력했으면 이전 snapshot 저장 성공 뒤에도 최신 원고는 dirty다.

초기 `getItem` 실패를 `null`과 구분한다. 실제 key 부재/빈 배열일 때만 빈 메모를 화면에 준비하고 초기 읽기 자체로는 쓰지 않는다. Strict effect setup→cleanup→setup에서도 재초기화가 편집을 되돌리지 않게 `initialized`와 활성 세대를 분리한다. 초기 읽기 전에는 본문 변경/가져오기/쓰기 액션을 막고 읽기 완료 뒤에도 storage가 차단된 경우 메모리 편집·반출은 허용한다.

### 저장본 검증과 원본 보존

정상 v1 배열의 각 항목은 고유한 비어 있지 않은 string ID, string title/content, finite number createdAt/updatedAt, optional boolean pinned를 가져야 한다. 제목/본문의 빈 문자열, 같은 제목, 개행/제어문자, lone surrogate, `pinned:false`, 음수·소수·큰 finite timestamp를 불필요하게 제한하지 않는다. 기존 import가 finite timestamp를 그대로 저장할 수 있었으므로 날짜 범위를 새로 좁히지 않는다.

누락/잘못된 필드·중복 ID·낯선 저장 구조·unknown 필드는 보정 후 자동 덮기 대상으로 삼지 않는다. 해당 key raw와 화면 원고를 유지하며 쓰기를 차단한다. 원본 raw 다운로드는 별도로 제공하고, 실패한 `*-corrupt-*` 추가 쓰기를 보존 성공으로 취급하지 않는다. 처음부터 자동 임시 backup key를 만들 필요가 없다. 현재 메모 JSON 백업과 손상 raw 파일은 별개이며 브라우저 다운로드 시작을 디스크 보존 완료로 표현하지 않는다.

일반 파일 가져오기는 저장 검증과 분리한다. 정상 v1 backup과 raw Note[]는 정확히 받는다. 기존 permissive 복구가 필요한 배열은 누락/제외/ID 재발급 수를 보여 주고 명시 적용할 수 있으나, 미래 version 또는 다른 app wrapper를 v1로 몰래 낮추지 않는다. 첫 구현에서 이 복구 preview가 과하면 정상 v1과 raw 배열만 자동 적용하고 원문 손상 복구 UI를 후속으로 분리할 수 있다. 어떤 경우에도 원래 파일/저장 raw는 덮지 않는다.

### 자동 저장·실패·경합

1. mutation마다 revision을 올리고 이전 debounce/대기 작업을 취소한다. 400ms 뒤 최신 snapshot 1개를 요청한다. 같은 key 이름으로 Web Lock을 획득한 후 활성/요청/revision을 재확인한다.
2. 잠금 callback 안에서 현재 raw를 다시 읽어 `expectedRaw`와 비교한다. 일치하면 직렬화한 값 하나만 `setItem`하고 즉시 `getItem`으로 확인한다. 이 구간에는 추가 await를 넣지 않는다.
3. 성공한 own raw/basis는 lock callback 안에서 즉시 갱신한다. callback 반환과 UI await continuation 사이의 다음 편집이 오래된 basis로 저장하지 않게 한다. 수정이 더 있었으면 최신 원고를 계속 dirty로 두고 그 revision만 다시 예약한다.
4. quota/읽기 차단/충돌/확인 불명에 자동 retry loop를 만들지 않는다. 현재 원고와 확인된 basis를 유지하고 수동 재시도·다시 확인을 제공한다. 실패를 모두 용량 부족으로 안내하지 않는다.
5. `setItem` 이후 readback 실패/불일치는 `unconfirmed`다. 성공·미저장을 단정하거나 이전 raw로 rollback하지 않는다. 재조회 값이 마지막 시도 snapshot과 일치하면 그 snapshot의 저장만 확인하고 더 최신 원고는 보존한다. 외부 값이면 아래 충돌 흐름으로 넘긴다.
6. Web Locks 미지원에서는 같은 동기 read/CAS/write/readback을 사용하되 탭 간 원자성을 보장한다고 쓰지 않는다. 모든 경합에서 현재 메모리와 복구용 raw/snapshot을 보존한다.

settings는 기존 별도 key와 포맷을 유지하고 초기 0write, 실제 설정 편집 때만 저장한다. settings 실패/충돌은 본문 저장 상태를 바꾸지 않는다. 다른 탭의 settings를 현재 사용자의 설정 변경 위에 자동 적용하지 않으며, settings용 작은 basis/재시도는 notes controller와 분리한다.

## 외부 변경 확인과 재개

`storage`의 해당 key 또는 `key=null`을 처리한다. event.newValue를 신뢰해서 즉시 화면에 적용하지 않고 현재 key를 재조회한다. own confirmed raw와 같으면 no-op다. 다르면 debounce·대기 저장·진행 중 가져오기·undo 세대를 무효화하고 **깨끗한 원고라도 자동 교체하지 않는다**. 현재 선택·본문과 원본은 그대로 둔다.

최소 UI는 `현재 메모 백업`, `저장본 다시 확인`, 검증된 candidate의 `현재 메모와 함께 보관`이다. 확인 화면에는 현재/외부 메모 수와 같은 ID 중 내용이 다른 수, 삭제/비어 있음 여부를 보여 준다. 제목 목록을 접어서 볼 수 있게 하고 본문을 URL/로그로 보내지 않는다.

`함께 보관`은 최신 draft + 표시한 candidate를 충돌 보존 병합한 뒤 적용한다. 같은 ID·전체 내용이 같으면 중복을 제외하고, 같은 ID·내용이 다르면 새 ID로 둘 다 남긴다. 외부에 없는 현재 메모를 삭제하지 않는다. 외부 key 삭제/clear일 때는 외부 0개임을 먼저 표시하고 사용자가 이 버튼을 누른 경우에만 현재 메모를 다시 저장할 수 있다. 이 명시 동작 전에는 삭제를 자동으로 되살리지 않는다.

적용 버튼의 draftRevision/candidate raw를 캡처하고 lock 획득 후 둘 다 재확인한다. 다른 편집/외부 변경이 생겼으면 적용하지 않고 preview를 다시 확인하게 한다. 검증된 candidate raw를 basis로 채택한 뒤 merged draft를 한 번 commit한다. commit 실패에도 merged/current notes를 메모리에 보존한다. 손상/미지원 raw에는 함께 보관을 제공하지 않고 원본 다운로드와 재조회만 제공하므로, “다시 확인”만 눌러 쓰기 차단이 풀려 외부 원고를 덮는 경로가 없다.

최소 범위에는 `외부 저장본으로 현재 원고 전체 교체`와 `손상 key 강제 초기화`를 넣지 않는다. 이 두 파괴적 선택 없이도 정상 외부 변경을 보존하며 편집을 재개할 수 있다. 필요성이 확인되면 별도 확인 흐름을 계약에 추가한다.

## pagehide와 임시 이탈

`visibilitychange:hidden`에서는 이미 dirty인 revision에 일반 저장 요청을 앞당길 수 있다. 페이지가 살아 있는 동안만 동일 lock/CAS 규칙을 따른다. 이어서 `pagehide`가 발생하면 남은 debounce와 아직 획득하지 않은 lock 요청을 취소하고 활성 세대를 종료한다. **pagehide 안에서 새 비동기 잠금을 시작하거나 잠금을 건너뛴 동기 덮어쓰기를 하지 않는다.**

저장 callback은 lock 획득 후 동기 write/readback이므로 이미 실행 중이면 그 원자적 JS 구간의 결과를 처리할 수 있다. 아직 대기 중인 마지막 400ms 원고가 창 종료 시 저장되지 않을 가능성은 남는다. 저장 상태를 실제 확인대로 표시하고 중요한 내용은 백업할 수 있게 한다. 첫 범위에서 새 beforeunload 확인 팝업을 상시 추가하지 않는다.

BFCache `pageshow`에서는 현재 메모리를 유지한 채 basis를 재확인한다. raw가 그대로면 dirty 저장을 재개하고, 달라졌으면 외부 변경 화면으로 전환한다. 과거 timer/lock callback은 새 세대에서 무효다. React unmount도 같은 소유권 cleanup을 쓰되 실제 initial bootstrap를 재실행해 편집을 지우지 않는다.

## 파일 가져오기와 undo

- 클릭 시 `Array.from(files)`와 작업 token을 캡처한다. 파일 입력값은 즉시 비워 같은 파일을 다시 선택할 수 있게 한다. 파일은 하나씩 읽고 매 await 전후 token을 확인한다. `File.text()` 자체는 취소할 수 없어도 rejection을 회수하고, 취소 뒤 다음 파일 읽기는 시작하지 않는다.
- 읽기 중 본문/제목 편집·pin·새 메모·삭제·바꾸기·외부 변경·새 가져오기·unmount가 발생하면 이전 작업의 자동 적용을 취소한다. 파일 읽기 완료가 오래된 snapshot을 다시 쓰지 않는다. 단순 검색/선택/보기 설정/locale 변경은 원고 mutation이 아니므로 취소할 이유가 없다. 적용 시 선택한 메모를 갑자기 바꾸지 않고 기존 activeId가 있으면 유지한다.
- 각 파일의 throw/JSON 오류를 개별 집계하며 성공한 결과는 마지막에 한 번 적용한다. 전체 실패/취소는 notes를 바꾸지 않는다. 다른 확장자의 일반 텍스트를 기존처럼 읽는 정책과 TXT 개행 정규화는 유지한다. 결과 안내는 키+수치로 저장해 locale 변경 시 다시 번역한다.
- 적용 직전 최신 현재 원고와 병합한다. 같은 ID의 다른 원고는 timestamp와 관계없이 새 ID로 추가하며 기존 제목/본문/생성·수정 시각/pinned를 보존한다. 제목에 임의 접미사를 붙여 원문을 바꾸지 않는다. 새 ID는 현재 목록과 이번 배치의 ID 집합에 대해 충돌을 검사한다. ID만 달라진 동일 import를 반복할 때는 ID를 제외한 모든 필드가 같은 사본이 이미 있는지 확인해 불필요한 증식을 줄인다. 같은 내용의 서로 다른 정상 ID 메모를 무조건 합치지 않는다.
- 가져오기·삭제·모두 바꾸기 undo는 `beforeNotes/beforeActiveId/afterRevision/token`을 저장한다. 현재 revision이 정확히 afterRevision이고 token이 살아 있을 때만 복원한다. 이후 어떤 원고 mutation이든 undo를 제거한다. 선택/검색/locale 변경만으로는 없애지 않는다. 오래된 핸들러도 같은 조건을 검사한다.
- toast 6초 만료, 새 메모/찾기 입력의 0ms focus, 파일 input cleanup은 자기 token과 timer ID 소유권을 함께 확인한다. 늦은 만료가 새 toast를 지우거나 이전 focus가 현재 편집을 가로채지 않는다. Ctrl+Z의 브라우저 편집 이력과 별개이며 새 전역 단축키를 추가하지 않는다.

## 기존 규모와 상한 결정

실제 `Notepad.tsx`와 `notepad.ts`에는 title/content/id 길이, 메모 개수, 파일 개수/bytes 상한이 없다. 40자는 목록 표시, 60자는 다운로드 파일명 제한일 뿐 저장 제한이 아니다. 따라서 코드만으로 “최대 유효 legacy 크기”라는 유한한 수를 얻을 수 없다. 브라우저별 실제 quota/남은 공간을 조회하지 않았으며 이를 특정 MB로 보장하지 않는다.

읽기 조사에서 기존 `parseNotes`/`backupJson`을 메모리의 합성 데이터에만 실행했다. 실제 localStorage/사용자 메모와 파일은 읽지 않았다. 아래는 codec 정확 왕복이며 DOM 응답성 또는 브라우저 저장 성공 측정이 아니다.

| 합성 legacy | 저장 JSON UTF-8 bytes | 기존 pretty 백업 bytes | 기존 parser 정확 왕복 |
| --- | ---: | ---: | --- |
| ASCII 본문 4MiB, 메모 1개 | 4,194,376 | 4,194,532 | PASS |
| NUL 본문 1MiB, 메모 1개 | 6,291,528 | 6,291,684 | PASS |
| 빈 메모 50,000개, 고유 ID | 3,838,891 | 6,338,997 | PASS |

JSON escape는 한 UTF-16 code unit을 6 ASCII bytes로 늘릴 수 있고, pretty 백업은 메모 수에 따른 공백 비용이 붙는다. “저장본보다 큰 자체 백업”을 고정 5MiB 입력 제한으로 거부하면 왕복 보존이 깨진다. 이번 최소안에서는 기존 저장본/정상 자체 백업에 새로운 notes/문자/bytes hard cap을 넣지 않는다. 파일 읽기 동시 수 1과 작업 세대 취소를 적용한다. 큰 데이터가 실제 입력/파싱/통계를 막는지 후속 실측한 뒤 worker·청크 검증 범위를 별도로 정하며, 이 문서의 메모리 왕복을 모바일 성능 증거로 쓰지 않는다.

## 연결 순서와 검증 경계

1. 다음 승인 후 신규 순수 storage/import/controller + 포트 검사와 KO/EN child를 먼저 완성한다. 부모 미연결 상태에서 strict legacy, own basis, 두 writer, quota/차단/readback unknown, lock 대기 취소, per-file 오류/ID 충돌/undo 전이를 검증한다.
2. 기존 부모 연결은 한 완결 patch로 진행한다. notes를 바꾸는 모든 이벤트를 mutation API로 통일하고 저장/파일/외부/undo 세대를 연결한다. 기존 URL·서버 저장을 추가하지 않는다.
3. 실제 부모 fixture는 root baseline 3개를 fixed 기대값으로 별도 검증하고, Strict replay/IME 중 저장 예약/외부 clear/페이지 숨김·BFCache/언마운트/파일 역순·실패·재선택/undo 후속 편집/locale/읽어주기 선택 범위를 확인한다. URL·로그·증거에는 합성 원고만 사용한다.
4. 독립 검토와 native Chrome은 지정 담당에게 맡긴다. 실제 두 탭 Web Locks, File/Blob, keyboard/Tab/Enter/Space와 유효 focus, 320px KO/EN을 확인한다. 새 버튼과 기존 접점은 44px, 검색/찾기 입력은 16px로 맞추되 사용자가 고르는 본문 14px 보기 설정을 삭제하지 않는다.
5. 기존 notepad/글자 수/읽어주기 회귀, 범위 lint를 마친 후 TS freeze를 통지한다. 기존 알려진 Notepad lint 오류는 소유 파일 범위에서 진단을 확인하고 최소 수정한다. 전체 타입은 통합 담당, Chrome은 verify 담당만 실행한다.

통합 가이드에는 “다른 탭 자동 동기화”, “같은 메모 최신 날짜 우선”, “실패는 항상 용량 부족”, “서버로 보내지 않아 다른 누구도 볼 수 없음” 같은 현재 단정을 실제 보존/로컬 저장 경계에 맞춰 정리하도록 요청한다. 기존 로그인 없는 진입과 사용 흐름에 계정·새 동의를 추가하지 않는다.
