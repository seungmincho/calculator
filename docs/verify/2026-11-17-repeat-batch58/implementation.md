# 58차 OCR 복사·TXT 실패 복구

부모 연결 완료. root 자체 준비7(child4+TXT3)+실제부모6=13그룹 PASS, 독립 준비6+실제부모7=13그룹 PASS다. 제품3/작성자검사4 및 독립검사 범위lint오류0·경고0, root source diff검사0이다. native7/7과10:45:23 KST 시작 첫 전체타입(exit0/진단0)을 통과했다. 이후 모바일 실패 안내 중복을 제거한 JSX만 영향 검증했고 최종 재타입은 통합 담당이 진행한다. 57의 queue/worker/편집 원고 보호 로직은 변경하지 않았다.

- `ImageOcr.tsx`: 원고queue revision·선택이미지·언어설정·처리모드·locale·번역문구별 공용 요청owner를 활성화한다. queueRef의동기revision도검사해React렌더전에바뀐원고를예전요청이반출하지않는다. progress안내만바뀌면owner가쓸데없이교체되지않는다.
- 현재/전체복사와재시도는공용copyShareResultLink(native→legacy)를사용하고true성공만완료표시한다. 두경로실패는전체원문스냅샷을OcrCopyRecovery에전달한다. 빈원고는빈내용안내로구분한다. 복사2초안내타이머도요청에속한다.
- 복사/다른복사/TXT/읽어주기전달은서로이전출력을무효화한다. 편집·새결과·이미지/locale전환·이탈뒤oldnative거부가legacy를다시실행하거나옛안내를붙이지못한다. native clipboard가이미받은쓰기자체를취소한다고표현하지않는다.
- TXT는전체의현재보이는원고(처리중/실패한항목의이전성공포함)를기존두줄바꿈순서로연결해UTF-8로내보낸다. `ocr-result.txt`파일명유지,다운로드요청과실물저장확인은구분한다. 복구화면은명시확장/선택/재시도/닫기와16px/44px를제공한다.
- 현재결과복사 `data-ocr-output-copy="result"`,전체 `="all"`,TXT `[data-ocr-output-download]`,상태 `[data-ocr-output-status]`. 복구선택자는preparation.md참조. 57 `[data-ocr-text]` 등기존선택자는유지한다.

부모검사 `node docs/verify/2026-11-17-repeat-batch58/check-ocr-output-parent.mjs`: 실제 ImageOcr/queue/session/출력helper와제어Worker/Canvas/Clipboard/DOM을사용했다. exact현재·전체복사,실패/legacytrue재시도,출력역순·latefallback0,원고/localeABA와oldmanualcallback,실제Blob UTF8/TXT·URL정리,읽어주기/이탈,빈원고·닫기보존을6그룹으로확인했다. OCR모델다운로드/실제인식/실제브라우저검증으로세지않는다.

최종KOEN은`translations-ocr-output.json`각16키다. 파일저장성공으로오해하지않도록통합담당이downloadStarted/Failed를다운로드요청문구로정밀화한다(키/동작변경없음). 57baseline/check/harness는수정하지않고58이별도host를소유한다. 보고서상‘이미지선택’은독립검사대상이며root부모검사제목에잘못섞였던표현만실제검사내용에맞춰제거했다.

10:50 KST 보완: 실제 EN320 캡처에서 부모 상태와 복구 카드에 같은 실패 문구가 두 번 표시됐다. 실패 시 부모 status 문장을 제거하고 복구 카드 alert만 유지했다. 상태 선택자는 바깥 div에 보존했다. 기존 실제부모6/6 영향·부모 eslint0/0, native320 KO/EN1흐름에서 동일 문구 정확1개·16px 원고·44px 버튼·키보드 선택·가로 overflow0을 확인했다. 새 기능/검사 그룹으로 중복 집계하지 않는다. Chrome은 종료했고 최종 타입 재확인 대기다.
