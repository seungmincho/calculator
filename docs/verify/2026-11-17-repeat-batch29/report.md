# 29차 팀 편성 이력·결과 반출 통합 보고서

2026-11-17 KST. **완료: 자체23·독립14그룹, 실제 Chrome7/7, 공통 전체 타입·번역·범위 lint/diff·문서 검사 통과.** [CSV 성능 후속](../2026-11-17-repeat-batch26/report-performance.md)과 전체 타입 체크포인트를 공유하며 각각의 기능·검사 수는 분리한다. 이 완료 범위에 미연결28/30 준비나 별도35 PWA 보완을 합산하지 않는다.

## 변경한 동작

기존 /team-divider/의 이동·교환·고정·재편성을 past/present/future 합계20단계로 되돌리기·다시 실행한다. 팀별 순서·고정·결과 방식·직전 동료 비교를 복원하며 현재 실력값과 다음 편성 방식은 유지한다. 실제 새 편집만 redo를 폐기하고 기존 명단/참석/팀 수/저장 복원/새 주장 선택의 초기화 정책을 유지한다. 공개·주장 선택 중 이력을 실행하지 않고 이전 보드의 callback이 새 상태를 덮지 못하게 한다.

현재 편성의 같은 텍스트를 복사하거나 고정 파일명 team-divider.txt의 UTF-8 TXT로 받는다. native/legacy 실제 성공만 성공으로 표시하고 실패 시 전체 읽기 전용 원문·선택·재시도를 제공한다. 기존 알고리즘·명단/백업 schema·명시 공유 링크 형식을 유지하며 새 저장소·참가자 포함 파일명을 추가하지 않는다. 이미 OS에 제출한 복사 쓰기 취소는 보장하지 않는다. [계약](plan.md) · [구현 보고서](team-history-implementation.md).

## 자체·독립 검토와 해결한 경계

자체 준비 domain12+복구 child2+실제 부모/보드9=**23그룹 PASS**, 관련 기존 회귀6개와 범위9파일 lint 오류·경고0이다. [root 순수6그룹](team-history-independent-review.md)과 [별도 실제 부모8그룹](team-parent-independent-review.md), 합계**14독립 그룹 PASS**·검사 lint0이다. 작성자 assertion과 독립 oracle을 중복 집계하지 않았다.

root 읽기 검토에서 StrictMode cleanup이 epochRef만 증가시켜 state와 어긋나는 경계를 찾았다. 작성자가 실제 effect replay에서 첫 편성0명≠6명으로 재현하고 cleanup 증가 한 줄을 제거했다. mounted/reveal/copy/URL 정리는 유지했다. 독립 부모는 effect replay3회와 실제 cleanup 뒤 옛 편성·복사·TXT handler 차단까지 확인했고, 실제 Next 개발 StrictMode 브라우저에서도 첫 편성과 공유 결과 편집·복사가 통과했다. 추가 미해결 제품 결함은 없다.

## 실제 브라우저

[브라우저 보고서](review-browser.md) · [최종 결과](browser/final-results.json): **7/7 첫 실행 PASS**, checkedAt2026-11-16T20:26:03.173Z(05:26:03 KST). pageerror/hydration/unhandled/원시 키0, 최종 Chrome 종료. 표 안 세부 확인을 별도 테스트 수로 더하지 않는다.

- 실제 dragTo 이동·선택 교환·고정·회전 메타를 undo/redo로 복원했다. 별도 pair 계산과 반복2쌍 표시가 일치했다.
- 고정22회 뒤20개 한도, undo20/redo20, no-op 보존·새 편집 분기, 현재 실력/다음 방식과 결과 방식 분리를 확인했다.
- Enter undo 후 소진 시 redo focus, Space redo 후 undo focus를 확인했다. 이름 input의 Ctrl+Z는 원문만 복원하고 이력을 바꾸지 않았다.
- 참석·저장 명단6명/참석자5명·공유 새 탭·팀 수 변경, 주장 완료 seed·옛 pick과 공개 tick/skip을 확인했다.
- 실제 native Clipboard와 **159byte UTF-8/noBOM TXT**가 독립 문자열과 일치했다. 새 반출의 URL/저장소/요청/콘솔 추가 기록0, 오래된 성공/거부·legacy false/true·수동 선택·닫기도 확인했다.
- 320px 다크 KO/EN에서 overflow0·입력16px·주요 버튼44px, 언어 전환 후 입력/보드/이력 보존을 확인하고 패널 캡처를 직접 검토했다.

거부/지연/timer/legacy true는 제어 fixture이며 실제 OS 한글 IME나 모든 기기 초점을 인증하지 않는다. 기존 공유 링크에는 이름과 실력이 포함되고, 비저장 설명은 이번 copy/TXT가 추가 저장·전송하지 않는 범위다. service worker와 외부 광고/폰트/통계 요청을 차단한 브라우저 환경이다.

## 공용 통합·전체 타입

canonical ko/en **14leaf**를 병합하고 3컴포넌트 정적116사용·오류0을 확인했다. messages:check **1578파일**, namespace apply0, audit534 own+6 child/미해결0(기존 동적 알림60)이다. 생성물은 스크립트로만 갱신했다.

page.tsx는 decisionMetadata를 호출하므로 src/config/decisionTools.ts의 해당 항목에서 description/OG/Twitter/JSON-LD·intro/FAQ를 통일했다. 다른 결정 도구 항목은 보존했다. 메뉴 updatedDate2026-11-17, ko/en showcase/guide를 이력·TXT/복구로 갱신하고 기존 무제한 인원·항상 균등 단정도 실제200명/고정 예외로 정리했다. 공용4파일 lint0, redirects472/RSS382/llms315도구·45,587bytes. 새로운 route·OG 이미지·패키지는 없다.

**공통 전체 tsc 첫 실행 exit0**: 2026-11-17 05:26:25 KST 시작, os.freemem4.65GiB, `node --max-old-space-size=2048 node_modules/typescript/bin/tsc --noEmit`. CSV+29 및 고정된 미연결28/30 준비 TS까지 포함했다. Chrome 종료와 전원 TS 고정을 확인한 뒤 단독 실행했으며 재실행하지 않았다. [통합 상태](integration-checks.json)와 [CSV 공통 근거](../2026-11-17-repeat-batch26/integration-performance-checks.json)는 같은 실행을 가리킨다.

제품·공용 코드와 최종 문서 범위 diff exit0, 보고서/인계7문서의 상대 링크167개·누락0을 확인했다. 빌드·export·배포·dev 재시작·커밋·푸시는 실행하지 않았다.
