# 41차 Notepad 부모 연결 치환표

상태: 부모 연결·자체 실제 이벤트 10그룹 PASS 및 scoped lint 0/0. 아래 치환표와 selector는 실제 연결에 반영했으며 상세 결과/범위는 `implementation.md`에 기록했다. 독립/native/전체 타입은 별도 담당 검증을 기다리며 제품 TS를 동결한다.

## 원고·저장 경로

| 기존 접점 | 연결할 API와 보존 조건 |
| --- | --- |
| `notes/activeId/loaded/saveState`, render의 `notesRef.current` | `createNotepadDraft` 1개 + `view`를 표시 출처로 사용. 이벤트는 `controller.snapshot()`으로 최신 원고를 읽는다. 표시용 React render가 다음 이벤트의 기준을 늦추지 않게 한다. |
| 초기 `parseNotes`·손상 임시 backup·`setNotes(sorted)` | effect에서 `activate()`→`initialize(blankNote())`. 정상 배열/없는 key만 초기 메모리 원고를 준비하고 처음에는 0write. 손상/read 차단은 raw를 유지한 채 복구 UI 표시. 화면 목록의 `sortNotes`는 계속 파생값이며 저장 배열을 자동 정렬해 재저장하지 않는다. 초기 선택은 기존처럼 정렬 첫 메모로 `select()` 가능. |
| `persist`, `saveTimer`, `skipSave`, `[notes]` 400ms effect | 부모의 직접 저장/타이머 제거. 모든 실제 원고 mutation은 `edit` 또는 `editUndoable`; controller가 400ms·CAS·lock·readback과 dirty 상태를 소유한다. 초기/locale 변화가 저장 effect를 새로 일으키지 않는다. |
| `visibilitychange:hidden` 즉시 persist | `controller.hide()`. 살아 있는 동안 정상 lock 저장을 앞당길 수 있으나 저장 성공을 선표시하지 않는다. |
| `pagehide` 무조건 flush | importer 취소 + `controller.pagehide()`, 부모 toast/focus 작업 무효화. 새 async lock이나 무잠금 write를 시작하지 않는다. |
| 새 `pageshow` | `controller.pageshow()`로 메모리 유지·basis 재조회. 외부 변경이면 명시 확인, 변화 없고 dirty일 때만 저장 재개. |
| `storage`→`setNotes(list)` | notes key 또는 `key=null`에서 `externalChange()`. 현재 원고/선택을 자동 교체하지 않는다. scope가 바뀌면 import/undo를 취소한다. settings event는 별도 key 처리. |
| Recovery 재시도/재확인/함께 보관 | `retry`, `recheckExternal`, `applyMergedExternal(scope, raw)` 전달. child가 표시한 preview raw와 scope를 그대로 검증한다. 손상 raw 강제 초기화 기능은 추가하지 않는다. |
| settings 초기 parse·`[settings]` 무조건 write | `readNotepadSettings` 최초 읽기 0write. 실제 편집에서만 별도 expectedRaw/current generation/AbortSignal로 `commitNotepadSettings`; own basis는 onConfirmed 안에서 갱신. 설정 실패는 본문 상태와 분리. |

## 모든 메모 변경 이벤트

| 기존 handler | 치환과 주의점 |
| --- | --- |
| `updateActive` → `setNotes(prev.map...)` | snapshot의 현재 active ID로 patch·updatedAt 갱신 후 `edit(next, activeId)`. 제목/본문 바뀜은 읽어주기 선택을 무효화한다. IME는 기존 onChange 원문을 그대로 전달하며 조합 중 문자를 정규화하지 않는다. |
| `createNote` → prepend + setActiveId | 충돌 없는 ID를 만든 후 `edit([new,...current],new.id)`. query/list UI 변경은 유지. focus는 아래 소유권 검사 뒤 새 textarea에만 적용. |
| `deleteNote` → filter + 전체 snapshot toast | `editUndoable(rest, 기존 선택 또는 정렬 첫 ID)`. toast에는 notes 배열 대신 controller의 `undoToken`만 저장. |
| `togglePin` | 최신 배열의 해당 pinned만 변경해 `edit`. 기존처럼 updatedAt은 pin만으로 바꾸지 않는다. 본문은 같으므로 읽어주기 선택을 불필요하게 지우지 않아도 된다. |
| 목록 선택 → setActiveId | `select(id)` + 기존 clearReadingSelection/list 닫기. 검색/선택/보기 설정은 원고 revision을 올리지 않는다. |
| `undo` → toast snapshot 전체 복원 | 현재 살아 있는 token으로 `controller.undo(token)`. 성공 때만 toast/읽어주기 선택 정리. 후속 입력/import/외부 변경 이후 옛 handler는 복원할 수 없다. |
| `replaceAllNow` → updateActive + snapshot toast | 순수 replaceAll 결과가 실제 바뀔 때 한 번의 `editUndoable`. 새 `updatedAt`, 기존 active ID·literal 치환 의미 유지. |
| `replaceOne`, editor Tab → insertText fallback | 기존 browser 편집 명령 유지. native input 이벤트 또는 실패 fallback이 `updateActive`로 흐르도록 하고 같은 변경을 두 번 적용하지 않는다. |

준비 API의 inspectNotepadList는 원문 누락/정규화로 통과시키지 않는다. 부모에서 렌더용 slice/trim/표시 제목을 저장 본문에 섞지 않는다. 컨트롤은 loaded 전 disabled/handler guard로 일치시키며, 준비가 끝난 뒤 storage 실패 상태에서도 메모리 편집과 반출은 사용 가능하다.

