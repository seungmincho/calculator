# 17B 음력 기념일 캘린더 — 구현 준비 기록

2026-11-17 KST. 담당 `/root/taxi_repeat`. 16차 체크포인트 통과 후 root 지시에 따라 부모 연결까지 완료했다. 공용 번역 병합과 독립/브라우저 검증을 통과했다. 배포 완료를 뜻하지 않는다.

## 구현 범위

- `src/utils/lunarAnniversaryCalendar.ts`: 제목 최대 100자, 중복 없는 음력 연도 1~11개를 검증한다. 원 음력 월·일·윤달 여부와 각 선택 연도를 기존 `lunarAnniversary()`에 전달해 다시 계산한다.
- `src/components/LunarAnniversaryCalendar.tsx`: 기존 연도표 아래 연결할 보조 패널이다. 기본 접힘, 제목은 빈칸, 연도는 미선택으로 시작한다. 제목 입력과 명시 연도 선택 후 내보낸다. 연도마다 계산된 양력 날짜·윤달/30일 대체·지난 날짜를 표시한다. 범위 밖 후보는 선택 불가로 보이며 날짜를 만들어 내지 않는다.
- `scripts/check-lunar-anniversary-calendar.ts`: 도메인 15개 그룹.
- `translations-lunar.json`: `lunarConverter.calendarExport` ko/en 조각. 공용 메시지는 통합 담당만 병합한다.

기존 `lunarCalendar.ts`, `ddayCalendar.ts`와 공용 파일은 변경하지 않았다. 부모 `LunarConverter.tsx`에는 import, 기존 연도표 시작 연도 반환, 연도표 아래 자식 연결, 모바일 열/최소 폭/입력 크기만 반영했다. 새 경로·패키지·저장소·외부 캘린더 쓰기는 없다.

## API와 날짜 경계

`selectLunarCalendarOccurrences(spec, lunarYears)`는 `spec={month,day,isLeap}`를 엄격히 검사하고 선택 연도를 오름차순으로 반환한다. 입력 배열은 수정하지 않는다. 반환값에는 기존 `Occurrence`의 원 음력 연도·양력 날짜·대체 여부와 ISO `date`, 배타적인 다음 날 `endDate`가 있다. 잘못된 연도, 중복, 빈 선택 또는 변환 불가 날짜가 하나라도 있으면 전체 선택을 거부한다.

`createLunarAnniversaryCalendar({...spec,title,lunarYears}, describe, now?)`는 제목을 검증하고 `describe(occurrence)`가 만든 번역 설명을 함께 내보낸다. `now`는 검사에서 고정할 수 있다. 제목·날짜·설명을 비동기 해시 계산 전에 확정한다.

- 윤달이 없는 해에는 평달로, 30일이 없는 달에는 29일로 계산하는 기존 규칙을 그대로 사용한다.
- 선택한 과거 날짜는 이동시키지 않는다. 음력 2027년 12월 30일은 양력 2028-01-26으로 내보낸다.
- 지원 마지막 날짜인 양력 2050-12-31은 내보낼 수 있다. 배타적 종료 2051-01-01은 일정의 종료 경계이며 새 음력 변환 날짜를 뜻하지 않는다. 양력 2051년의 실제 기념일을 생성하지 않는다.
- 각 날짜를 별도 종일 `VEVENT`로 만든다. 양력 연간 반복 규칙이나 알림은 추가하지 않는다.
- UID는 제목·원 음력 조건·음력 연도·계산 날짜의 SHA-256으로 만든다. 같은 조건은 선택 순서, 설명 언어, 생성 시각이 바뀌어도 같은 UID다. 제목을 바꾸면 다른 일정 ID가 된다. 가져오기 중복 처리는 캘린더 앱에 따라 다르다고 안내한다.

## 재사용과 파일 형식

`ddayCalendar.ts`의 `escapeCalendarText`, `foldCalendarLine`과 `dday.ts`의 `addDays`, `isValidDate`를 재사용한다. 기존 전체 파일 생성기는 `DESCRIPTION`이 없어 새 기능에서 직접 작은 이벤트 목록을 조립하되 공용 파일은 수정하지 않았다.

