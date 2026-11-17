# 51차 후보 — D-day 현재 일정 복사·캘린더 반출 보호

상태: 완료(미배포). 작성자 14·독립 8·Chrome 8흐름과09:43:59 KST 전체2GB 타입 재검사·번역/범위lint/diff를 통과했다. [완료 보고서](report.md). 아래 실행 계약과 사전 조사/수정 전 근거는 이력으로 보존한다.

## 선정한 사용자 불편 하나

**지금 보고 있는 일정의 결과를 복사하거나 캘린더 파일로 옮길 때 실패를 복구하고, 바뀐 일정의 오래된 반출을 막는다.** 복사 실패 뒤 같은 제목·날짜를 다시 입력하거나, 이전 일정 파일이 뒤늦게 내려와 잘못 가져오는 혼란을 줄이는 후보다. 방문 빈도나 실제 피해 통계는 없으며 기존 도구의 반출 흐름과 코드상 실패 경계를 바탕으로 선정했다.

신규 경로·계정·의존성·서버/외부 캘린더 API·공식 날짜 조회는 필요 없다. 수능 날짜·공휴일/대체공휴일·날짜 계산식은 고치지 않으므로 새 공식 날짜 자료 조사도 필요하지 않다. RFC 형식 역시8차 구현을 재사용하고 새 해석을 도입하지 않는다.

## 기존 구현과 중복 제외

| 확인 대상 | 이미 있는 기능 / 이번 후보와의 구분 |
|---|---|
| `DdayCalculator.tsx` | D-day/기념일/날짜 차이/날짜 더하기4모드, 목표 날짜 native input, 기본 프리셋, 저장·불러오기·고정, 월 달력, ShareResult. 저장 목록·프리셋·날짜 선택기를 새로 추가하지 않는다. |
| `DdayCalendarExport.tsx`, `ddayCalendar.ts` |8차에 현재1개/선택한 저장 일정 최대100개 종일 ICS·안정 UID·UTF-8접기·오류/충돌 보호까지 완료했다. 같은 ICS 기능을 다시 만들거나 RRULE/알림/초대를 추가하지 않는다. |
| `docs/verify/2026-11-16-repeat-batch8/report.md`, `dday-rfc-note.md` | 기존 도메인63·브라우저 D-day5 완료 기록. 당시 정상/오류/모바일 증거를 이번 신규 늦은 요청 경계의 실행 결과로 확대하지 않는다. |
| `TimerStopwatch.tsx`, `TimerRoutine.tsx` | 기존 타이머/스톱워치 및9차 루틴이 있다. 반복 입력을 줄이는 루틴/프리셋을 중복 구현하지 않는다. 타이머 소리/OS 알림·deadline은 이번과 분리한다. |
| `PomodoroTimer.tsx`,30차 기록 | 복귀·정지/재개·저장 충돌·관찰 완료 귀속을30차에 보완했다. 시간 실행기 변경으로 범위를 넓히지 않는다. |
| `DatePicker.tsx`, `CustomDatePicker.tsx` | 별도 date picker 구현도 있으나 D-day는 현재 native date input이다. 전역 날짜 선택기 교체/그리드 접근성 리팩터링은 이번 후보에서 제외한다. |
|18차 locale 감사 | D-day 초기 복원은 `inited` ref가 있어 언어 변경만으로 재복원하지 않는다고 기록됐다. 이를 새 발견으로 재집계하지 않는다. |
|38차 `ShareResult.tsx` | 이미지·공유·링크 복사의 자체 실패 복구/세대는 이미 있다. 공용 컴포넌트 API를 변경하지 않고 기존 `resultKey`와 wrapper capture 패턴으로 이 부모의 별도 복사/ICS와 조율한다. |

## 읽기에서 확인한 경계 — 아직 실행 재현과 구분

1. `DdayCalculator.tsx`의 `copyText`는 native 실패 후 `execCommand('copy')`의 false를 확인하지 않는다. `onCopy`는 await 뒤 전역 copied=true를 설정한다. 현재 원고/모드/수명 또는 공유 버튼과의 요청 소유권 검사가 없다.
2. `DdayCalendarExport.tsx`는 클릭 당시 current를 복사하거나 저장 선택을 조회한 뒤 실제 `createDdayCalendar`의 SHA를 await한다. 그 뒤 현재 props/수명 검증 없이 URL 생성·anchor.click·성공 안내를 한다. 제목/날짜는 부모에서 계속 편집할 수 있고, 모드 전환은 이 자식을 unmount한다.
3. child의 source/checkbox 버튼은 busy 동안 disabled지만 부모 입력·이탈까지 막는 것은 아니다. 이벤트 배열은 클릭 시 만들어지므로 내용이 섞인다고 단정하지 않는다. 조사 대상은 **오래된 요청이 계속 반출되는가**이다.
4. 부모 URL sync가 소유하지 않는 query/hash까지 없애는 경로와 기본 일정 생략은 별도 읽기 메모다. **이번 후보에서 전체 URL 초기화/동기화 정책을 리팩터링하지 않는다.** 단, 명시 D-day 반출 URL은 현재 클릭 일정의 mode/date/title을 명시해 받는 기기의 고정 일정에 의존하지 않게 하는 작은 순수 빌더를 제안한다. 기존 주소의 무관 query/hash는 그 시점 값 그대로 보존하며 history를 직접 쓰지 않는다.

