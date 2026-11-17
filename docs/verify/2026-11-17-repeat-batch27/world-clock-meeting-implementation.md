# 27A 세계시계 정확한 미팅 순간·ICS 부모 연결

2026-11-17 KST. 26차 전체 타입 체크포인트 뒤 승인된 부모 연결을 완료했다. **제품 TS 안정, 자체 부모 검사·범위 lint PASS, 독립/브라우저 검증 인계 상태다.** Chrome·전체 tsc·build·배포·커밋을 실행하지 않았다.

## 변경

`src/components/WorldClock.tsx`에서 선택을 시간 칸 인덱스 대신 정확한 UTC epoch ms(초 정밀도)로 보관한다. hydration 이후 URL을 먼저 복원하고 그 뒤 도시 저장·URL 동기화를 시작한다. `at=0`과 범위 안 음수도 허용한다. 기존 유효 도시 ID 순서·저장 도시·기본값 우선순위를 유지하면서 중복/잘못된 ID/12개 초과를 정리한다. 잘못된 `at`는 오늘 기본 시각과 명시 안내로 복구한다. 실제 cities/at 변경의 popstate는 복원하되 자기 sync·query 순서·hash-only 이동은 private 제목/선택을 초기화하지 않는다. 기존 city resolver에서 UTC 도시 ID는 `Etc/UTC`이며 `UTC` 단독을 새 별칭으로 추가하지 않았다.

도시 추가/삭제/순서 및 업무 시간·실시간 시계 tick은 같은 선택 순간을 유지한다. 범위를 벗어나게 하는 도시 추가는 기존 목록/선택을 유지하고 오류로 알린다. 마지막 도시 삭제는 비활성화한다. 날짜를 명시 변경할 때만 첫 실제 업무 겹침 또는 오전9시 근처 칸으로 이동한다. 건너뛴 날짜·잘못된 날짜는 기존 순간을 보존하고 반출을 막는다. `지금`은 클릭 순간의 epoch 초를 선택한다.

표는 실제 civil day의 23/25/23.5/24.5시간 및 부분 마지막 슬롯을 사용한다. 선택 칸은 containing slot 표시일 뿐 분·초를 되만들지 않는다. 업무 겹침은 초 offset의 일정 구간과 평일 업무 경계 교집합이며 총 길이·각 칸의 실제 부분 길이·시작/끝을 함께 표시한다. 범위 밖 끝 경계는 표현 불가 안내를 표시하고 선택 가능한 시각으로 둔갑시키지 않는다. 반복 렌더에서 수백 개 시간/시차 라벨을 매초 다시 만들지 않도록 timeline 문자열을 메모화했다.

선택 결과·공유 카드·텍스트/링크 복사·도시별 ICS 시작/끝은 초와 UTC 시차를 표시한다. KO/EN 도시명·요일을 사용한다. 선택 결과 카드에 `scroll-mt-20`, planner 입력 상단에 초를 유지하는 MobileResultLink를 추가했다. 새 시간표 칸·도시 이동삭제·입력·반출은44px/16px·토큰·모바일1열을 사용한다. 시장 개장 계산 helper는 수정하지 않았다.

일정 제목1~100자와 길이30/60/90/120분(기본60)을 받아 명시 클릭으로 `toolhub-world-clock-meeting.ics`를 생성한다. 제목은 메모리만 보관한다. 한 UTC VEVENT·안정 SHA-256 UID·DTSTAMP·CRLF·escaping/folding은 준비된 helper를 재사용한다. 제목 빈칸이나 시작/끝 범위 오류는 현재 내용과 함께 남긴다. 실제 download 요청을 저장 완료로 표현하지 않는다.

copy/calendar의 각각 최신 요청 + 공통 입력 세대 + alive/identity guard를 사용한다. 입력·도시·업무·선택·locale·언마운트 뒤 옛 digest/copy 완료는 반출이나 성공 안내를 만들지 않는다. locale를 바꿨다가 되돌려도 이전 작업을 부활시키지 않는다. Clipboard/legacy true만 복사 성공이며 실패 시 정확한 readOnly snapshot·전체 선택·재시도를 제공한다. URL/저장소에는 원문 제목이나 파일 내용을 추가하지 않는다.

## 파일·선택자

