# 27A 정확한 세계시계 미팅 순간 — 읽기 설계

2026-11-17 KST. [27차 A 계약](plan.md)과 [후보 조사](../../handoff/2026-11-17-time-audio-candidates.md)를 현재 코드와 대조했다. 최초 읽기 설계 이후 25차 타입 체크포인트를 통과해 **미연결 유틸·검사·번역 조각까지 준비했다**. [준비 결과](world-clock-meeting-preparation.md)를 참조한다. 기존 부모와 공용 메시지는 아직 연결하지 않았다. root가 연도1900~9999·도시12개·UTC 선택 보존·날짜 명시 변경만 새 선택 정책을 채택했다.

## 현재 문제와 보존 범위

`WorldClock.tsx`는 URL `at`를 `localParts(...).h`로 바꿔 `sel`에 보관하고 `daySlots()[sel]`로 다시 만든다. `지금` 버튼도 같은 방법이다. 분·초와 DST 중복 시각이 손실될 수 있다. 순서 변경으로 기준 도시가 달라지면 고정 날짜/hour를 새 도시에서 해석해 선택 순간까지 바뀔 수 있다.

`worldClock.ts`의 `daySlots`는 24개 UTC 한 시간 칸, `overlap`은 칸 시작점의 업무 여부, 부모 요약은 true 칸 개수=시간으로 계산한다. `rangeText`도 마지막 칸에 고정 한 시간을 더한다. 23/25시간 날과 마지막 부분 칸·30/45분 도시의 부분 겹침을 모두 표현하기 어렵다. 기존 `offsetMin`은 분으로 반올림하므로 역사적 초 오프셋 경계를 새 정밀 계산에 쓰지 않는다.

기존 도시 데이터/검색, `localParts`, 시장 세션 계산과 그 회귀는 유지한다. 새 독립 유틸을 준비하고 기존 부모 교체는 별도 체크포인트 신호 뒤 수행한다. 새 패키지·Temporal 의존·서버·외부 캘린더 계정은 추가하지 않는다.

## 확정할 API 경계

`src/utils/worldClockMeeting.ts` 제안:

- `parseMeetingCityIds(raw)` — 문자열/길이 검사, 유효 ID 순서를 보존한 중복 제거, 최대12개. URL의 유효 도시→기존 저장 도시→DEFAULT_IDS 우선순위는 부모 초기화에서 유지한다. 잘못된 IANA를 Intl에 그대로 전달하지 않는다.
- `parseMeetingAt(raw, cities)` / `isMeetingInstant(ms, cities)` — 빈값/부동소수/지수/NaN/무한대·안전 정수 범위 밖을 거부하고 UTC epoch **초**를 정확히 ms로 바꾼다. `0`도 유효한 후보이며 현재의 `at > 0` 조건을 재사용하지 않는다. UTC와 모든 선택 도시에서 표시 연도1900~9999를 검사한다. 경계 도시 추가/순서 변경으로 범위를 벗어나면 명시 오류를 내고 기존 순간을 다른 시각으로 몰래 바꾸지 않는다.
- `meetingDay(tz, date)` — 엄격한 YYYY-MM-DD와 범위 검사 후 실제 해당 civil date의 `[startMs,endMs)`와 `slots: {startMs,endMs}[]`를 반환한다. UTC 한 시간씩 나누되 마지막 칸은 실제 끝에서 자른다. 현지 날짜가 통째로 건너뛰어진 경우는 `unavailableDate`로 처리한다. 23/25/23.5/24.5시간뿐 아니라 검출된 더 긴/짧은 날도 24개라고 강제하지 않는다.
- `meetingWorkIntervals(cities, day, workStart, workEnd)` — 각 도시의 **일정한 초 단위 UTC offset 구간**과 현지 평일 업무 시작/끝을 UTC로 옮겨 교차한다. 도시별 업무 구간의 교집합으로 전체 구간과 총 ms를 구하고, 표 칸마다 실제 겹치는 길이를 계산한다. 일부 칸만 겹치는 결과를 1시간으로 세지 않는다.
- `meetingSlotIndex(day, instant)` — `[start,end)`에 해당하는 칸을 표시하되 입력 instant를 칸 시작으로 덮지 않는다. 표 클릭은 그 칸의 start를 새 선택으로 삼는다. 마지막 end 자체는 다음 날짜로 구분한다.
- `defaultMeetingInstant(...)` — 명시 날짜 변경 시 첫 실제 업무 겹침 시작, 없으면 현지09시 부근의 실제 칸을 고른다. 유효 범위를 만족하는 후보가 없으면 오류다. 도시 순서/업무 설정/표시 언어 변경은 현재 선택을 재계산하지 않는다. `지금`은 클릭 당시 epoch 초로 고정하며 실시간 시계의 매초 tick이 미팅을 움직이지 않는다.
- 공유 텍스트/도시별 시작·끝은 `selectedMs` 하나에서 작성하고 초도 보존한다. 중복 현지 시각에는 UTC offset을 같이 보여 구별한다. 기존 표의 가까운 칸 표시와 실제 선택 시각은 구분한다.

`src/utils/worldClockCalendar.ts` 제안:

