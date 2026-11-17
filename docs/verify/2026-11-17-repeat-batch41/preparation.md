# 41차 미연결 준비 진행 기록

상태: 신규 저장/import/controller/복구 child 준비 final-ready, 26그룹 PASS 및 범위 lint 0/0. 제품·검사 TS 편집을 고정했다. `Notepad.tsx`, 기존 `notepad.ts`, canonical 메시지와 메뉴는 변경하지 않았다. 부모 연결은 root 신호 뒤에 한다. 전체 타입·Chrome·빌드·배포는 실행하지 않았다.

## 현재 파일

- `src/utils/notepadPersistence.ts`: strict v1 notes/settings 읽기, 기존 key 분리, raw CAS/Web Locks fallback/readback, onConfirmed inside-lock basis callback. 기존 notes/자체 백업에 작은 새 상한 없음. 실패 시 원본 raw 유지, rollback 없음.
- `src/utils/notepadImport.ts`: 정상 raw 배열/v1 자기 백업 검증, 같은 ID 충돌 사본/중복 구분, 한 파일씩 읽기/개별 오류/late cancel. 손상 배열의 permissive 자동 보정은 하지 않는다. 복구 preview를 추가하기 전까지 손상 파일은 원문을 유지하며 실패로 안내하는 최소 정책이다.
- `src/utils/notepadDraft.ts`: 400ms 저장, 최신 편집 우선, own basis 즉시 갱신, unknown 재조회, dirty/clean 모두 외부 자동 적용 없음, 명시 keep-both, revision undo, pagehide 취소/pageshow 재확인, Strict activate/dispose.
- `src/components/NotepadRecovery.tsx`: 저장/설정 실패 분리, 원문/현재 백업 callbacks, 외부 개수·제목·충돌 미리보기와 명시 함께 보관. 새 selector는 `data-notepad-*`다.
- `docs/verify/2026-11-17-repeat-batch41/translations-notepad.json`: KO/EN 각 36leaf, `notepad.persistence`와 `notepad.importRecovery` 조각. 아직 canonical에 병합하지 않았다.

## 검사 현재 상태

- `scripts/check-notepad-persistence.ts`: 8그룹 PASS. 50,000개 legacy/6MB 이상 자체 backup, 특수 문자열·큰 finite 시간, 저장 캡처/CAS/unknown·quota/cancel/own basis/settings 분리를 포함한다.
- `scripts/check-notepad-import.ts`: 5그룹 PASS. 정상 backup/큰 배열, ID 충돌과 별도 원래 ID 보존, 순차 파일 실패, 편집 취소/reject 회수/새 작업/Strict 경계다.
- `scripts/check-notepad-draft.ts`: 11그룹 PASS. 기존 입력 보존/400ms/timer ID 재사용/잠금 중 편집/own basis/외부 삭제·clear/keep-both/unknown 후 새 편집/실패 재시도/undo/이탈·BFCache/재진입을 포함한다.
- 신규 7개 제품·TS검사 파일 범위 lint: 0 errors, 0 warnings. 명시 반환 타입 한 줄과 child JS 영향 2파일 lint도 exit 0, errors/warnings 0으로 최종 확인했다.
- `check-notepad-recovery.mjs`: KO/EN 실제 child 2그룹 PASS. preview scope/raw 전달, 손상 raw 반출, 빈 외부 저장 안내, 지원 error/status 문구, busy apply 차단, 제목 literal과 44px를 확인했다. 브라우저 layout/focus 검증으로 주장하지 않는다.

Node의 기존 `MODULE_TYPELESS_PACKAGE_JSON` 경고는 검사 성공/실패와 별개이며 package 설정을 수정하지 않았다. 검사에 실제 사용자 원고·localStorage·OS 다운로드를 사용하지 않았다.

## 부모 연결 때 남는 작업

부모는 loaded 이전 조작을 막고 initialize에 메모리 빈 메모만 전달할 수 있다. 모든 실제 원고 변경은 edit/editUndoable로 통일하며 importer는 draft scope 변경/외부/이탈에 cancel한다. 같은 scope의 파일 결과를 최신 원고와 merge한 뒤 한 번 적용한다. selection/search/locale는 원고 변경 세대가 아니다.

`applyMergedExternal(scope, candidate.raw)`는 preview 당시 두 값이 유지될 때만 동작한다. 외부 clear를 함께 보관하면 사용자가 본 빈 저장본을 기준으로 현재 메모를 다시 저장한다. 손상 raw는 이 버튼 대상이 아니다. Unknown write 재조회가 다른 원고면 자동 재개하지 않는다.

settings는 별도 persistence API의 expectedRaw/current/AbortSignal/onConfirmed를 사용해 부모의 settings 편집 세대를 보호한다. 본문 상태와 오류를 섞지 않는다. 부모의 toast·0ms focus·download URL도 자기 세대/소유 timer를 갖게 한다. 기존 키보드·읽어주기·IME·언어 전환은 실제 부모 fixture와 native에서 후속 확인한다.

다음 단계: root가 요청한 39차 독립 검토. 41 부모는 아직 미연결이며 현재 체크 결과를 실제 메모장 동작 개선 완료로 주장하지 않는다. 추가 준비 제품 TS는 root의 다음 연결/수정 신호 전까지 고정한다.

## 독립 merge 발견 대응

writing_versions가 생성 사본 ID가 뒤 incoming의 정당한 ID를 선점하는 경계를 재현했다. root 승인 후 `mergeImportedNotes`가 현재·전체 incoming ID를 먼저 예약하고 생성 ID도 예약에 추가하도록 최소 수정했다. 자체 import 기존 5그룹에 정확한 reserved-id 사례를 추가해 PASS, 영향 2파일 lint exit 0·errors/warnings 0을 확인한 뒤 다시 TS freeze했다. 이 영향 재실행을 별도 신규 그룹으로 합산하지 않는다. 독립 확인은 writing_versions 담당이다.

현재 부모 치환표와 selector/보존 회귀는 `integration-design.md`에 기록했다. 부모 연결은 여전히 root 신호 대기이며, 39/43 독립 검토와 문서 작성 동안 Notepad 기존 부모는 수정하지 않았다.