## 파일·안내·초점·반출

- 기존 `importFiles`의 시작 snapshot/`cur` 누적 복원을 제거한다. 선택 시 `Array.from(files)`·현재 scope를 캡처하고 input.value를 즉시 빈 문자열로 만든다. importer.read의 current 함수는 활성 수명과 scope를 검사한다. 새 선택/실제 원고 변경/외부 변경/이탈에서 cancel한다. 완료 후 최신 snapshot과 `mergeImportedNotes`→한 번의 `editUndoable`을 수행한다. 현재 active ID가 있으면 유지한다. 개별 파일 오류는 원문을 포함하지 않는 파일명+error code로 표시한다.
- 사본 ID는 **현재+전체 incoming+이미 생성 ID**를 피해 배정한다. 뒤에 오는 정상 ID가 앞 사본에게 선점되지 않는다. 같은 제목의 별개 원고를 합치지 않는다.
- toast는 번역된 msg 문자열 대신 key/수치/name/token을 보관해 locale만 바뀌어도 원고/undo가 바뀌지 않게 한다. 6초 timer는 자기 toast ID+timer 소유권을 검사하고 controller.clearUndo(token)을 호출한다. 새 toast/후속 mutation 이후 이전 만료 callback은 현재 안내를 지우지 않는다.
- `createNote`의 textarea focus와 `openFind`의 find input focus는 0ms 자기 요청 ID+mounted+현재 activeId/findOpen을 검사한다. note 선택은 원고 revision을 바꾸지 않으므로 별도 focus 세대도 갱신해야 한다. close/이탈 때 예약을 정리한다. `findNext`의 동기 선택은 현재 textarea 내용과 active note가 같은 경우에만 수행한다.
- TXT/JSON/raw 백업은 클릭 때 최신 snapshot을 캡처한다. Blob URL Map과 자기 1초 timer를 소유하고 unmount 때 남은 URL을 해제한다. 오류는 번역 안내로 표시하며 다운로드 시작을 디스크 보존 성공으로 단정하지 않는다. `Ctrl/Cmd+S`는 기존처럼 TXT 다운로드이고 새 저장 단축키로 바꾸지 않는다.

## 읽어주기·locale·기존 UX

`captureReadingSelection`은 현재 controller active note와 textarea.value가 같은 경우에만 capture하고, onSelect/onBlur와 읽어주기 버튼 onPointerDown의 호출 순서를 유지한다. `sendToReader`는 최신 snapshot과 `selectedHandoffText`를 다시 검증한 뒤 기존 `openTextHandoff`만 호출한다. 새 서버/URL/저장 경로는 만들지 않는다. 전체 전달/선택 전달/초과·빈값·popup 실패 key를 유지한다.

실제 내용 변경/선택 이동/undo 적용은 읽어주기 선택을 해제한다. 저장 상태 알림이나 외부 candidate 표시만으로 현재 원고가 바뀌지 않았으면 선택 원문을 유지할 수 있다. locale 전환은 notes/settings/import/undo를 초기화하거나 storage에 다시 쓰는 의존성이 아니다. 검색·고정·전체화면·Esc 후 Tab 탈출·기존 14/16/18/20/24px 보기 설정을 보존한다. 새/기존 접점의 버튼44px와 검색/찾기 입력16px를 맞춘다.

## 연결 후 안정 selector와 필수 실제 부모 회귀

| selector 계획 | 확인할 흐름 |
| --- | --- |
| `data-notepad-root`, `data-notepad-ready` | 초기 0write·Strict replay·ready 전 조작 보호 |
| `data-notepad-title`, `data-notepad-content`, `data-notepad-select=<id>` | 최신 원고·IME·검색/선택·locale 보존 |
| `data-notepad-new`, `data-notepad-delete=<id>`, `data-notepad-pin=<id>` | mutation/undo·현재 선택·새 메모 focus |
| `data-notepad-file`, `data-notepad-import-cancel`, `data-notepad-import-status` | 늦은 파일·새 선택·개별 실패·같은 파일 재선택·cancel |
| `data-notepad-save-status`, `data-notepad-save-retry`, `data-notepad-save-recheck` | quota/read 차단/unknown·다중 탭 CAS·실제 저장 성공 |
| `data-notepad-external`, `data-notepad-keep-both` | dirty/clean 외부 변경·삭제·clear·preview 뒤 편집/타 탭 변경 |
| `data-notepad-backup-current`, `data-notepad-backup-raw`, `data-notepad-export-txt` | 원문과 현재 백업 구분·실제 Blob·URL 회수 |
| `data-notepad-undo`, `data-notepad-toast-close` | 후속 편집 이후 undo 차단·옛 timer 무효 |
| `data-notepad-reading=all|selection` | capture→검증→기존 TTS handoff·원고 변경 후 옛 선택 차단 |
| `data-notepad-settings-retry` | 설정 키 실패가 본문 저장/원문을 바꾸지 않음 |

부모 연결 시작 신호 뒤 root baseline 3건을 별도 fixed 기대값으로 확인하고, 위 선택자로 실제 이벤트/포트 fixture를 작성한다. Chrome은 verify 담당, 전체 타입은 integrator 담당이다. 이 문서 작성에서는 새 제품/검사 TS나 브라우저 실행을 하지 않았다.
