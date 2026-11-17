# 44차 완료 — 러닝 목표 시간3개 비교

**구현·독립·실제 브라우저·공용 통합·최종 전체 타입을 통과했다(미배포).** 같은 거리의 목표 완주시간 최대3개를 비교하고 전체 구간표를 TSV·CSV·인쇄로 반출한다. 기존 단일 계산·1/5km 구간·직접거리 의미를 유지하며, 미완성 입력과 URL 실패를 정상 결과로 바꾸지 않는다. 입력·언어·새 반출 뒤의 늦은 복사/PNG/인쇄는 현재 결과를 덮지 않는다. [계약](plan.md) · [통합 기록](integration-checks.json).

| 검증 | 결과 |
| --- | --- |
| 작성자 신규 검사 | 22그룹 PASS; 관련 기존 회귀 별도 |
| 독립 검토 | 13그룹 PASS |
| 실제 Chrome | 8흐름 PASS; JS/hydration0; 종료 완료 |
| 번역 | KO/EN 62leaf·정적 114사용 오류0 |
| 공용 생성·등록 | generate/check1578·apply0·audit559 own/6 child/미해결0(기존 동적60) |

실제 CSV68,815바이트·500행×18열과 native TSV,50행×10페이지, 숫자 URL 새 방문/부분 편집,320KO/EN을 확인했다. PDF에 Footer·breadcrumb이 포함된 native 결함은 조건부 인쇄 CSS로 최소 수정해 인쇄 영향1·lint와 native PDF/URL2를 재검증했다. 최종90,288바이트·18페이지·500행 PDF에 불필요한 영역은0이다. URL/DOM 불일치는 Next history.state를 버린 검증기 원인이어서 제품 URL 변경0이다. [작성자 기록](implementation.md) · [독립 core](independent-core-review.md) · [독립 부모](independent-parent-review.md) · [브라우저 기록](review-browser.md).

09:43:59 KST에 전원 TS 동결·Chrome 종료·여유3.36GiB 상태에서 시작한 전체2GB 타입 재검사가8.74초 후 exit0·진단0으로 끝났다. 최초09:40 검사에서는50 훅의 TS2367 한 건을 발견했고 최소 보완·영향2/lint 뒤 전체 타입만 다시 실행했다. [최종 타입](../2026-11-17-repeat-batch51/typecheck-final-result.json) · [첫 실패 근거](../2026-11-17-repeat-batch51/typecheck-attempt1.json).52/53 미연결 준비도 컴파일에 포함했지만 기능 완료로 세지 않는다. 범위 lint와 tracked diff를 통과했고 깨끗한 저장소나 untracked 전체 diff를 주장하지 않는다.

Chromium PDF를 검증했으며 실제 프린터 출력은 실행하지 않았다. Clipboard/인쇄 지연·실패는 일부 제어 포트로 주입했다. 초기 helper focus 소유권 경계는 독립core6에 포함되며 반복 실행을 새 그룹으로 세지 않는다. 메타/OG/Twitter/JSON-LD·FAQ·발견파일을 실제 기능 범위로 맞췄다. 정적 export·실기기 검증은 없으며 빌드·배포·커밋·푸시는 하지 않았다.
