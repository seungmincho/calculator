# 24차 A PDF 정리 독립 검토

2026-11-17 KST. 담당 `/root/writing_versions`. 제품 코드는 읽기 전용으로 검토했다. **독립 9그룹 PASS, 현재 재현된 제품 결함과 추가 수정 요청은 없다.**

검토 파일은 `PdfTools.tsx`, `PdfHistoryControls.tsx`, `pdfEditHistory.ts`, `pdfTaskGuard.ts`, `pdfOrganizeExport.ts`다. 기존 pdf-lib 회전/내용 반출, 네 탭 공통 세대, 실패 읽기 시 현재 정리 문서 보존에 집중했다. 기존 알고리즘 전체 검사를 반복하거나 제품 파일을 수정하지 않았다.

## 실행 근거

검사: `docs/verify/2026-11-17-repeat-batch24/check-pdf-independent.cjs`.

| 독립 그룹 | 확인 내용 |
|---|---|
| 참조 모델 | 별도로 만든 linear timeline/cursor 모델과 600번 혼합 이동·회전·삭제·리셋·undo/redo 대조. 현재 카드와 past/future 개수 일치, 합계30 이하, no-op의 redo 보존, 원상복원 기준 불변 |
| 실제 PDF oracle | 실제 생성한 4페이지 PDF에 고유 본문·폭·원회전 0/90/180/270을 부여. 추가 회전4종으로 재배열 반출하고 재읽어 16조합 회전·본문 stream·페이지 순서·폭 일치 |
| focus/shortcut 로직 | 전체 삭제 후 undo로 원 key 복원, 사라진 카드에 focus 지정하지 않음, 입력칸/IME/Alt 단축키 제외, Ctrl+Z/Shift+Z 구분 |
| 실패/역순 읽기 | 실제 부모에서 회전·삭제한 뒤 잘못된 새 PDF 읽기 실패가 기존 카드/이력을 유지. 느린 옛 파일과 빠른 새 파일의 역순 완료에서 최신 파일/새 이력만 남음 |
| 부모 삭제/이력 focus | 4페이지 전체 삭제 뒤 사용 가능한 undo, 복원 뒤 존재하는 페이지 삭제 버튼, redo 뒤 undo로 focus 대상 이동. input의 native undo는 preventDefault하지 않음 |
| 병합 late save | 실제 병합 save 완료를 지연한 뒤 탭 변경. 늦은 다운로드/오류 없음, 원 파일 입력 보존 |
| 분할 late save | 실제 1~2페이지 분할 save 지연 뒤 탭 변경. 늦은 다운로드/오류 없음, 원 파일/범위 입력 보존 |
| 정리 late save | 실제 정리 save 지연 뒤 탭 변경. 늦은 다운로드/오류 없음, 원 문서/카드 입력 보존 |
| 이미지 PDF late save | 실제 2×2 PNG embed/save 지연 뒤 탭 변경. 늦은 다운로드/오류 없음, 원 이미지 입력 보존 |

실행 순서: 초기 실행에서 처음5그룹 통과 후 fixture의 빈 `role=alert` 컨테이너 개수 기대가 틀려 중단됐다. 이는 제품 오류가 아니며 자식 오류 문구 유무를 검사하도록 고쳤다. 분할 이후에는 pdf-lib의 `instanceof Array`와 VM 배열 realm 차이가 드러나, test-only module 경계에서 배열을 host `Array.from`으로 변환하고 typed-array 생성자를 공유했다. 실제 브라우저에서는 한 realm이므로 이 변환은 제품 변경이 아니다.

수정된 fixture로 `node .../check-pdf-independent.cjs "export save"` **4그룹 PASS**, `node .../check-pdf-independent.cjs "actual parent"` **2그룹 PASS**를 확인했다. 처음 통과한 순수/실제 PDF 3그룹은 영향이 없어 재반복하지 않았다. 중복을 빼면 총9그룹이다. 특정 그룹 필터 없이 실행하면 전체9그룹을 실행할 수 있다.

독립 검사 CJS 파일 scoped ESLint: **exit 0, 오류 0/경고 0**.

## 정적 대조

- 이력은 key/src/rot/w/h만 복사한다. 원 File/바이트는 이력에 들어가지 않는다. commit 시 future를 비우고 과거30개로 제한하며 undo/redo에서는 총합이 늘지 않는다.
- 원회전+추가회전을 합산하고 0~359도로 정규화한다. PDF 본문과 순서를 실제 재읽어 단순 메타데이터 검사와 구분했다.
- beginTask/invalidate/finish/readPdfs가 동일 generation을 공유한다. 모든 네 탭이 마지막 save 또는 ZIP 완료 뒤 finish에서 최종 token을 확인한다. 이미 실행한 pdf-lib 작업을 강제로 중단한다는 의미는 아니다.
- 정리 이력과 split/merge/image 입력은 각 탭에 남고, 정상 새 문서 읽기만 새 기준으로 교체한다. 새 편집은 결과 URL과 진행 작업을 무효화한다.
- keyboard는 정리 panel 범위이며 입력/textarea/select/contenteditable과 composition을 제외한다. 실제 DOM focus·모바일·브라우저 단축키 검증은 별도 담당의 범위다.

## 한계와 후속

PDF 생성/재읽기/본문 stream 검사는 실제 pdf-lib를 사용했다. 부모는 실제 TSX와 이벤트/상태를 실행하되 React hook/DOM/download/animation frame은 제어 포트다. 따라서 브라우저 렌더·native DOM focus·다운로드 UI 또는 PDF 뷰어 시각 검증으로 확대하지 않는다. 작성자 자체6그룹/도메인10그룹과 독립9그룹은 별도 집계한다.

Chrome·전체 타입 검사·빌드·배포·커밋·공용 원본 변경은 하지 않았다. 25차 미연결 준비 TS도 고정 상태다. 브라우저에서 추가 문제가 나오면 그 영향 범위만 재현하고 작성자에게 전달한다.
