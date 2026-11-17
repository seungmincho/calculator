# 41차 메모장 실제 부모 연결 — author ready / TS freeze

37/39/40 전체 타입 08:08:20 PASS 뒤 root 신호로 부모 연결을 완료했다. 준비 author 26·독립 13과 incoming 전체 ID 예약 수정은 보존한다. 실제 부모 10그룹 및 기존 회귀, 최종 8파일 scoped lint(오류 0·경고 0, exit 0)가 통과했다. 현재 제품·검사 TS는 동결하며 독립 actual-parent/native/전체 타입은 각각 별도 담당의 결과를 기다린다. 여기서는 브라우저·전체 타입·빌드·배포·커밋을 실행하지 않았다.

## 실제 변경

- `src/components/Notepad.tsx`: 직접 setNotes·자동 저장·외부 덮어쓰기를 제거하고 준비 draft를 사용한다. 삭제/가져오기/전체 치환의 실행 취소는 revision 소유 token으로 제한한다. 옛 toast/focus callback은 자기 세대와 수명을 확인한다. 기존 검색/고정/IME 원문/Tab·Esc/집중 모드/글자 통계/TXT·JSON/읽어주기는 보존한다.
- `src/hooks/useNotepadWorkspace.ts`: 새 부모 연결 모듈. 최초 0ms 읽기 0write, 400ms 저장, notes/settings 별도 raw CAS·Web Locks·readback, 외부 변경 명시 확인, latest file generation, settings 최신 입력, pagehide 취소/BFCache 재조회, Blob URL 소유권을 연결한다.
- `NotepadRecovery.tsx` 및 `notepadPersistence.ts`, `notepadImport.ts`, `notepadDraft.ts`: 준비 API를 그대로 사용한다. 준비 독립에서 수정한 incoming ID 선예약을 유지한다.
- 번역: `translations-notepad.json`의 KO/EN 각각 36 leaf를 integrate에 최종 전달했다. canonical/generated/menu/meta는 작성자가 수정하지 않는다.

정상 legacy notes 및 자체 backup에는 새 개수·크기 상한을 추가하지 않았다. 손상/미래 raw를 자동 backup 후 초기화하지 않으며, 오류/외부 변경 동안 현재 원고는 메모리에 남는다. 외부 저장본은 원문+scope를 확인한 명시 함께 보관만 적용한다. 같은 ID의 다른 내용은 별도 ID로 보존하며 이후 incoming 정상 ID를 선점하지 않는다.

저장 확인 불가는 저장 성공으로 표시하지 않고 rollback도 하지 않는다. 보기 설정의 실패는 본문 저장과 분리한다. pagehide에서 새로운 async lock이나 무잠금 write를 강행하지 않으며, 이탈 전 저장 보장을 하지 않는다. 실제 `File.text()` 자체를 중단할 수는 없으므로 늦은 응답을 회수하되 적용하지 않는다.

## 자체 검사

`node docs/verify/2026-11-17-repeat-batch41/check-notepad-parent.mjs` — **10그룹 PASS**.

1. 초기·실제 effect Strict replay 0write, 정상 legacy raw/필드·손상 원본 유지.
2. dirty 원고와 외부 변경/삭제/clear 보존, 오래된 preview 차단 및 명시 함께 보관.
3. 대기 중 lock의 새 입력 우선, 두 부모의 동일 raw CAS, 대기 중 merge 취소.
4. quota·read 차단·write 이후 readback 불가, 메모리 보존 및 명시 재확인/재시도.
5. 늦은 파일 응답/거절·새 파일·취소·부분 실패·개행 정규화·input 초기화.
6. 같은 ID 충돌 사본, 삭제/가져오기/전체 치환 undo 및 후속 입력 이후 옛 undo 차단.
7. 옛 toast가 새 undo를 지우지 않음, 옛 focus 요청 무효화, locale 원고 보존.
8. notes/settings 분리, 대기 중 settings 최신 입력, 설정 손상 raw 유지.
9. 실제 textHandoff의 전체/선택 payload, 옛 선택 차단·popup 실패, IME 원문·Tab/Esc 동작.
10. 실제 TXT/backup/raw Blob 내용·URL 정확 1회 회수, pagehide 신규 lock 0 및 BFCache 외부 재확인.

공용 host는 **메모리에서만** useDeferredValue와 effect replay를 확장했다. 실제 부모+hook+controller/import/persistence/textHandoff는 번들링하고 브라우저 I/O만 제어한다. React DOM 배치, native localStorage/Web Locks, 파일 대화상자·실제 다운로드·모바일 초점은 이 검사에서 주장하지 않는다. 원고는 모두 합성 자료이다.

기존 회귀: `node scripts/check-notepad.ts`, `node scripts/check-char-count.ts`, `node scripts/check-text-handoff.ts`(51항목) 모두 PASS. Notepad에 OCR 입력 경로는 없고 OCR/TTS 공유 helper는 미수정이며 기존 OCR 호환 검사가 포함된다.

최종 scoped lint 대상은 Notepad/hook/Recovery/persistence/import/draft와 actual-parent JS 2파일, 총 8파일이다. 앞선 fixture의 `this` alias lint 1건은 host focus holder로 고친 뒤 재검사 exit 0을 확인했다. 제품 lint disable은 추가하지 않았다.

## native / 독립 인계

`integration-design.md` 표의 `data-notepad-*` 선택자는 실제 연결 완료했다. root의 `data-notepad-ready`는 초기 false→읽기 완료 true. 저장 상태는 `data-notepad-save-status=idle|dirty|saving|saved|error|external`, import는 reading/cancelled이다. 원래 key이자 Web Lock 이름은 `toolhub-notepad-notes`, `toolhub-notepad-settings`이며 초기 정상 복원에서 raw를 다시 쓰지 않는다.

파일 포트는 선택 즉시 캡처한 `File.text()` Promise이다. 실제 편집/새 파일/취소/외부 변경/이탈이 과거 응답을 무효화한다. 다운로드는 클릭 순간 Blob을 만들고 1초 뒤 또는 unmount에 URL을 회수한다. React 자식 Recovery의 비교 scope/raw가 실제 controller 검증까지 전달된다.

native 담당은 최종 번역 이후 두 탭 lock/CAS, quota/readback, 손상 원문/자체 backup, 파일 경합, undo/포커스, TTS 전달, 320px KO/EN을 확인한다. 전체 타입은 Chrome 종료 후 integrate 담당만 실행한다.
