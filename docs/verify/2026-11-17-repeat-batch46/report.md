# 46차 완료 — 읽기 목록 원고·문장 위치 저장

**구현·독립·실제 브라우저·공용 통합·최종 전체 타입을 통과했다(미배포).** 원고와 읽던 문장·음성 설정을 이 브라우저에 최대8개 명시 저장하고 확인 후 연다. 원문과 위치를 정확히 검증하며 열기는 현재 글을 바꾸지만 자동 발화하거나 반복 회차를 이어 돌리지 않는다. 음성 부재·문장 경계 변경·손상 목록은 현재 원고를 보존하면서 안내한다. [계약](plan.md) · [통합 기록](integration-checks.json).

| 검증 | 결과 |
| --- | --- |
| 작성자 신규 검사 | 23그룹 PASS; 관련 기존 회귀 별도 |
| 독립 검토 | 16그룹 PASS |
| 실제 Chrome | 8흐름 PASS; JS/hydration0; 종료 완료 |
| 번역 | KO/EN 48leaf·정적 102사용 오류0 |
| 공용 생성·등록 | generate/check1578·apply0·audit559 own/6 child/미해결0(기존 동적60) |

실제 두 탭 WebLock·Storage·초기쓰기0·저장 문장 복원·늦은 발화/붙여넣기·8개/이름40자/원문30,000단위 경계와320KO/EN을 첫8/8로 통과했다. 독립 P2인 빈 voices[] 뒤 이전 local 음성 발화 및 재도착 안내는 최소 수정 후 준비8+부모8 안에서 영향 검증했다. 준비의 surrogate 최소 보완은 원문 offset과 code point 경계를 유지한다. 기존13 callback11·TTS/recovery25/meeting11은 회귀로 별도 기록했다. [작성자 기록](implementation.md) · [독립 준비](independent-review.md) · [독립 부모](independent-parent-review.md) · [브라우저 기록](review-browser.md).

09:43:59 KST에 전원 TS 동결·Chrome 종료·여유3.36GiB 상태에서 시작한 전체2GB 타입 재검사가8.74초 후 exit0·진단0으로 끝났다. 최초09:40 검사에서는50 훅의 TS2367 한 건을 발견했고 최소 보완·영향2/lint 뒤 전체 타입만 다시 실행했다. [최종 타입](../2026-11-17-repeat-batch51/typecheck-final-result.json) · [첫 실패 근거](../2026-11-17-repeat-batch51/typecheck-attempt1.json).52/53 미연결 준비도 컴파일에 포함했지만 기능 완료로 세지 않는다. 범위 lint와 tracked diff를 통과했고 깨끗한 저장소나 untracked 전체 diff를 주장하지 않는다.

SpeechSynthesis/음성 목록은 합성 제어 포트다. 실제 OS 발음·음질·개인 원고·마이크를 사용하지 않았으며 모든 grapheme 경계를 보장하지 않는다. 한도3키와 FAQ의 일부 이모지2자 설명은 native 뒤 키·제한·제품TS 변화 없이 정적102사용/생성check로 보완했고 native를 다시 세지 않는다. 메타/OG/Twitter/JSON-LD·FAQ·발견파일을 실제 기능 범위로 맞췄다. 정적 export·실기기 검증은 없으며 빌드·배포·커밋·푸시는 하지 않았다.