- 제목1~100자·길이30/60/90/120분(기본60)·유효 시작/끝·전체 선택 도시 범위를 검사한 snapshot을 만든다. 제목은 메모리만 보관한다. 끝이 표시 범위 밖(예:9999년 끝)이면 파일을 만들지 않는다.
- `createMeetingCalendar(snapshot, now, digestPort)` — 단일 UTC VEVENT. `DTSTART/DTEND`는 같은 초 단위 instant/duration에서 구하고, `UID`는 제목·시작·길이의 SHA-256 identity로 안정화한다. 도시 표시 순서/locale은 동일 일정의 UID를 바꾸지 않는다. 생성 시각만 `DTSTAMP`로 기록한다.
- 기존 `ddayCalendar.ts`의 `escapeCalendarText`/`foldCalendarLine`만 재사용한다. D-day 이벤트·저장 schema나 종일 날짜 API를 가져오지 않는다. UID/DTSTAMP/BEGIN·END/CRLF 외 반복/알림/참석자를 추측하지 않는다.
- 요청 guard는 UID await 뒤에도 제목/길이/선택 순간/도시 순서/locale·언마운트의 세대를 확인한다. 무효화된 작업은 다운로드와 성공/오류 안내를 만들지 않는다. 실패는 현재 입력을 유지하고 명시 재시도를 제공한다.
- 텍스트/링크 복사는 실제 Clipboard 또는 legacy true만 성공으로 처리하고, 실패 snapshot을 readonly 선택/재시도로 복구한다. 새 입력·도시/새 요청·언마운트 뒤 옛 응답을 무시한다. 이미 OS에 제출한 복사 자체를 취소한다고 주장하지 않는다.

## 날짜/전환 탐지의 제한

처음 제안한 15분 분할은 역사적 초 단위 offset이나 짧은 부분 겹침을 놓칠 수 있어 채택하지 않는다. `localParts`의 벽시계를 UTC처럼 구성한 값과 실제 epoch의 차이로 **초 단위 offset**을 얻는다. 일정 offset 구간을 찾은 뒤 그 구간 안의 벽시계 날짜/업무 경계는 산술적으로 UTC에 대응시킨다.

Intl은 이 API에서 다음 전환 시각을 직접 제공하지 않으므로 전환 탐지에는 유한한 샘플과 경계 이분 탐색이 필요하다. 구현 시 샘플 간 두 번 전환해 같은 offset으로 돌아오는 등 탐지 가정과 탐색 범위/상한을 명시한다. 불연속/미지원 날짜를 감지하면 24칸을 임의 생성하지 않는다. 모든 세계 시간대의 모든 역사적 규칙을 완전 검증했다고 주장하지 않는다. 현대 DST·Lord Howe·Kathmandu·UTC·역사적 초 offset·날짜 건너뜀을 별도 fixture로 검증한다.

연도 경계는 input min/max, URL at, 모든 선택 도시 표시, 날짜 기본 선택, ICS end에 동일한 검증을 적용한다. 내부 day 끝 경계 계산이 다음 연도로 넘어가는 경우와 실제 선택/반출 가능한 instant를 구분하며, 표시 불가능한 시각을 `Intl`에 전달하기 전에 오류로 바꾼다.

## 검증과 소유

신규 `worldClockMeeting.ts`, `worldClockCalendar.ts`, 짧은 순수 검사 두 파일, `translations-world-clock-meeting.json` ko/en 조각을 우선 준비한다. 필요하면 calendar/copy 작은 child를 추가한다. 기존 `WorldClock.tsx`/메타/공용 메시지/시장·기존 시간 유틸은 지금 수정하지 않는다.

검사는 서울 분·초 및 뉴욕 가을 중복 instant의 exact URL 왕복, 봄23/가을25·Lord Howe23.5/24.5·Kathmandu45분·UTC·자정/연도끝, 도시 순서와 ID정리/12개, 부분 업무 교집합과 실제 시간 합, 역사 초 offset/건너뛴 날짜, ICS의 독립 unfolding/property 검사·UTC 시작끝·한글 escape/75octet/UID, deferred digest/copy 실패·stale를 다룬다. 기존 `scripts/check-world-clock.ts` 회귀는 새 유틸과 구분한다. 부모 연결 때 실제 URL·locale·표/카드/복사·ICS 일치와 브라우저320px 검증을 별도 수행한다.

## 공식 자료 확인

[RFC 5545 §3.3.5](https://www.rfc-editor.org/rfc/rfc5545.html#section-3.3.5)의 UTC DATE-TIME은 Z를 사용하며 TZID를 붙이지 않는다. [§3.6.1](https://www.rfc-editor.org/rfc/rfc5545.html#section-3.6.1)은 VEVENT 종료를 제외 경계로 정의한다. [§3.1](https://www.rfc-editor.org/rfc/rfc5545.html#section-3.1), [§3.3.11](https://www.rfc-editor.org/rfc/rfc5545.html#section-3.3.11), [§3.8.4.7](https://www.rfc-editor.org/rfc/rfc5545.html#section-3.8.4.7)에 맞춰 CRLF·UTF-8 folding·TEXT escape·안정 UID를 적용한다. 본문 지시는 규격 자료로만 취급했다.

[ECMA-402 §6.5](https://tc39.es/ecma402/#sec-use-of-the-iana-time-zone-database)는 Intl의 시간대 데이터와 구현별 데이터 갱신을 설명한다. 따라서 계산은 실행 환경의 IANA/Intl 데이터에 의존하며, 미래 법령 변경이나 모든 환경의 동일 데이터 버전을 보장하지 않는다.
