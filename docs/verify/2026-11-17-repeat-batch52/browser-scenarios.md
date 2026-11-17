# 52차 native 검증 계획

상태: 부모/canonical final 뒤 첫 native8/8 PASS·Chrome 종료. 실제 결과와 한계는 review-browser.md와 browser/final-results.json을 따른다.

1. **percent-eight-cards-and-units** — 8종 기존 결과를 손계산 대표값·%/%p 단위와 대조한다.
2. **percent-snapshot-six-and-independent-reset** — 원문/당시 설정/식 snapshot 고정,중복/6개 거부,삭제 순서·목록비우기/기본초기화 분리를 확인한다.
3. **percent-whole-native-txt-and-clipboard** — 실제6개 전체 TXT와 native Clipboard 제출 문자열·당시 snapshot을 독립 대조하고 locale 레이블 변화와 값 보존을 구분한다.
4. **percent-copy-recovery-and-cross-owner** — API 없음/reject/legacy false·throw/true,전체 수동 선택/재시도,카드↔전체복사↔TXT 늦은 fallback0을 확인한다.
5. **percent-input-locale-aba-and-early-edit** — 입력/표시/언어 A-B-A·옛 성공/timer/복구 무효,초기복원 전 명시 편집 우선을 확인한다.
6. **percent-url-real-revisit-and-ownership** — 실제 초기 URL·수정·새 탭8카드 복원,무관 중복 query/hash/history.state 보존과 비교목록 URL/저장0을 확인한다.
7. **percent-overflow-and-legacy-boundaries** — finite1e308 곱 overflow가0으로 보이지 않고 복사/담기 차단,빈값≠0·0기준·한줄질문·5단계 연속 할인 회귀를 확인한다.
8. **percent-320-dark-ko-en** — 320px 다크KO/EN,16px입력/44px버튼,비교바로가기/전체복구/키보드·캡처를 확인한다.

기존3039·Chrome1개·격리context·ServiceWorker차단·외부요청차단·합성자료만 사용한다. 제품TS/canonical/빌드/전체타입/서버는 변경하지 않는다. nativeClipboard전달문자열과Windows읽기CRLF정규화를분리하며API실패/지연·timer·난수는제어포트로명시한다. 실제OS색picker대화상자/디스플레이색교정/프린터색관리는검증주장이아니다. 실제PNG/TXT·320KOEN캡처는실행후에만PASS로보고한다.