[RFC 5545](https://www.rfc-editor.org/rfc/rfc5545)의 §3.1(CRLF·75옥텟 접기), §3.3.11(TEXT 이스케이프), §3.6.1(시작 포함·종료 제외)을 대조했다. 한글·이모지의 UTF-8 문자를 자르지 않으며 줄바꿈/쉼표/세미콜론/역슬래시가 새 속성이나 이벤트가 되지 않게 처리한다.

파일명은 `lunar-anniversary-{첫음력연도}-{마지막음력연도}.ics`로 고정하며 사용자가 입력한 제목을 경로에 사용하지 않는다. 다운로드 요청 오류는 성공으로 표시하지 않는다. 파일을 실제로 저장했는지 브라우저 밖의 상태를 알 수 없으므로 성공 문구도 ‘다운로드 요청’으로 한정한다.

## UI와 비동기 경계

- 자식 props: `{spec, startLunarYear, today}`. 부모의 기존 `pair.lunar`, `anniversaries.start`, `today`를 전달한다. `today`는 기존 브라우저 현지 날짜이며 연도표 시작은 그 날짜를 음력으로 변환한 연도다. SSR에서는 기존 고정 2026년 시작을 유지한다. 공유 URL 초기 복원과 원래 연도표/D-day 계산은 수정하지 않았다.
- 패널 `#lunar-calendar-export`, 제목 라벨 ‘캘린더에 표시할 기념일 이름’, 연도 그룹 ‘내보낼 음력 연도와 양력 날짜’, 버튼 ‘선택한 날짜 ICS 내려받기’.
- 각 체크 라벨은 음력 연도와 실제 양력 날짜를 함께 읽는다. 연도 행·버튼 최소 44px, 입력 16px, 좁은 폭에서 줄바꿈하도록 구성했다.
- 부모의 날짜 조건·제목·선택 연도·언어가 바뀌면 요청 세대를 무효화한다. 예전 해시 완료는 새 파일을 내려받거나 새 상태의 성공/오류를 덮지 않는다. 언마운트 뒤에도 파일 생성 완료를 적용하지 않는다.
- 처리 중 연도/제목 입력과 중복 다운로드를 막는다. 접었다 다시 열어도 입력 초안은 유지한다. 날짜 조건이 달라지면 그 조건에 맞는 연도를 다시 선택해야 한다.

## 자체 검사

- `node scripts/check-lunar-anniversary-calendar.ts`: 15개 그룹 PASS. 개별 날짜/고정 DTSTAMP, 대체 설명, 양력 연도 이동, 지원 범위 끝과 전체 거부, 과거 날짜, 선택 한도/중복/빈 선택, 엄격한 입력, 100자 제목, 속성 주입 방어, CRLF/UTF-8 접기, stable UID, 실패 경계, 비동기 입력 snapshot을 확인했다.
- `node scripts/check-lunar.ts`: 기존 음력 변환 회귀 PASS(지원 범위 전체 왕복 포함).
- `npx eslint src/components/LunarAnniversaryCalendar.tsx src/utils/lunarAnniversaryCalendar.ts scripts/check-lunar-anniversary-calendar.ts`: 첫 실행에서 cleanup ref 경고 1개를 발견해 정리했다. 제품 자식 파일 재검사 오류·경고 0, 유틸/검사 파일 오류·경고 0이다.
- 도메인 검사 초기 실패 2건은 검사 파서가 값 안의 `BEGIN:VEVENT`/`END:VEVENT` 문자열까지 경계로 해석한 문제였다. 실제 논리 줄 전체가 경계와 일치할 때만 구분하도록 검사 파서를 수정한 뒤 15개 그룹을 모두 통과했다.
- 부모 포함 scoped ESLint에서는 연결 전후 동일한 기존 `react-hooks/set-state-in-effect` 4건만 나온다(초기 URL load, 윤달/일수 보정). root는 이번 ICS 범위를 벗어나는 상태 복원 변경을 피하도록 이 baseline을 유지하라고 결정했다. 신규 자식/유틸/검사는 오류·경고 0이며 부모 변경으로 추가한 lint 오류도 없다.
- 독립 검토 11개 그룹 PASS: 별도 ICS 파서/날짜 경계/UID 4, 실제 자식의 다운로드·source 변경·늦은 실패·언마운트·중복 요청 5, 부모 공유/11년 표 복사/D-day/모드 전환·URL 재방문 2. 재현 가능한 제품 결함은 없다. 기존 음력 엔진 정확성을 새로 재인증한다는 의미는 아니며 계산 결과 보존을 확인했다.
- 브라우저 최종 5개 PASS. 최초 320px 캡처에서 기존 날짜 입력의 연도 글자가 잘리는 현상을 발견해 모바일 연도를 전체 폭, 월/일을 다음 행 두 칸으로 배치하는 className 4줄만 보완했다. sm 이상은 기존 3열이며 날짜 상태·계산·URL은 바꾸지 않았다. 최종 재검증에서 2026년 전체 표시·연도표 복사/공유·11개 ICS 다운로드와 최신 설명 문구를 직접 확인했다.
- 구현 담당은 Chrome·전체 타입 검사·빌드·배포·커밋을 실행하지 않았다. 전체 타입 체크포인트는 공용 통합 담당이 별도로 조율한다.

## 다음 후보로만 기록

기존 `LunarConverter.copyToClipboard`는 Clipboard 실패나 `execCommand(false)`에도 복사 완료를 표시한다. root에게 전달했으며 이번 ICS 범위에서는 수정하지 않는다.
