# 24A PDF undo/redo — 미연결 준비

2026-11-17 KST. 담당 `/root/taxi_repeat`. 22차 체크포인트 뒤 새 파일만 준비했다. 기존 `PdfTools.tsx`, `pdfTools.ts`, 이미지 helper 및 공용 번역 원본은 변경하지 않았다. 부모 연결은 23차 체크포인트 뒤 root 신호를 기다린다.

## 기존 코드 실측

- 정리 카드에는 stable key, 원본 페이지 index, 추가 회전, 원래 회전을 반영한 표시 폭/높이가 이미 있다. 현재 배열 이동·회전·삭제는 즉시 반영하며 reset은 `orgInit` 전체로 바꾼다. 중간 단계 복원은 없다.
- 원래 PDF 회전에 `cards[i].rot`을 더하는 기존 반출 계약은 맞다. 이 계산을 새 helper로 옮겨 실제 PDF의 내용·순서·회전을 재확인했다. 원래 없는 북마크·폼·주석 보존을 새로 보장하지 않는다.
- `finish`는 현재 작업 여부를 확인하지 않고 결과 URL/상태/자동 다운로드를 만든다. `readPdfs`도 await 뒤 현재 탭/입력을 확인하지 않는다. `selectTab`은 status/result만 초기화하므로 이전 작업이 늦게 다시 표시·다운로드될 수 있다.
- `runMerge`/`runSplit`/`runImages`에도 공통 guard를 연결해야 한다. 설정·목록 이동/삭제/정렬/전체 삭제·새 읽기·탭 변경·unmount가 이전 작업과 결과를 무효화해야 한다. 다른 탭의 정상 입력 목록 자체를 지우지는 않는다.
- 현재 정리 문서를 가진 동안 새 문서를 고르는 입력이 숨겨져 있다. 연결 시 ‘다른 PDF 열기’ compact 입력을 추가해 성공한 읽기만 새 기준/이력으로 적용한다. 실패한 읽기는 기존 문서·카드·이력을 유지한다.

## 준비 파일/API

- `pdfEditHistory.ts`: `PdfPageCard`는 key/src/rot/w/h의 readonly metadata만 갖는다. `createPdfPageHistory`, `commitPdfPageCards`, `editPdfPages`, `undoPdfPageEdit`, `redoPdfPageEdit`가 initial/past/present/future를 반환한다. 최대 30개 전이, no-op 동일 객체, 새 편집 시 redo 폐기, reset도 한 편집이며 별도 원본 기준은 오래된 undo 기록이 밀려도 남는다. 이력에 File/바이트를 넣지 않는다.
- `pdfPageFocusKey`는 요청한 살아 있는 카드→새로 복원된 카드→첫 카드 순으로 대상을 찾고 아무 카드도 없으면 null을 준다. 부모는 null에서 사용 가능한 이력 버튼으로 초점을 옮긴다.
- `pdfHistoryShortcut`는 Ctrl/⌘+Z, Shift+Z, Ctrl+Y를 해석하되 editable/IME/Alt는 가로채지 않는다. 실제 DOM의 입력/textarea/select/contenteditable과 native composing 여부 판별은 부모 연결에서 한다.
- `pdfTaskGuard.ts`: 하나의 `begin/invalidate/isCurrent` 세대를 네 탭의 읽기·반출·완료에 사용한다. `snapshotPdfItems`는 목록 metadata만 얕게 복사하며 immutable File 참조는 그대로 보존한다.
- `pdfOrganizeExport.ts`: `snapshotPdfOrganize`가 File 참조와 detached 카드 metadata를 고정한다. `createOrganizedPdf`는 추가 snapshot을 await 전에 고정하고 file 읽기/load/create/copy/save 경계에서 현재 작업을 확인한다. superseded 정상 완료는 null이며 PDF-lib 자체를 강제 종료하지 않는다. 현재 작업의 빈/범위 밖/잘못된 회전 선택은 오류다. 부모의 catch/finish도 같은 guard를 확인해야 늦은 실패·자동 다운로드를 막을 수 있다.
- `PdfHistoryControls.tsx`: undo/redo 44px 버튼과 남은 단계 수/키보드 안내만 가진 작은 자식이다. `#pdf-org-undo`, `#pdf-org-redo`, `[data-pdf-history]`로 식별한다.
- `translations-pdf.json`: ko/en `pdfTools.history` 조각. 공용 병합은 부모 연결 단계에 통합 담당이 한다.

## 준비 검사

`node scripts/check-pdf-edit-history.ts`: 10개 그룹 PASS.

1. 이동/회전/삭제 undo·redo의 실제 카드 metadata·stable key·원 배열 보존.
2. 경계 이동/삭제/360도/reset 같은 no-op이 이력이나 redo를 바꾸지 않음.
3. 30회 cap과 오래된 기록이 밀린 뒤 원본 reset/undo 유지.
4. 전부 삭제→undo/reset 및 살아 있는 초점 대상 선택.
5. File/바이트 없는 이력, 원 File 참조 snapshot, 새로운 문서 기준 분리.
6. native 입력 undo/IME/다른 modifier 보호.
7. 공통 작업 세대의 탭/읽기/편집/unmount 경계 무효화.
8. pdf-lib로 만든 3페이지를 실제 반출·재읽기하여 페이지 content stream, 순서, 크기, 원 회전+추가 회전 검증. 반출 중 외부 카드 배열 변경에도 클릭 snapshot 유지.
9. 빈/잘못된 선택을 조용히 보정하지 않음.
10. 지연 file 읽기/저장 완료 뒤 superseded 결과는 반환하지 않음.

`npx eslint src/utils/pdfEditHistory.ts src/utils/pdfTaskGuard.ts src/utils/pdfOrganizeExport.ts src/components/PdfHistoryControls.tsx scripts/check-pdf-edit-history.ts`: exit 0, 오류·경고 0.

이는 미연결 helper 검증이다. 실제 부모의 실패한 읽기 보존·모든 탭 late finish/자동 다운로드·병합/분할/이미지PDF·초점/모바일 검증 완료를 뜻하지 않는다. 부모 연결 뒤 해당 실제 경계를 별도로 확인한다. 전체 tsc/브라우저/빌드/배포는 실행하지 않았다.
