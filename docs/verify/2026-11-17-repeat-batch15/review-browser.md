# 15차 독립 브라우저 검증

최종 **8/8 PASS**, JavaScript·hydration 오류 **0건**. 2026-11-17 00:26 KST(2026-11-16 15:26 UTC)에 마지막 영향 사례를 확인하고 Chrome을 종료했다. 통합 담당에게 전체 타입 검사 가능 시점을 알렸다.

기존 `http://127.0.0.1:3039` 서버와 Chrome 한 개를 순차 사용했다. 각 사례는 새로운 격리 컨텍스트에서 실행했고 외부 요청·서비스 워커를 차단했다. 검증용 점수·답안·체크리스트만 사용했으며 제품 파일, 기존 서버와 실사용 데이터는 변경하지 않았다. 빌드·배포·Git·전체 타입 검사는 이 담당 범위에서 실행하지 않았다.

실행 스크립트: [check-repeat-batch15-browser.mjs](../../../scripts/check-repeat-batch15-browser.mjs). 최종 집계: [browser/final-results.json](browser/final-results.json). 최초 실패 기록은 원인 추적을 위해 보존했고 최종 집계는 사례별 가장 최근 실행을 사용한다.

| 사례 | 확인한 동작 | 결과 |
| --- | --- | --- |
| 등급 기준·계산 | 2026 참고 추정/2027 실제 성적 아님, 영어·한국사 절대평가를 상단·결과·입력·표에서 구분. 6과목 경계 점수, 입력 상하한, 기존 평균·수능최저 합, 표 열 구분과 페이지 메타/OG 확인 | PASS |
| 등급 공유 | 6점수·선택과목·최저 기준을 담은 URL 최초 방문 및 복사 링크 새 탭 복원, 구형 영어 링크 호환. 실제 PNG 다운로드와 canvas 문구, 공유 텍스트의 연도·추정·절대평가 대조 | PASS |
| 등급 모바일 | 320px 다크 첫 화면의 계산 기준, 결과 카드와 입력/선택 필드 16px·44px, 페이지 가로 넘침 없음 | PASS |
| D-2·공식 안내·연습 | 2026-11-17 KST 주입, 08:10 입실과 공식 직접 링크/확인일, 기존 시간표 연습 시작·종료. 메타/OG와 공식 출처 문단 일치 | PASS |
| 시험 당일 경계 | KST 08:39:59→08:40 시작, 10:00 쉬는 시간과 다음 수학 30분, 14:50 4교시 107분, 17:45 종료·등급 계산 진입 | PASS |
| 저장·인쇄 | 준비물 2개, 국어 답·선택과목, 수학 단답형 123/999·미적분을 저장하고 재방문 복원. 인쇄 버튼 호출, 인쇄 전용 7과목 DOM과 실제 Chrome PDF 생성, 저장 내용 유지 | PASS |
| ICS·응원 공유 | 실제 ICS 10개 일정과 수능/성적통지 날짜·정시 접수 종료일의 다음 날 DTEND 확인. 시험 다음 날 재방문 시 지난 수능을 제외한 9개. 응원 이름 복사 링크 새 탭 복원 | PASS |
| D-day 모바일·타이머 | 320px 다크 첫 화면에 08:10·D-2, 4개 시간 숫자 한 줄과 영역 넘침 없음. 6개 과목 링크 80/100/70/30/30/40분을 기존 타이머에서 복원하고 자동 실행 없음. 답안 입력 16px·44px, 링크 44px | PASS |

## 발견과 수정 확인

1. **공유 URL hydration 불일치 — 제품 수정 후 해결.** 비기본 점수 URL의 서버 평균 2.25등급과 최초 클라이언트 평균 1.25등급이 달랐다. 복사 링크 새 탭에서도 반복됐고 구형 영어 링크는 2.00등급과 불일치했다. GPA 담당이 서버/첫 클라이언트 기본 상태를 맞추고 hydration 후 URL을 한 번 복원하며 그 전 URL 동기화를 막았다. 공유 사례만 재실행해 입력·선택·계산·PNG·공유와 오류 0을 확인했다. 근거: 최초 `results-csat-grade.json`, 최종 `results-csat-grade-share.json`.
2. **320px 카운트다운 숫자 줄바꿈 — 제품 수정 후 해결.** 기능 검사를 통과한 화면을 직접 보니 20·40·00이 두 줄로 나뉘었다. D-day 담당이 모바일 카드 여백·숫자 크기와 줄바꿈 방지를 보완했다. 모바일 사례에 텍스트 범위의 한 줄/폭 검사도 추가하여 재실행하고 최종 캡처를 직접 확인했다. 근거: `results-dday-mobile.json`, `csat-dday-320-dark-top.png`.
3. **초기 D-2 중복 선택 — 테스트 오류.** 대표 결과와 일정 배지에 동일 문구가 있어 strict selector가 실패했다. `.ui-hero` 범위로 한정하고 영향받은 4개만 다시 실행했다. 제품 변경은 필요하지 않았다.

## 주요 산출물과 직접 시각 확인

- [320px 등급 첫 화면](browser/csat-grade-context-320-dark-top.png), [등급 결과](browser/csat-grade-result-320-dark.png)
- [320px D-day 첫 화면](browser/csat-dday-320-dark-top.png), [과목별 연습 링크](browser/csat-practice-links-320-dark-panel.png)
- [실제 공유 PNG, 1080×1350](browser/csat-grade-basis.png), [canvas 문구 기록](browser/csat-grade-canvas-text.json), [공유 메타](browser/csat-grade-share-metadata.json)
- [인쇄 전용 화면](browser/csat-answer-print.png), [Chrome 인쇄 PDF](browser/csat-answer-sheet.pdf)
- [수능 일정 ICS](browser/csat-2027-schedule.ics), [시험 다음 날 남은 일정 ICS](browser/csat-remaining-schedule.ics)
- [공식 링크](browser/csat-official-source-links.json), [타이머 링크와 분 값](browser/csat-subject-timer-links.json), [등급 메타](browser/csat-grade-metadata.json), [D-day 최종 메타](browser/csat-dday-metadata.json)

공유 PNG는 실제 canvas 렌더링과 다운로드를 사용했다. `fillText` 기록은 원래 그리기 호출을 그대로 실행하면서 문구만 수집했다. 클립보드 복사/읽기는 Chrome API를 사용했고, 운영체제 공유 창은 `navigator.share` 대체 함수로 전달된 텍스트·URL을 확인했다. 인쇄 버튼은 호출을 기록하고 Chrome 인쇄 미디어/PDF를 별도로 생성했다. 실제 프린터 출력이나 외부 캘린더 등록은 하지 않았다.

320px 검사는 데스크톱 Chrome의 좁은 뷰포트이며 실제 모바일 기기 검증을 대체하지 않는다. `language=en` 설정에서도 동작·원시 키 노출과 ko/en 신규 구조를 확인했지만 공통 도구 번역 레지스트리가 한국어를 사용하는 기존 제약 때문에 도구 본문의 영어 전환 완료로 기록하지 않는다. 일부 공통 내비게이션은 영어로 표시된다.

공식 자료의 사실 대조는 [독립 검토](independent-review.md)의 출처와 구분한다. 이 검증은 로컬 화면·상호작용·산출물의 일치를 확인했으며 전년도 상대평가 수록표의 모든 수치를 새로 인증하거나 검색 색인·배포 완료를 주장하지 않는다.