위 항목은 먼저 코드 조사로 분류했다. 후속 `check-dday-export-baseline.mjs --record`에서 정상 native 복사·실제 Web Crypto/Blob ICS 2건과 다음4경계를 실제 기존 컴포넌트 제어 포트로 관측했다: native reject+legacy false도 copied, copy A→입력 B→old reject가 A fallback+copied 안내, SHA pending→current 편집 후 old ICS anchor1, SHA pending→unmount 후 old ICS anchor1. ICS 내용은 원래 클릭 snapshot 그대로였고 URL도1회 회수됐다. **파일 내용 혼합/URL 누수라고 주장하지 않으며 오래된 반출 허용만 재현했다.** native 브라우저 관측과 구분한다. before JSON에는 제품2파일 SHA도 보존했다.

처음 baseline host 실행은 MobileResultLink의 별도 번역모듈 포트 누락 때문에 시작하지 못했다. 관련 없는 child를 marker로 분리한 뒤 제품 변경 없이6개 관측이 통과했다. 원본 before JSON은 최초1회만 쓰며 이후 덮어쓰기 방지 가드를 둔다.

## 제안하는 최소 구현 계약

### 현재 결과 복사

- 기존 D-day 결과 복사 버튼을 유지한다. 클릭 때 표시 제목·D-label·날짜 문자열과 명시 공유 URL을 하나의 snapshot으로 캡처한다. D-label/공휴일/날짜 수식은 기존 값을 사용한다.
- 기존 `copyShareResultLink`의 native/legacy true 판정을 재사용한다. false/throw/API 없음은 성공 표시를 하지 않고 읽기 전용 전체 복사문·전체 선택·다시 복사·닫기를 제공한다. 원문이나 날짜 입력을 바꾸지 않는다.
- 제목/목표일/모드/locale/번역 내용·새 반출/cleanup은 이전 요청을 무효화한다. ABA(같은 결과로 돌아오기)도 revision이 다르면 늦은 fallback/안내를 하지 않는다. 이미 OS가 완료한 Clipboard 쓰기를 취소한다고 주장하지 않는다.
- 기존 ShareResult의 이미지/링크/공유와 양방향으로 소유권을 공유한다. 자체 반출 시작은 `shareRevision++`로 기존 pending 이미지를 무효화하고, ShareResult wrapper capture는 자체 copy/ICS 요청을 무효화한다. 초기 렌더/effect가 출력 시작으로 취급되거나 서로 무한 rerender하는 API를 만들지 않는다.

### ICS 준비·취소

- 현재1개/저장 선택100개, 순서·날짜·제목·기존 저장 ID/UID·RFC 출력은 그대로다. 선택 일정의 일부만 잘라 성공시키지 않는다.
- 캡처한 `source/current/selected identities/locale/context revision`과 mount epoch·request token이 현재일 때만 SHA 뒤 Blob URL/anchor와 안내를 실행한다. 부모 날짜/제목·모드·명시 다른 반출·언어·선택 문맥이 바뀌거나 unmount하면 이전 준비를 취소한다.
- 준비 중 명시 ‘취소’를 제공한다. SHA Promise 자체를 강제로 중단하지 못해도 완료 뒤 부수 효과0, URL을 만들었다면 정확히 회수한다. 새 요청은 명시 클릭으로만 시작한다.
- 저장 선택은 기존 `readSaved()`를 사용하고 다운로드 직전에도 기존 저장 가용성과 선택 identity를 확인한다. saved 목록 쓰기/삭제/고정/재조회 정책은 변경하지 않는다. 외부 변경을 발견하면 파일 전부를 거부하고 기존 오류 흐름으로 안내한다.
- 성공 문구는 ‘다운로드를 요청했어요’ 수준이다. OS의 실제 파일 저장·외부 캘린더 가져오기 성공을 단정하지 않는다. 오류/취소 뒤 current/selection은 유지한다.

### 날짜·저장·URL 보존

