# 8차 실행 계약 — 장기 계획 첫 묶음

2026-11-16. 상위 큐: `docs/handoff/CONTINUOUS-IMPROVEMENT-PLAN.md`의01~03. 기존3도구 개선이며 새경로·모델·외부 계정에 쓰기는 없다.

| 담당 | 범위와 소유 파일 | 검증 기준 |
|---|---|---|
| taxi_repeat | ImageResizer.tsx, ImageResizeProfiles.tsx, utils/imageResizeProfiles.ts, check-image-resize-profiles.ts, translations-image.json | 설정10개/이름40자, 원본미저장, 지원출력형식, 실제출력크기·형식, 저장실패/손상/충돌, URL입력보존 |
| gpa_scenarios | DdayCalculator.tsx, DdayCalendarExport.tsx, utils/ddayCalendar.ts, check-dday-calendar.ts, translations-dday.json | 현재1개/선택저장일정 최대100개, 종일DATE 일정, 다음날exclusive end, UTF8행접기/줄바꿈이스케이프, stableUID, 실제ics내용검사 |
| writing_versions | PomodoroTimer.tsx, PomodoroGoalPanel.tsx, utils/pomodoroGoal.ts, check-pomodoro-goal.ts, translations-pomodoro.json | 목표1~20회, 완료집중횟수기준, 휴식/skip제외, 날짜별최근7일CSV/일자합산, 기존타이머·통계보존 |
| batch5_verify | check-repeat-batch8-browser.mjs, browser/, review-browser.md | 3도구 핵심/실패/회귀/모바일 검증과 다운로드 파일내용 확인 |
| batch5_integrate | 공용messages원본·생성물, menu/page설명, 보고서/큐/NEXT-SESSION | 번역병합·metadata·RSS·타입검사·실제검증결과·다음착수상태 |
| root | 전체우선순위와다음작업기획, 위임·제품판단 | 기존미커밋작업보존,중복구현방지,미해결결함먼저처리 |

제품담당은 자기UI와ko/en번역을함께작성하고 원본messages는통합담당만쓰기. 전체tsc/build/dev/git변경은제품담당이실행하지않는다. 빌드·배포·커밋·푸시는이번범위에없다.

## 세부 결정

- 이미지: 출력 설정만 수동 저장/불러오기. URL 공유값을 자동으로 덮지 않음. 사진 파일·파일명·크롭 위치는 프로필에 넣지 않음. 기존 기본 프리셋·cm/DPI 입력·ZIP·개별 다운로드 유지. 기기가 지원하지 않는 WebP는 적용을 막고 안내. 전형적인 프리셋 불러오기에 불필요한 확인 모달을 추가하지 않음.
- D-day: 외부 캘린더에 직접 등록하지 않고 사용자가 파일을 내려받아 가져온다. 반복 일정·알람·음력 반복 추정은 이번 범위 밖. 날짜/제목 오류는 잘라서 성공시키지 않음. RFC5545를공식원문으로확인하고출처/적용규칙을보고서에남긴다. 저장목록불량으로화면이깨지거나원본을덮는경계가보이면기존파일내최소보호를보완한다.
- 포모도로: 기존 `pomodoro-daily-stats`의완료집중횟수를그대로사용한다. 목표는총집중시간추정이나현재진행분을완료로포함하지않음. 목표변경은타이머를멈추거나초기화하지않음. 최근7일내보내기에는할일개인내용을넣지않음. 통계상태파싱과손상/저장실패가무시되던경계는최소보완하되타이머전체리팩터링하지않는다.

## 진행과 재개

각담당은 storage/API·UI라벨·검증명령을공유한다. 번역통합후브라우저검증 → 필요한수정 → 브라우저종료 → 전체tsc단독 → 최종기록순서다. 다음묶음은상위큐04~06이며8차미해결결함을먼저처리한다.
