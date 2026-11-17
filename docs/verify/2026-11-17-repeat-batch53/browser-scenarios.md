# 53차 native 검증 계획

상태: 부모/canonical final 뒤 첫 native8/8 PASS·Chrome 종료. 실제 결과와 한계는 review-browser.md와 browser/final-results.json을 따른다.

1. **color-valid-shorthand-invalid-last-good** — 3/6HEX/#생략/공백/대소문자,alpha4/8와긴invalid nativepaste무잘림·마지막색유지·명시되돌리기를 확인한다.
2. **color-canonical-picker-presets-sliders-random** — computedCSS/picker는canonical만,기존5표기·RGB/HSL6slider·preset·고정난수0/FFFFFF를 확인한다.
3. **color-url-real-visit-and-popstate** — valid/invalid/duplicate URL·미지원초기원문보존·새탭재현·unknown/query/hash/state·뒤로앞으로를 확인한다.
4. **color-early-edit-and-history-failure** — 초기복원 지연 중 valid/invalid edit 전체우선,history쓰기실패에도현재색보존·명시공유URL을 확인한다.
5. **color-five-native-copy-and-manual** — 5표기 실제Clipboard,legacytrue/false·reject·throw,정확한실패문자열/수동선택/재시도를 확인한다.
6. **color-share-cross-owner-and-aba** — 직접copy↔ShareResult link/실제toBlob PNG,색/언어ABA·옛timer/retry/close·이탈 뒤 늦은완료0을 확인한다.
7. **color-actual-png-current-canonical** — 실제PNG를디코딩/직접열고마지막유효HEX/공유URL과일치하는지확인,invaliddraft/알파원문은URL/저장/이미지에전달하지않는다.
8. **color-320-dark-ko-en** — 320px다크KO/EN·preset5열/44px·입력16px·연결label/키보드/모바일결과바로가기를확인한다.

기존3039·Chrome1개·격리context·ServiceWorker차단·외부요청차단·합성자료만 사용한다. 제품TS/canonical/빌드/전체타입/서버는 변경하지 않는다. nativeClipboard전달문자열과Windows읽기CRLF정규화를분리하며API실패/지연·timer·난수는제어포트로명시한다. 실제OS색picker대화상자/디스플레이색교정/프린터색관리는검증주장이아니다. 실제PNG/TXT·320KOEN캡처는실행후에만PASS로보고한다.