- 네 모드, 현재 native date input, 시작일 포함, 영업일·월말/윤일·KST 기준·프리셋·월 달력 계산은 그대로 유지한다.
- `dday-saved` 배열과 `dday-anniv` 설정의 기존 key/schema를 그대로 사용한다. 새로운 저장 공간·자동 migration·동의 UI·목록 편집 기능을 추가하지 않는다. 저장 목록 writer의 전면 수명 정리는 이번 후보에 포함하지 않는다.
- 예전 `target/event` 링크 복원은 유지한다. 새 명시 공유 URL은 기존 `mode/date/title`만 사용하며 다른 mode 입력·private 저장 ID/목록을 노출하지 않는다. 범위를 date picker·자정 갱신·공휴일 데이터 최신화로 확대하지 않는다.
- 수정한 컨트롤은44px, 새 수동 복사 입력은16px, KO/EN과 토큰을 같은 담당이 작성한다. 기존 폼/결과는 숨기지 않는다.

## 예정 파일/API 경계

| 소유 파일 | 좁은 변경 |
|---|---|
| `DdayCalculator.tsx` | 현재 반출 context, 복사 복구, ShareResult `url/resultKey`와 capture, ICS child 포트 연결 |
| `DdayCalendarExport.tsx` | 클릭 snapshot·epoch/request·취소/cleanup·늦은 SHA 차단·기존 저장 선택 재검증 |
| 새 `utils/ddayExportActions.ts` | 현재 일정 명시 URL builder·복사/반출 token; React/storage·공휴일 조회 없음 |
| 새 `DdayCopyRecovery.tsx` | 원문 선택/재시도/닫기 |
| 신규 TS 도메인 검사/actual-parent MJS | 아래 완료 기준. 기존8차 검사는 실제 영향 부분을 회귀로 구분 |
| `translations-dday.json` | author KO/EN fragment. canonical/metadata는 integrate 소유 |

공용 ShareResult·`dday.ts`·`ddayCalendar.ts`의 형식/계산·koreanHolidays·저장 schema는 우선 읽기 전용으로 재사용한다. API가 부족하면 실제 재현과 함께 root에게 먼저 제시한다. package/route/remote API를 늘리지 않는다.

## 실행 검증 계획

**현재 read-only baseline:** 실제 부모 정상 native 복사, native reject+legacy false의 성공 표시 여부, 복사 중 목표/제목 변경 뒤 옛 거부, 실제 ICS 생성의 SHA를 지연시킨 뒤 current 편집/unmount의 download 관측. 제품 문자열/날짜/ICS는 합성 자료만 사용한다. `--record` 최초 기록 후 before JSON을 덮어쓰지 않는다.

**구현 후 순수·실제 부모:**

1. native 성공/거부/부재·fallback true/false/throw, 수동 전체 원문·선택 실패·재시도/닫기·2초 timer 소유권.
2. D-day copy↔ShareResult link/PNG↔ICS 양방향 경쟁, 제목/날짜/모드/locale ABA, Strict replay/unmount 이후 late success/error.
3. current ICS SHA pending→입력 변경/취소/모드 전환/unmount/다른 반출에서 anchor0. 새 명시 클릭만 현재 snapshot의 실제 ICS bytes를 반출.
4. saved 선택1/100/101, 변경/삭제된 선택·외부 raw 충돌·손상/미지원, 입력·선택 보존 및 전체 거부. **목록 write0**를 확인한다.
5. 실제 UID/hash/RFC 출력은 기존 helper로 만들고 별도 reader로 날짜·다음날 종료·한글 제목·escaping·순서·100개를 확인. 기존 `check-dday-calendar.ts`와 `check-dday.ts`는 회귀로 별도 집계한다.
6. 명시 공유 URL fresh restore는 수신 기기의 고정 일정과 무관하게 동일한 title/date, 특수문자/공백/빈 제목 기본표시·query/hash 보존. 기존 anniv/diff/add URL 복원은 최소 회귀로 확인한다.
7. native 검증 담당: 실제 Clipboard 선택·거부, SHA만 지연한 실제 Web Crypto→ICS Blob/다운로드, 실제 PNG 늦은 요청 차단,320 KO/EN·키보드. 실제 외부 캘린더 등록·개인일정·OS 알림은 사용하지 않는다.

완료 조건: 별도 baseline의 반대 기대값을 실제 부모에서 확인하고, 정상 현재/선택 ICS·4모드·저장 목록/링크 회귀에 미해결 항목이 없으며 scoped lint·독립·native·최종 전체 타입을 담당별로 구분해 기록한다. 제품 구현 전 조사 계획 자체를 완료된 기능으로 표현하지 않는다.