- 부모: `src/components/WorldClock.tsx`
- 준비 유틸: `src/utils/worldClockMeeting.ts`, `worldClockCalendar.ts`, `worldClockActions.ts` (부모 연결에서 계산 변경 없음)
- 자체 검사: `scripts/check-world-clock-meeting.ts`, `check-world-clock-calendar.ts`, 신규 `check-world-clock-components.mjs`
- 번역: `translations-world-clock-meeting.json`, ko/en53키·placeholder 대조 PASS. canonical/메타는 통합 담당 소유.

`[data-world-selected-ms]`는 정확한 epoch ms다. 도시 결과 `[data-world-selected-city=id]`, 날짜 `[data-world-date]`, 업무 `[data-world-work=start|end]`, 현재시각 `[data-world-now]`, 이동 `[data-world-move="id:up|down"]`, 삭제 `[data-world-remove=id]`를 사용한다. 각 시간 칸은 `[data-world-slot-city=id][data-world-slot=index]`와 `data-world-slot-ms/duration/overlap-ms`를 제공한다. `data-world-day-ms`, `data-world-overlap-total/start/end`는 실제 구간 ms다.

일정은 `[data-world-event-title]`, `[data-world-duration]`, `[data-world-calendar-download]`, `[data-world-calendar-status]`. 복사는 `[data-world-copy=line|share|link]`, `[data-world-copy-recovery]`, `#world-clock-copy-manual`. 모바일 결과 타깃은 `#world-clock-selected`다.

## 검사

1. 준비 계산10 + ICS/actions8 = **18그룹 PASS** 기록을 보존한다. 계산/파일 유틸을 부모 연결에서 변경하지 않아 전체 반복하지 않았다.
2. `node scripts/check-world-clock-components.mjs` — **실제 부모8그룹 PASS**. hydration-before-sync·URL우선·도시순서·tick/지금·ShareResult/모바일초요약; 뉴욕중복시각 두순간·23/25·Lord Howe반시간; Kathmandu45분/파리1900초offset 업무경계; 잘못된 URL·epoch0·12개/건너뛴날짜/엄격날짜/연도끝; 실제 Node WebCrypto·Blob ICS/escape/fold/UID·도시/locale·title비저장; 늦은digest 입력/도시/locale왕복/unmount 무효화; 복사false/manual/retry/late응답; hash-only/외부URL 복원을 확인했다.
3. 위 첫 실행의 UTC 표 fixture가 기존 city ID 규칙과 맞지 않아 `UTC`→`Etc/UTC`로 고쳤다. 제품 결함으로 분류하거나 resolver 범위를 확대하지 않았다. 최종8그룹 및 MobileResultLink/12개 상한 영향 검사는 모두 통과했다.
4. `node scripts/check-world-clock.ts` — 기존 시간·시장 helper 회귀 PASS.
5. `npx eslint src/components/WorldClock.tsx scripts/check-world-clock-components.mjs` — exit0, 오류/경고0. 준비3유틸/2검사의 scoped lint도 이전 체크포인트에서 통과했다.

부모 fixture는 실제 TSX/helper를 실행하고 hooks·DOM·FileReader와 무관한 Clipboard/crypto 포트를 제어한다. 실제 Node WebCrypto 생성 파일을 검사하며 브라우저 native 다운로드/Clipboard/레이아웃·hydration 콘솔은 전담 실제 브라우저 결과와 구분한다.

## 정확성 범위와 다음 검증

30분 간격 offset 확인 후 검출된 전환을 초 단위 이분 탐색한다. 한 구간 안에 두 번 바뀌어 원래 offset으로 돌아오는 역사적 전환은 탐지되지 않을 수 있다. 실행 환경의 IANA/Intl 데이터에 의존한다. 이 한계를 UI에도 표시했으며 전 세계 역사 규칙·미래 법령·기존 시장 계산 정확성을 새로 검증했다고 주장하지 않는다.

[공식 RFC/ECMA 근거와 준비18그룹](world-clock-meeting-preparation.md)을 유지한다. 독립 검토 담당 taxi와 실제 브라우저 담당 verify에게 final ready/API를 전달하고 발견 대응을 우선한다. 모든 담당 TS 안정·Chrome 종료 후 전체 타입 검사는 통합 담당이 수행한다.

후속 수신: taxi의 [독립 검토](world-clock-independent-review.md) **9그룹 PASS·검사 lint0**, 추가 수정 요청 없음. 별도 Intl membership/longOffset/weekday oracle·ICS parser와 실제 부모 경합을 확인했으며 자체8그룹과 구분한다. 제품 TS 변경 없이 안정 상태를 유지한다.
