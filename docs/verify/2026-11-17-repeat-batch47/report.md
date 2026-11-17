# 47차 완료 — 문서 변경 구간 선택 병합

**구현·독립·실제 브라우저·공용 통합·최종 전체 타입을 통과했다(미배포).** 마지막 성공 비교의 변경 구간마다 원본 유지 또는 수정본 반영을 골라 별도 병합 문서를 만든다. 양쪽 입력·저장 원고를 덮어쓰지 않으며 기본 선택은 원본 유지다. Worker 응답을 실제 요청 원문과 대조하고, 전체 복사/TXT는 미리보기의 생략과 관계없이 LF 정규화·끝 개행·빈 줄을 보존한다. [계약](plan.md) · [통합 기록](integration-checks.json).

| 검증 | 결과 |
| --- | --- |
| 작성자 신규 검사 | 28그룹 PASS; 관련 기존 회귀 별도 |
| 독립 검토 | 17그룹 PASS |
| 실제 Chrome | 기본8+앵커 영향1흐름 PASS; JS/hydration0; 종료 완료 |
| 번역 | KO/EN 52leaf·정적 108사용 오류0 |
| 공용 생성·등록 | generate/check1578·apply0·audit559 own/6 child/미해결0(기존 동적60) |

기본 native8과 긴 비교 표에서 병합 패널로 이동하는320KO/EN anchor 영향1을 통과했다.0바이트·정확히2,097,152바이트 TXT,600행·블록/결과 페이지, 실제 Worker·Clipboard·원고 새 탭 전달을 확인했다. 독립 P2인 pending 전달이 선택/반출5동선을 덮는 경계는 userAction 연결 후 raw/현재 선택 보존으로 해결했다. 최초 native 실패2건은 전체 복구를 명시 열어야 하는 단계를 누락한 검증기만 수정했다. [작성자 기록](implementation.md) · [독립 core/output](independent-core-review.md) · [독립 부모](independent-parent-review.md) · [브라우저 기록](review-browser.md).

09:43:59 KST에 전원 TS 동결·Chrome 종료·여유3.36GiB 상태에서 시작한 전체2GB 타입 재검사가8.74초 후 exit0·진단0으로 끝났다. 최초09:40 검사에서는50 훅의 TS2367 한 건을 발견했고 최소 보완·영향2/lint 뒤 전체 타입만 다시 실행했다. [최종 타입](../2026-11-17-repeat-batch51/typecheck-final-result.json) · [첫 실패 근거](../2026-11-17-repeat-batch51/typecheck-attempt1.json).52/53 미연결 준비도 컴파일에 포함했지만 기능 완료로 세지 않는다. 범위 lint와 tracked diff를 통과했고 깨끗한 저장소나 untracked 전체 diff를 주장하지 않는다.

큰 입력의 전체 복구 열기/선택959ms와 heartbeat 최대476ms를 관측했다. 지연이 없다는 보장은 아니며 Playwright/layout 포함 벽시계 수치다. 표준 patch·3-way merge 기능이 아니다. KO 조사2문구와 실제 Use modified 라벨 일치는 문구 후속으로 구분했고 anchor는 별도 실제 영향1로 검증했다. 메타/OG/Twitter/JSON-LD·FAQ·발견파일을 실제 기능 범위로 맞췄다. 정적 export·실기기 검증은 없으며 빌드·배포·커밋·푸시는 하지 않았다.
