# 27A 세계시계 미팅 — 미연결 준비 체크포인트

2026-11-17 KST의 미연결 준비 기록이다. 이후 26차 체크포인트 통과와 부모 연결 승인을 받아 [부모 구현 결과](world-clock-meeting-implementation.md)까지 완료했다. 아래 18그룹과 순수 API는 당시 준비 증거이며 현재 UI·최종 번역·검증 상태는 구현 결과를 따른다.

## 준비 파일과 API

- `src/utils/worldClockMeeting.ts`: 도시 ID 순서/중복/12개·URL 우선순위, 정확한 epoch 초, UTC와 모든 도시의 1900~9999 범위, 실제 civil day 및 부분 마지막 슬롯, 초 offset 전환 구간과 평일 업무 교집합, 정확한 선택/URL/초 표시 공유 텍스트.
- `src/utils/worldClockCalendar.ts`: 제목 1~100자·30/60/90/120분·시작/끝 도시 범위 projection. 한 UTC VEVENT, 안정 SHA-256 UID, DTSTAMP, CRLF·TEXT escaping·UTF-8 75octet folding. 기존 D-day의 escaping/folding만 재사용한다.
- `src/utils/worldClockActions.ts`: copy/calendar 각각 최신 요청과 공통 입력 세대 guard. 실제 Clipboard/legacy true만 성공, 읽기/digest 대기 후 무효 작업은 다운로드하지 않음. 다운로드 파일명은 `toolhub-world-clock-meeting.ics`.
- `translations-world-clock-meeting.json`: ko/en 각 45개 키·placeholder 일치. 새 UI가 아직 없어 canonical 병합이나 정적 사용 완료를 주장하지 않는다.

## 실행 증거

- `node scripts/check-world-clock-meeting.ts`: 10그룹 PASS. 서울 분·초, 뉴욕 중복 시각 두 instant, epoch 0/음수, 도시 순서, 연도 양 끝, 23/25시간, Lord Howe 23.5/24.5시간, Kathmandu 45분, Apia 날짜 건너뜀, Kwajalein 47시간, 파리 1900년 +00:09:21 및 업무 경계 초를 대조했다. 마지막 guard 변경 후 영향 10그룹 재확인했다.
- `node scripts/check-world-clock-calendar.ts`: 8그룹 PASS. 독립 unfolding/property/UTC parser와 실제 Node WebCrypto로 파일·escaping·안정 UID·연도 끝·click snapshot을 확인했다. deferred digest/copy의 stale·새 요청·legacy false·실패 복구 포트를 포함한다.
- `node scripts/check-world-clock.ts`: 기존 세계시계 회귀 PASS.
- 신규 유틸 3개/검사 2개의 scoped eslint PASS. 마지막 meeting guard 영향 2파일 재검사도 exit 0.
- ko/en JSON 키·placeholder 대조 45개 PASS.

측정 예시는 Lord Howe 실제 날짜와 12개 도시 업무 교집합을 합쳐 이 Node 실행 환경의 warm cache에서 약 **5ms**였다. 브라우저 성능 보장이나 전체 역사 시간대 검증 결과로 해석하지 않는다.

## 제한과 부모 연결 시 남은 작업

Intl에는 다음 전환 API가 없어 30분 간격 offset 검사 후 감지된 경계를 초 단위 이분 탐색한다. **한 검사 구간에 전환이 하나 이하라는 가정**이며 30분 안에 원래 offset으로 돌아오는 두 전환은 탐지하지 못할 수 있다. 데이터 버전도 실행 환경의 IANA/Intl에 의존한다. 내부 day 끝 계산은 1899/10000 인접 경계를 제한적으로 탐색하지만 실제 선택/공유/ICS 시작·끝은 1900~9999 및 모든 선택 도시를 검사한다.

부모 연결 때 선택 instant를 날짜/도시 순서/실시간 tick에서 몰래 재생성하지 않고, 명시 날짜 변경만 새 기본 선택으로 처리해야 한다. 기존 `hm/shareLine`의 분 표시를 그대로 쓰지 말고 선택·복사·ICS·겹침 시작/끝의 초를 일치시킨다. 슬롯 하이라이트와 실제 선택 순간을 구분한다. URL hydration/외부 변경·초/중복 시각·locale·copy 수동 선택·ICS·320px은 실제 부모/브라우저 단계에서 검증한다. 전체 tsc·Chrome·build·배포는 실행하지 않았다.

## 공식 근거

[RFC 5545 UTC DATE-TIME](https://www.rfc-editor.org/rfc/rfc5545.html#section-3.3.5), [VEVENT 종료 제외 경계](https://www.rfc-editor.org/rfc/rfc5545.html#section-3.6.1), [줄 folding](https://www.rfc-editor.org/rfc/rfc5545.html#section-3.1), [TEXT escaping](https://www.rfc-editor.org/rfc/rfc5545.html#section-3.3.11), [UID](https://www.rfc-editor.org/rfc/rfc5545.html#section-3.8.4.7)를 적용했다. [ECMA-402 시간대 데이터](https://tc39.es/ecma402/#sec-use-of-the-iana-time-zone-database)에 따라 환경별 데이터 차이를 제한으로 명시한다.
