# 24A PDF 부모 연결 결과

2026-11-17 KST. 23차 체크포인트 뒤 부모 연결을 시작했다. 제품은 `PdfTools.tsx`와 준비된 `PdfHistoryControls.tsx`, `pdfEditHistory.ts`, `pdfTaskGuard.ts`, `pdfOrganizeExport.ts` 범위다. 원본 번역·메타·canonical은 공용 통합 담당 소유다.

현재 연결 완료: 페이지 이동/회전/삭제/전체 원상복원 30이력과 undo/redo, 정상 새 파일만 이력 교체, 실패 읽기에서 현재 문서 보존, 네 탭의 읽기/반출 snapshot 및 공통 generation 가드, 입력 변경/탭 이동/언마운트 뒤 늦은 상태·자동 다운로드 차단. PDF-lib 연산 자체를 강제로 중단하지 않는다.

입력은 각 탭에 유지한다. 정리/분할의 정상 문서 아래에 다른 PDF 열기를 제공해 실패한 새 파일이 기존 문서를 지우지 않게 한다. 실행 취소/다시 실행은 현재 정리 패널에서만 키보드로 동작하며 입력 칸·IME의 native 동작을 보존한다. 삭제/이력 이동 후 남아 있거나 복원한 카드, 또는 사용 가능한 이력 버튼으로 초점을 옮긴다.

검증 준비 선택자: `#pdf-org-file`, `#pdf-split-file`, `#pdf-panel[data-pdf-tab]`, `[data-pdf-page]`, `[data-pdf-rotation]`, `[data-pdf-history]`, `#pdf-org-undo`, `#pdf-org-redo`. 기존 카드 이동/삭제 ID를 유지한다.

## 현재 증거와 다음 검사

- `node scripts/check-pdf-edit-history.ts`: 10그룹 PASS (실제 PDF 내용·순서·원회전+추가회전 및 late save 포함).
- `npx eslint src/components/PdfTools.tsx src/components/PdfHistoryControls.tsx src/utils/pdfEditHistory.ts src/utils/pdfTaskGuard.ts src/utils/pdfOrganizeExport.ts scripts/check-pdf-edit-history.ts`: exit 0, 오류/경고 0.
- `node docs/verify/2026-11-17-repeat-batch24/check-pdf-component.cjs`: **6그룹 PASS**. 실제 부모의 30이력/redo 폐기/reset/전체삭제 focus/input·IME, 실제 정리 PDF의 내용·순서·회전, 실패/역순 읽기와 편집 중 읽기, 네 탭의 늦은 반출 차단, 실제 병합6쪽/분할2쪽/PNG1쪽 반출, 마지막 save 중 편집 및 unmount 뒤 오류를 확인했다.
- `node scripts/check-pdf-tools.ts`: 기존 순수 회귀 PASS (`all passed`).
- `npx eslint docs/verify/2026-11-17-repeat-batch24/check-pdf-component.cjs`: exit 0, 오류/경고 0. 제품/준비 6파일과 합쳐 scoped ESLint 7파일 통과.
- 부모 검사는 실제 TSX를 번들하고 훅·DOM·파일 지연을 제어하는 기존 harness로 실행했다. 실제 Chrome 검사와 구분한다. pdf-lib의 `instanceof Array` 검증을 위해 테스트 포트에서 VM 배열을 host Array로 변환했으며 실제 페이지/바이트 생성은 pdf-lib를 사용했다. 초기 분할/이미지 fixture 실패는 이 realm 차이였고 제품 결함으로 집계하지 않았다.
- 독립/브라우저 담당에게 final ready와 안정 선택자를 전달했다. 다음은 검증 발견 대응 → TS 편집 고정 후 통합 담당 전체 타입 검사다. Chrome/전체 tsc/빌드/커밋/배포는 이 담당자가 실행하지 않는다.
