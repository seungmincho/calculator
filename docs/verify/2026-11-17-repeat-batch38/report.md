# 38차 완료 — 공용 공유의 현재 결과·실패 복구

2026-11-17 KST. 기존 ShareResult의 현재 결과 snapshot·늦은 응답·실패 복구를 로컬 검증까지 완료했다. **작성자17그룹·독립7그룹·대표 소비자 Chrome5/5·최종 전체 타입 PASS**다. [계약](plan.md) · [통합 검사](integration-checks.json). 새 경로/메뉴/OG·패키지 없이 기존 공용 컴포넌트를 수정했으며 배포하지 않았다.

기존 card/url/text/fileName/className과 버튼 API를 유지하고 optional resultKey를 추가했다. 클릭 때 행까지 복제한 snapshot을 PNG·native file/text 공유·링크 복구가 함께 사용한다. 같은 의미의 새 props 객체는 진행 중 요청을 유지하고 결과·언어·기본 URL·새 요청·이탈 뒤 옛 renderer/자동 fallback/URL 생성/click/안내는 실행하지 않는다. A→B→A에서도 옛 요청을 되살리지 않는다.

저장 실패와 복사 실패를 구분하고, native 성공/legacy true만 성공으로 처리한다. 실패한 링크는 전체 readOnly 원문·선택·재시도·닫기로 복구한다. native AbortError는 추가 복사를 실행하지 않는다. 이미 클릭한 정상 다운로드 URL은 단순 입력 변경에도 유지하고30초 또는 언마운트에 한 번 정리한다. 안내는 파일 저장 완료가 아닌 다운로드 시작을 표현한다.

## 구현 및 독립 검토

[작성자 구현](implementation.md): 기존 실제 부모4개 동일 회귀+순수5+actual8 =17그룹, 제품2+검사2파일 lint0이다. 기본 URL만 바뀌어 늦은 요청을 버릴 때 pending도 해제한다. 의미값·resultKey·Strict replay·수동 복구·timer·download 실패와 소유 URL 정리를 확인했다.

[독립 검토](share-result-independent-review.md): 별도 기대값의 실제 ShareResult/actions7그룹·검사 JS lint0, 제품 수정 요청/미해결0. 실제 Blob/File bytes와 제어 renderer/Clipboard/native share를 사용했으며 실제 OS 창/PNG 픽셀과 구분했다.

## 실제 브라우저

[최종 리뷰](review-browser.md) · [결과 JSON](browser/final-results.json): **5/5 PASS**. 대표 소비자 /csat-grade/의 합성 점수를 사용했다. 최초 전체5개는06:18:08 KST, root가 기존 copyFailed의 주소창 복사 안내를 정확한 실패 안내로 바꾼 뒤 recovery·320 KO/EN 두 영향 흐름만 재검사해 **06:21:40 KST Chrome 종료**다. 새 사례로 합산하지 않았다. JS pageerror·hydration·원시 키0이다.

- 국어93점의 native Clipboard 현재 URL, 실제 csat-grade.png1080×1350·143,039바이트와 Canvas문구/PNG의93점·2026참고/2027실제 아님·CTA를 확인했다.
- 실제 toBlob을 실행한 뒤 callback만 보류해 입력 변경·URL-only 변경·SPA 이탈 뒤 늦은 다운로드/공유/fallback/URL 생성0을 확인했다.
- 제어 native file-share에 실제 PNG File145,920바이트와 현재 문구/URL을 전달했다. text-share·AbortError fallback0·renderer 저장 실패·같은 링크 복구도 통과했고 실제 OS 공유창 호출은0이다.
- 실제 수동 전체 선택·focus·native 재시도·닫기와 과거 거부/성공 timer를 확인했다. 320px 다크 KO/EN은16px/44px·넘침 없음이며 새 영어 PNG1080×1350·178,894바이트/영어 CTA도 확인했다.

최종 실패 안내는 KO 링크를 자동으로 복사하지 못했어요, EN Could not copy the link automatically이며 주소창을 대신 복사하라고 지시하지 않는다. 명시 share URL은 주소창과 다를 수 있어 보완했다. 문구만 바뀌었고 제품 TS는 그대로다. 실제 native Clipboard/Canvas/PNG와 제어 share/실패/늦은 callback, 차단한 외부 resource console 오류를 구분한다.

## 공용 통합·타입

shared canonical ko/en13leaf(신규12+기존 copyFailed1), ShareResult 정적26사용·오류0, 생성/check1,578파일·apply0·audit own540+child6/미해결0(기존 동적 알림60)을 확인했다. 공용 컴포넌트만을 이유로 모든 소비자의 menu updatedDate를 바꾸지 않았다.

31/32/38은 같은 전체 타입 실행을 공유한다. 06:21:58 KST 첫 시도(세션87442, 여유4.39GiB)는 미연결34 준비 유틸 numberToKoreanActions.ts:39 TS2774 한 건으로 실패했다. 함수 유무를 typeof로 명시한1줄을 수정하고 copy14그룹·기본 API 성공/부재·해당 lint0 후 다시 TS를 고정했다. Chrome 종료 상태에서 **06:24:34 KST, 여유4.36GiB, node --max-old-space-size=2048 node_modules/typescript/bin/tsc --noEmit 재검사 exit0**으로 끝났다. 현재 제품/브라우저 기능을 바꾸거나 반복 검사하지 않았다. 같은 결과는 [31차](../2026-11-17-repeat-batch31/integration-checks.json)·[32차](../2026-11-17-repeat-batch32/integration-checks.json)에서 연결한다.

원래 renderer의 폰트 대기·5행/픽셀·CPU는 유지한다. 끝나지 않는 native Promise의 자동 timeout, renderer 계산 중단, 이미 열린 OS 공유창/요청된 다운로드/제출된 Clipboard의 취소는 보장하지 않는다. 부모가 effect보다 앞선 입력을 정확히 공유하려면 명시 url과 resultKey를 제공해야 한다.33 연결은 이 계약을 따른다. 현재 제품/공용 diff·문서 링크 결과는 통합 기록에 남긴다. 빌드·배포·dev 재시작·커밋·푸시는 하지 않았다.
