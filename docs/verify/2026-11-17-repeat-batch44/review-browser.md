# 44차 native 브라우저 검증

최종 **8/8 PASS**. 실제 출력에서 사이트 메뉴·푸터가 인쇄되는 문제1건을 확인해 작성자가 인쇄 문서가 있을 때만 적용되는 CSS로 격리했고 해당 인쇄 흐름을 재검증했다. URL 관련 제품 수정은0이다. Chrome 종료 완료, 통합 담당의 최종 전체 타입 검사도 통과했다(2026-11-17 09:43:59 KST).

| native 흐름 | 확인 결과 |
| --- | --- |
| 목표 입력 | 최대3개·중복 목표·빈 목표 invalid·삭제 순서·거리/모드 변경 뒤 목표 시각 보존 |
| 정확도 | 제품 유틸을 사용하지 않은 정수 유리수 oracle로100km29초의50km=15초,28,803초의50km=14,402초와 하프/마라톤 마지막 소수 구간을 검증 |
| 전체 반출 | 500행·3목표·18열 실제 CSV68,815바이트(BOM1회/CRLF) 독립 parser 대조. native TSV 전체가 CSV와 같고 화면50행×10페이지 이동 후 CSV바이트 동일 |
| 인쇄 | 최종 실제 Chromium PDF90,288바이트·18페이지, 모든500행의 목표1 누적시각 포함. 페이지 메뉴/푸터 문자열0·첫/마지막 렌더 직접 검토. afterprint 문서 제거·입력 변경 뒤 옛 print 호출0 |
| URL | 초기 복원 대기 중 분17 편집+나머지 URL필드 복원→실제1:17 숫자 URL4620→새 탭 동일 복원. 비소유 중복query/hash/history.state 보존, invalid 목표의 옛 owned URL 제거, 미지원 버전 원본은 편집 전 보존 |
| 복사/공유 | native 복사·API 없음/legacy false 복구·전체 선택·명시 재시도, 기본↔ShareResult 교차 늦은 fallback0. 실제 native PNG encode를 지연한 뒤 CSV를 요청하면 옛 PNG다운로드0, 새 PNG1080×1350 정상. 입력/locale A-B-A 안내 부활0 |
| 기존 단일 계산 | 기본10km50분·pace/time 전환·preset. 큰833:11:40 단일 계산은 유지하되 목표 추가 불가, 반올림1초 미만 추가 차단 |
| 모바일/언어 | 320px 다크 KO/EN 문서/body320px, 필드16px/버튼44px 이상. 복사 복구 EN 캡처를 직접 열어 전체원문 필드와 버튼 줄바꿈 확인 |

인쇄 전후 PDF와 첫·마지막 PNG를 보존했다. 수정 전19페이지는 표500행 뒤 공통 사이트 Footer가 포함되어 있었고 첫 페이지에는 Breadcrumb도 붙었다. root의 실제 캡처 검토와 verifier의 PDF 확인 후 작성자가 `RunningPacePrint`만 조건부 print 격리했다. 최종18페이지의 마지막은490~500km 표이며 더 이상 Footer가 없다. 실제 종이 인쇄/OS 인쇄 대화상자는 호출하지 않고 `window.print`만 관찰 포트로 대체한 뒤 Chrome의 PDF 렌더러를 실행했다.

두 fixture 문제도 제품 문제와 구분했다. PDF의 Windows fallback tabular 숫자가 Type3 ToUnicode에서 PUA로 추출되어 ASCII 대조가 실패했다. 첫 페이지 실제 렌더로0~9/콜론 모양을 확인하고 해당11코드포인트만 정규화하여 모든500 누적시각을 대조했으며 raw/normalized 추출 파일을 모두 보존했다. 이는 PDF의 일반 텍스트 복사 품질을 개선한 주장이 아니다. URL fixture는 검증용 history.state를 통째 교체해 Next의 `__NA`를 버렸고, trace에서 제품이4620을 쓴 뒤 Next가5400으로 되돌리는 것이 확인됐다. 기존 state를 보존한 fixture로 바꾼 뒤 새 탭까지 통과했다. 수정되지 않은6개 흐름은 반복하지 않았다.

JS page error·hydration·unhandled rejection·원시 번역 키0. 외부 폰트/광고/분석 요청 차단 로그는 제품 런타임 오류와 구분한다. PDF·PNG·CSV·Clipboard·새 탭은 실제 Chrome, 지연 callback·API 거부·초기 복원 보류는 제어 포트다. 합성 데이터만 사용했고 기존3039 서버를 보존했다. PDF 읽기/렌더에는 `pdf` 스킬의 Poppler/pypdf 절차를 적용했으며 제품 파일을 직접 수정하지 않았다.

실행기 `scripts/check-repeat-batch44-browser.mjs`, 최종 `browser/final-results.json`·각 evidence, `running-500-print.pdf`, `.extracted.txt`/`.normalized.txt`, `running-print-first.png`/`running-print-last.png`, CSV·PNG가 근거다. 44/48/49 실행기3+fixture3파일 scoped ESLint 오류0/경고0, 추가 전체 타입/build/git은 수행하지 않았다.

최종 타입 근거: 통합 담당 `node --max-old-space-size=2048 ... tsc --noEmit`,09:43:59 KST 시작·free3.36GiB·8.74초·exit0·진단0·chunk0f20ce(동기 종료로 session ID 없음). 첫09:40:26/session62674에서 useSpeakingRecorder.ts131 TS2367 한 건이 있었고 `pageHidden()` 최소 보완 뒤 hook hidden1+parent hidden1·lint0을 확인하고 전체 타입만 재검사했다. 이미 통과한 native는 그대로 보존했으며 새 브라우저 반복은 하지 않았다.
