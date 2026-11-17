# 58차 OCR 복사 복구 미연결 준비

root가 `OcrCopyRecovery.tsx`와 KO/EN `imageOcr.output` 각16키 조각을 준비했다. 부모 ImageOcr는57 담당이 연결 중이므로 수정하지 않았다. 57의 실제 원고/결과 소유권은 최종 부모에 연결할 때 확인한다.

자식 API: `failure={text,label}`는 부모가 발급한 불변 객체, `isCurrent(failure)`는 현재 출력 요청과원고·locale의 동일성을 검사한다. `onRetry/onClose`는 다시 받은 객체가현재일때만 동작해야 한다. 자식은실패객체identity별로 전체 내용 보기를 열고 새failure로 바뀌면 접힌 상태로 되돌린다. 2중textarea를 실패즉시 만들지 않는다. focus/select/setSelectionRange 사이마다isCurrent를 다시확인하고선택실패를명시한다. 모든label은t를거친다.

작성자검사 `node docs/verify/2026-11-17-repeat-batch58/check-ocr-copy-recovery.mjs`:4그룹 PASS, 제품/검사2파일ESLint오류0·경고0. 실제미연결child+제어React/focus/selection을 사용해64,000 UTF-16단위한국어·emoji·공백·개행의전체보존과명시확장,KO/EN,선택실패/복구,focus재진입·oldhandler새failure차단,빈문자열안내를확인했다. 결과는 `author-recovery-child.json`. nativeClipboard·TXT·부모 output owner의검증으로세지않는다.

다음:57 actualparent final/freeze후root가현재/전체copy와TXT/handoff를공용출력owner에연결한다. 기존OCR/Worker/이미지prepare·스토리지/API는추가수정하지않는다. 58독립준비는writing,canonical은integrate,실제브라우저는verify가담당한다.

추가 준비: `src/utils/ocrOutput.ts`의 downloadOcrText는현재본문만`ocr-result.txt`로반출하고 결과를started/empty/failed/stale로구분한다. 전체내용의Blob은UTF-8원문(기존BOM/CRLF/공백/탭포함)을유지한다. 클릭전현재성검사,DOM/URL실패안내를위한반환값과자기URL/anchor정리를제공한다. `check-ocr-download.mjs`3그룹PASS이므로작성자미연결준비는child4+helper3=7이다. 제품/검사추가2파일도범위ESLint0/경고0이다. actualparent/nativeTXT검증으로세지않는다.
