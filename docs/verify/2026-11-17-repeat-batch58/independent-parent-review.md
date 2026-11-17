# 58차 OCR 출력 — 실제 부모 독립 검토

상태: **실제 부모 독립7그룹 첫 실행 PASS, 제품 수정 요청 없음.** 미연결 준비 child4+TXT helper2=6은 별도 근거로 유지하며 독립 고유 합계는 **13그룹**이다. 작성자13그룹과 합쳐 새 독립 수로 세지 않는다.

## 실행

```text
node docs/verify/2026-11-17-repeat-batch58/independent-parent-check.mjs
npx eslint docs/verify/2026-11-17-repeat-batch58/independent-parent-harness.mjs docs/verify/2026-11-17-repeat-batch58/independent-parent-check.mjs
```

작성자 `ocr-output-parent-harness.mjs`의 I/O 포트만 재사용했다. 별도 local wrapper가 메모리에서 catalog/effect replay를 노출하고 실제 `OcrCopyRecovery`를 부모 props에 연결한다. 원본 host와 작성자 assertion은 수정/재사용하지 않았다. 실제 부모·queue·worker session·share helper·TXT helper가 실행되며 Worker/Image/Canvas/Clipboard/DOM/URL만 합성한다. 모델·개인 사진·실제 클립보드는 호출하지 않았다.

## 독립 결과

| 그룹 | 별도 기대값 | 결과 |
| --- | --- | --- |
| 1 | native거부/API없음 각각 legacyfalse일 때 성공아닌failed. BOM·한글·emoji·CRLF·공백이 포함된긴원고가 명시확장 후 전체readonly value로유지. 선택실패→정상전체선택·현재retry 성공, 옛recovery retry/close는현재성공에영향0 | PASS |
| 2 | current/all pending각각→다른copy/TXT/handoff의6순서에서oldreject 뒤legacy0·구식안내0·추가반출0. 이전실패recovery→새pendingall에서도oldretry/close가새요청을바꾸지않음 | PASS |
| 3 | 원고·선택이미지·언어설정·전처리·정리·UIlocale·동일언어catalog의A→B→A 각각oldreject가무효. 같은문자열로돌아와도이전세대를살리지않으며현재새copy는정상 | PASS |
| 4 | edit dispatch직후React재렌더전oldreject를실행해queueRef의동기revision으로fallback0. 실제복구field의focus재진입에서새원고를편집하면select/range진행0·oldrecovery무효 | PASS |
| 5 | 재인식running/error에서도전체copy/TXT가화면의이전성공원고를동일순서로포함. 새OCR완료시oldpendingcopy무효,새전체문자열반영. 정상빈OCR결과는현재copy empty·전체는기존두개행합치기규칙유지 | PASS |
| 6 | BOM/Unicode/CRLF/HTML처럼보이는문자의TXT bytes를독립TextEncoder와비교. 파일명·지연자기URL정리·URL실패후재시도·원고보존. 선택handoff는exact slice/기존sessionkey·성공이동만,storage실패이동0이며oldcopy도무효 | PASS |
| 7 | old2초callback은TXT/newcopied를지우지않음. Strict effect재활성화의이전epoch pendingcopy와unmount뒤reject는fallback0. 현재epoch 새copy는정상 | PASS |

## 보존과 한계

검사 전후 `ocr.ts`·`ocrQueue.ts`·`workerSession.ts`·`textHandoff.ts` 및57baseline JSON2개의 SHA 불변 assertion을 통과했다. 기존57 Worker/재인식 알고리즘 전체를 재검증한 것이 아니라 해당 경로를 통해 **최신 표시 원고의 반출**을 확인했다. 준비6그룹을 부모 연결 뒤 다시 실행하지 않았으며, 미연결 상태 증거는 당시 기록으로 보존한다.

실제 native clipboard.writeText가 시작된 뒤 OS가 이미 수행한 복사를 되돌릴 수 있다고 주장하지 않는다. 검증한 보장은 늦은실패의 추가legacy복사·구식성공/실패안내·2초상태삭제를차단하는 것이다. TXT는제어DOM으로다운로드요청만관찰했으며사용자디스크저장완료보장은없다. 캔버스는합성이고실제OCR정확도/모바일IME/브라우저픽셀/성능주장은없다.

제품 검사7그룹은 첫 실행에 모두 통과했으며 추가제품수정/실패재현은없다. Chrome·전체tsc·빌드·배포·커밋 실행0, 제품TS·canonical·공용host·baseline 수정0이다.

검토해시:

- `ImageOcr.tsx`: `939ddc2fd86c49dcee2ca1d02ac317ef89c4a68758bc212ae76cbae0c062efde`
- `OcrCopyRecovery.tsx`: `49c3a5e25579ec910a0199f34b149edf67c93ae8c6fe0b8afd089b36b3d36626`
- `ocrOutput.ts`: `39597bab2781a6249a37f49cf358b5c3fa9bd87d625a5d9ef2018f5b38ff4583`
- `ocrQueue.ts`: `45de5c1fcf875d5e76bc0b573c1bb2f55595e791069e9495b666578e6c09da4f`
- `workerSession.ts`: `b2e47e6a3b6acb863a32694572f9f80812c86f0bc0100de511f9570094d2ffc2`

최종 신규 MJS2파일 scoped lint: **exit0, 오류0·경고0**.
