# 36차 완료 — 더치페이 정산 기록 보존·복사 복구

2026-11-17 KST. 기존 /dutch-pay/의 저장·계좌 입력·결과 복사를 보완했다. **자체30그룹·독립11그룹·실제 Chrome8/8·전체 타입 재검사 PASS**다. [계약](plan.md) · [통합 기록](integration-checks.json). 기존 계산식·URL codec·두 저장 key/schema를 유지했으며 새 송금 기능이나 장기 저장소는 추가하지 않았다.

정상 최근 기록은10개까지 명시 저장하고 수동 불러오기만 현재 폼을 바꾼다. 쓰기/readback이 확인된 뒤 성공을 표시하며 손상·미지원·100항목 초과 등 정확히 왕복할 수 없는 입력은 폼과 원문을 보존한다. 저장 중 편집한 폼을 늦은 응답이 되돌리지 않고, 계좌는 메모리 공지에 즉시 반영하되 기기 저장 상태와 분리한다. 다른 탭 변경·확인 불가 상태는 자동 덮어쓰기 대신 재조회/재시도로 해결한다.

금액·공지·링크 복사는 native 성공 또는 legacy true만 성공으로 표시한다. 실패하면 전체 원문 선택·재시도·닫기를 제공하고 요청 token으로 입력/언어 A-B-A·옛 timer·이탈 뒤 과거 안내를 차단한다. 공용 ShareResult와도 양방향 지연 요청을 무효화한다. 계좌는 d/최근 기록/ro 공지에는 없고 편집 공지와 명시 공유에는 포함될 수 있다. 보기 전용은 편집 UI 제한이며 접근 통제나 송금 완료 증명이 아니다.

## 구현·독립 검토

[작성자 보고서](implementation.md): 저장13+복사4+실제 child2+부모11=30그룹 PASS, 기존 정산 계산/URL 회귀 별도 PASS다. 범위8파일 lint 오류·경고0이다. 최초 검사 JS unused1은 선언을 제거하고 해당 파일만 재검사했다. URL/legacy 복원을 먼저 적용하고 정상 초기 저장 읽기는0쓰기다. 현재 폼과 최근 목록·저장/복사 상태를 분리했다.

[독립 검토](independent-review.md): 별도 순수/포트5+실제 부모/ShareResult6=11그룹·JS lint0, 추가 제품 결함0. 별도 BigInt500조건·최대 정상 legacy10개339,201바이트·100/101항목·CAS/readback·계좌 경합·URL/ro·복사 token을 확인했다. native API를 흉내 낸 포트 결과를 실제 두 탭 실행으로 주장하지 않았다.

## 실제 브라우저

[최종 리뷰](review-browser.md) · [결과 JSON](browser/final-results.json):8/8 PASS,07:02:32 KST Chrome 종료. JS pageerror·hydration·unhandled 오류0, 제품 수정0이다.

- 정상 legacy10개 읽기0쓰기·URL/구형 URL 우선, 명시 불러오기/저장/삭제, 새 방문 기록 자동 적용 없음과100항목 폼에 실제101번째를 추가한 저장 거부를 확인했다.
- native Storage의 quota/read/readback 실패를 주입해 원본/초안 보존·성공 오인0·rollback0·명시 재조회0쓰기를 확인했다.
- 실제 두 탭/Web Locks/storage event로 stale 저장 거부와 재조회 후 보존, 잠금 대기 load의 편집 취소, 최신 계좌 입력만 저장됨을 확인했다.
- ro DOM/공지/저장 UI와 d/recent/네트워크에서 계좌가 빠지고 편집 공지에만 포함되는 범위를 확인했다. 합성 계좌 원문은 증거 JSON·로그·캡처에 남기지 않았다.
- 실제 Clipboard 금액/공지/링크, 선택 실패·전체 선택·재시도/닫기 후 원버튼 초점, 지역↔공용 공유의 늦은 fallback0·A-B-A·이탈을 확인했다.
-320px 다크 KO/EN의 가로 넘침0, 입력16px·조작44px와 현재 입력 보존을 확인했다.

최초3실패는 about:blank 저장 observer 주입·성공 전 조기 초점 assert·페이지에 없는 SPA 링크 선택의 검증기 조건이었다. 조건을 고친 뒤 영향3개만 재실행했고 제품 변경과 구분했다. 실제 Storage/두 탭/Clipboard/DOM과 제어한 실패·지연을 구분한다. Web Locks 미지원의 CAS/readback은 완전 동시쓰기 원자성을 보장하지 않으며 금융기관 송금·실제 계좌 검증을 수행하지 않았다.

## 공용 통합·타입

ko/en38leaf(작성자32+가이드6), 정적130사용·오류0이다. 저장 상태와 계좌 공유 범위, 탐욕 매칭의 최적성 한계를 description/FAQ/본문/showcase에 맞추고 description/OG/Twitter/JSON-LD를 공유 상수로 정리했다. menu updatedDate2026-11-17, 공용3파일 lint0이다.37과 함께 생성/check1,578파일·apply0·audit own544+child6/미해결0(기존 동적60), redirects472/RSS382/llms315도구·45,771바이트를 확인했다.

전체 타입은36 native 완료 뒤,37 native 시작 전에 실행했다. 첫 시도07:09:11 KST/free4.29GiB는37 AspectRatio.tsx:79의 string→Zone TS2345 한 건으로 실패했다. readAspectQuery의 반환형만 union으로 명시하고 실제 부모 URL/early-edit 영향1·파일lint0을 확인했다. 런타임 변경은 없다. 모든 writer 재고정/Chrome 종료 후 **07:13:07 KST/free4.45GiB, node --max-old-space-size=2048 node_modules/typescript/bin/tsc --noEmit 재검사 exit0·진단0**이다.

이 타입에는 고정된37 제품 및39/40 미연결 준비도 포함됐지만37 native·후속 부모 기능 완료를 뜻하지 않는다.37은 이후 native8흐름을 진행하며 제품 TS가 바뀌면 타입을 다시 확인한다. [37차 진행 기록](../2026-11-17-repeat-batch37/integration-checks.json). 현재 범위 diff와 문서 링크 검사 결과는 통합 기록에 남긴다. 전체 저장소 lint·운영 정적 export 성공을 주장하지 않으며 빌드·배포·dev 재시작·커밋·푸시는 실행하지 않았다.
