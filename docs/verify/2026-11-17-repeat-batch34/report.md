# 34차 완료 — 숫자 한글 변환의 입력·복사 복구

2026-11-17 KST. 기존 /number-to-korean/의 중간 입력·IME 경계와 단일/일괄 복사를 보완했다. **자체40그룹·독립8그룹·실제 Chrome7/7·전체 타입 첫 실행 PASS**다. [계약](plan.md) · [통합 기록](integration-checks.json). 기존 숫자 변환 계산식·일괄 serializer·한도는 유지했다.

입력 중에는 raw 원문을 유지하고 blur에서 유효한 숫자만 정리한다. IME 조합 중 빠른 입력·비우기·복사·URL 적용을 막고, 늦은 정리 callback이 재초점이나 새 입력을 덮지 않게 한다. 자동 focus를 제거하고 최초 예시와 공유 입력, 파라미터 없음/명시 빈칸/0을 구분한다. 직접 비운 n= 링크도 새 방문에서 빈칸을 보존한다.

한 부모의 복사 controller가 단일 서식·링크와 Batch TSV의 요청을 관리한다. 입력·옵션·언어·새 요청·이탈 뒤 오래된 성공/실패/fallback/timer를 무효화하며 실패 시 현재 전체 원문 선택·재시도·닫기를 제공한다. CSV 반출, 원래 줄번호·오류행 원문·수식 보호와100물리행/30,000자 한도는 유지한다. 숫자20자리 문자열과 안전 정수 범위의 한글 역변환 한계를 구분한다.

## 구현·독립 검토

[작성자 보고서](implementation.md): 준비 입력14+복사14+실제 child4, 부모8=40그룹 PASS. 기존 계산 및 일괄18검사는 별도 회귀로 통과했다. 변경제품5+TS검사2+MJS2=9파일 scoped lint 오류·경고0이다. 직전31/32/38 체크포인트의 준비파일 TS2774 수정은 이전 타입 근거이며 이번 부모 기능 검증과 구분한다.

[독립 검토](independent-review.md):8그룹 PASS·JS lint0·제품 수정 요청0. 실제 부모와 Batch를 별도 기대값/CSV reader로 대조해20자리·URL 초기화·조합 순서·아홉 복사 대상의 전역 경합·원문/설정/locale·100행 반출·StrictMode/cleanup을 확인했다. 작성자의 assertion을 재사용하지 않았으며 제어 I/O 포트와 실제 브라우저를 구분한다.

## 실제 브라우저

[최종 리뷰](review-browser.md) · [결과 JSON](browser/final-results.json):7/7 PASS,06:39:36 KST Chrome 종료. JS pageerror·hydration·unhandled 오류0, 제품 수정0이다. 첫6개 통과 뒤 모바일 region 선택자가 복구 section까지 포함한 검증기 오류를 고치고 해당1개만 재실행했다.

- native 삽입/Backspace/선택 범위 치환에서 caret와 raw 원문을 확인했고 blur 뒤만 쉼표를 정리했다. 자동 focus 없음, 미완성 부호/끝점/소수뒤0/한글 원문 보존도 확인했다.
- 합성 composition 중 조작/URL 차단, 종료→마지막 input의 최신값 정리, 재초점 뒤 과거 예약 무효화를 확인했다.
-20자리/2^53 초과 입력과 현재 링크, n 없음/빈 n=/무효/0의 새 방문, query/hash/history.state 보존을 확인했다.
- native Clipboard 성공과 주입 실패·legacy false/부재/throw, 전체 readOnly·선택 예외·재시도·닫기, 단일↔Batch 양방향 지연 요청·SPA 이탈·옛 timer를 확인했다.
-100물리행 중 내부 빈행1개를 제외한99행+헤더/7열의 TSV와 실제 CSV를 독립 파싱했다. CSV7,424바이트·UTF-8 BOM·고정 파일명, 원래 줄번호·TAB/따옴표·수식 라벨·20자리·오류 원문이 일치하고101행은 부분 반출하지 않았다.
-320px 다크 KO/EN, 입력16px/조작44px·언어 변경 후 현재 입력/새 영어 복구를 확인했다. 넓은 표는252px 구역 안에서 내부 스크롤한다.

키보드/DOM selection·Clipboard·CSV는 실제 Chrome 기능이다. 한국어 OS IME와 모바일 소프트 키보드 실기기는 검증하지 않았고 composition은 합성 이벤트다. 실패/legacy true/late 응답은 제어 포트이며 OS에 이미 제출한 쓰기 취소를 보장하지 않는다.

## 공용 통합·타입

ko/en22leaf(작성자14+가이드8), 정적86사용·오류0이다. 기존 가이드의 숫자 한도·서식 범위와 근거 없는 법적 의무 표현을 실제 동작에 맞췄다. description/OG/Twitter/JSON-LD·FAQ·showcase, menu updatedDate2026-11-17을 일치시켰다.33과 함께 생성/check1,578파일·apply0·audit own543+child6/미해결0(기존 동적 알림60), 공용3파일 lint0을 통과했다. 발견 파일 redirects472/RSS382/llms315도구·45,715바이트다.

모든 TS writer 고정과 Chrome 종료 후 **06:44:29 KST, 여유4.29GiB, node --max-old-space-size=2048 node_modules/typescript/bin/tsc --noEmit 첫 실행 exit0·진단0**이다.33/34의 공통 타입이며36/37 미연결 준비도 포함한다. 해당 후속 기능 완료로 해석하지 않는다. [33차 기록](../2026-11-17-repeat-batch33/integration-checks.json).

현재 제품/공용 diff와 문서 링크 확인은 통합 기록에 남겼다. 저장소 전체 lint·운영 정적 export를 통과했다고 주장하지 않으며 빌드·배포·dev 재시작·커밋·푸시는 실행하지 않았다.
