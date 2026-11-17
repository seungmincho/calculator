# 51차 D-day 현재 일정 반출 복구 — author ready

2026-11-17 KST. **신규 helper6 + 실제 부모/Calendar/ShareResult8 =14그룹 PASS**, 기존 ICS63 및 날짜 계산 회귀 PASS. 최종 제품·검사8파일 scoped ESLint exit0/오류0/경고0. 제품/검사 TS freeze 상태이며 독립/native/전체 타입 결과는 별도 담당을 기다린다. 이 담당은 Chrome·전체 tsc·빌드·배포·커밋을 실행하지 않았다.

## 사전 근거와 실제 변경

`check-dday-export-baseline.mjs --record`의 `before-fix.json`은 정상2·문제4를 기록한 원래 제품 증거다. 정상 native 복사/실제 SHA ICS, native reject+legacy false의 잘못된 copied, copy A→입력 B→old reject의 A fallback/B안내, SHA 중 편집/unmount 이후 이전 ICS anchor를 관측했다. 제품2파일 SHA도 들어 있으며 이후 덮어쓰기하지 않았다. 단순 읽기 위험을 실제 native 브라우저 결과로 표현하지 않는다.

변경한 제품:

- `DdayCalculator.tsx`: 부모 출력 요청 token, 복사 실패 복구, 명시 현재 일정 URL, ShareResult `resultKey`/capture, ICS child의 상위 소유권 포트를 연결했다.
- `DdayCalendarExport.tsx`: 실제 SHA 전후 snapshot/선택 재검증, request·문맥·수명 guard, 준비 취소, 늦은 완료 차단, URL 소유자 cleanup을 연결했다.
- 새 `DdayCopyRecovery.tsx`: 읽기 전용 전체 복사문/전체 선택/재시도/닫기/선택 실패 안내.44px·16px·토큰·KO/EN.
- 새 `ddayExportActions.ts`: 출력 token epoch/request, 현재 일정의 명시 URL builder, 선택 event의 독립 snapshot·순서 있는 identity 대조. React/storage/공휴일 계산 없음.

기존 `dday.ts`, `ddayCalendar.ts`, koreanHolidays와 저장 writer는 미변경이다. 네 모드·native 날짜 입력·시작일 포함·영업일/월말/윤일 계산·프리셋·저장/고정·월 달력·anniv 설정·예전 target/event 복원을 유지했다. 새 key/schema/서버/외부 Calendar 등록/반복/알림/패키지를 만들지 않았다.

## 반출 정책

일정 결과 복사는 클릭 당시 문구+명시 URL을 캡처한다. native 성공 또는 legacy true만 copied로 표시하며 실패 원문은 그대로 수동 선택/재시도에 사용한다. 제목/날짜/모드/locale/번역 변경·새 반출·cleanup은 이전 token을 무효화한다. 입력 ABA도 편집 revision으로 구분한다. 이미 OS가 실행한 Clipboard 쓰기를 취소한다고 주장하지 않고 오래된 추가 fallback/안내를 차단한다.

명시 URL은 기존 `mode=dday/date/title`을 항상 넣으므로 수신 기기의 고정 일정과 무관하게 같은 표시 일정을 복원한다. 다른 모드의 소유 query는 제거하고 **클릭 당시 관측한** 무관 query/hash는 보존한다. 현재 부모의 기존 전체 주소 동기화 효과를 고친 것은 아니므로 그 효과 이전의 사라진 query/hash까지 되살린다고 주장하지 않는다. 저장 ID/목록을 URL에 추가하지 않으며 기존 자동 URL 동기화 정책은 그대로다.

자체 복사/ICS 시작은 부모 token을 새로 만들고 shareRevision으로 기존 ShareResult PNG/link 요청을 무효화한다. ShareResult의 사용자 click capture는 자체 copy/ICS token만 무효화하고 자기가 시작하는 공유 버튼의 resultKey를 바꾸지 않는다. 공용 ShareResult 파일/API는 변경하지 않았다.

ICS는 현재1개/선택100개·기존 UID·RFC 바이트·순서를 유지한다. 클릭 snapshot의 실제 생성이 끝나도 current/title/date/source/selection/저장 가용성/locale/수명/부모 출력 요청이 달라졌으면 URL 생성/anchor/안내를 실행하지 않는다. 저장 선택은 완료 직전 기존 readSaved()와 ID/제목/날짜·순서를 다시 대조한다. 불일치면 일부만 제외하지 않고 전체 파일을 거부한다.

준비 취소는 입력/선택을 유지한다. SHA 자체는 취소할 수 없지만 완료 이후 부수 효과를 막는다. 새 클릭만 새 작업을 시작한다. same-render 중복 시작, 옛 취소 handler와 옛 source handler가 새 작업을 바꾸는 경우도 live token으로 막았다. 이미 anchor를 요청한 파일은 공유 다운로드 소유자가 URL 회수를30초 뒤로 예약하며 unmount 때도 정확히1회 회수한다. 백그라운드에서 예약 실행이 늦어질 수 있다. 실패·취소를 저장 성공으로 표시하지 않으며 문구는 ‘다운로드 요청’이다.

## 검사 근거

`node scripts/check-dday-export-actions.ts` —6그룹:

1. 새 요청·invalidate·dispose/replay의 epoch 및 ABA 차단.
2. 같은 문자열 context인 서로 다른 owner의 token 격리.
3. 명시 날짜/제목·한글/특수문자·무관 중복 query/hash·다른 모드 query 제거.
4. 무효 날짜/프로토콜 거부, 명시 빈 title을 임의로 정규화하지 않음.
5. 선택 event 전부의 독립 snapshot, 관련 없는 pinned 필드 미반출.
6. 순서/ID/제목/날짜가 하나라도 달라지면 전체 불일치.

`node docs/verify/2026-11-17-repeat-batch51/check-dday-output-parent.mjs` —8그룹:

1. 실제 정상/실패 copy, 실제 복구 자식 원문/선택·선택 실패/재시도, 다른 고정 일정이 있는 수신 부모에 명시 URL 복원.
2. 날짜/제목·locale ABA·unmount 뒤 늦은 Clipboard 거부의 legacy/복구0.
3. 실제 SHA/Blob의 정상 윤일 ICS, 같은 렌더 중복 시작1회, URL cleanup1회·저장 목록 write0.
4. SHA pending→편집/취소/모드/locale/unmount의 이전 파일0, 명시 재시도만 최신 snapshot 반출.
5. 실제 ShareResult와 자체 copy/ICS 양방향 소유권: pending PNG→ICS, ICS→link, copy→ICS, link→copy, copy→PNG.
6.100개 선택의 실제 ICS VEVENT/UID100개·순서, pending 중 raw 변경의 전체 거부·100개 선택 보존·목록 write0.
7. createObjectURL/anchor throw의 거짓 성공0·입력/선택 보존·명시 재시도,101개 handler 차단, 손상 saved 원본 보존.
8. Strict effect replay, 옛 source/cancel/SHA 오류가 새 완료를 바꾸지 않음, 기존 anniv/diff/add URL 초기 입력 최소 회귀.

`dday-output-harness.mjs`는 공용29 hook host를 재사용해 실제 부모+CalendarExport+CopyRecovery+ShareResult를 각각 렌더·props로 연결한다. Web Crypto SHA·Blob·ICS 생성은 실제 구현이다. Clipboard/DOM/캔버스 이미지 생성/다운로드 I/O는 제어 포트이며 PNG 픽셀 또는 브라우저 저장 성공 검증으로 확대하지 않는다. 첫 실행의 신규 MJS 중괄호 오기를 바로잡은 뒤 제품 변경 없이 검사 실행을 시작했다. 제품 준비 중 stale cancel/source guard를 보강하고 같은8그룹에 그 경계를 넣어 다시 통과했다.

기존 `node scripts/check-dday-calendar.ts`63개와 `node scripts/check-dday.ts` 통과는 회귀로 별도 집계한다. 합계를 신규 기능 검사 수에 더하지 않았다. Node의 typeless-package 경고는 기존 실행 환경 경고이며 package를 바꾸지 않았다.

최종 lint8파일: 제품4 + `scripts/check-dday-export-actions.ts` + baseline MJS + harness MJS + actual-parent MJS. 모두 오류0/경고0이다.

## Native/독립 핸드오프

| selector / API | 의미 |
|---|---|
| `[data-dday-root]` | data-dday-mode, data-dday-output-context(편집 revision) |
| `#dday-title`, `#dday-date` | 현재 일정 제목/날짜, 즉시 이전 출력 owner 무효화 |
| `[data-dday-copy]` | 자체 문구+명시 링크 복사 |
| `[data-dday-copy-recovery]` / `-manual/-select/-retry/-close` | 실제 복구 UI (모두 data-dday-copy 접두사) |
| `[data-dday-share] [data-share-action="copy/save/share"]` | 기존 실제 ShareResult, 바깥 capture로 자체 출력과 조율 |
| `[data-dday-calendar]` | data-dday-calendar-status=idle/busy/downloaded/error/cancelled |
| `[data-dday-calendar-source="current/saved"]` | 현재/저장 선택 출처 |
| `[data-dday-calendar-select="id"]`, `[data-dday-calendar-all]` | 저장 일정 명시 선택 |
| `[data-dday-calendar-download]`, `[data-dday-calendar-cancel]` | 준비 시작/취소 |
| `contextKey?`, `onBeginOutput?:()=>currentPredicate|null` | CalendarExport의 선택적 부모 연동 포트; 단독 사용도 자체 요청 guard 적용 |

번역 `translations-dday.json`은 KO/EN 각12leaf(exportActions11 + 기존 calendarExport.downloaded1)이며 EN count 문구는 단복수 오표기를 피했다. 통합 담당에게 최종 조각을 보냈다. Native 담당은 외부 Calendar 등록/개인일정 없이 실제 Clipboard 선택·SHA 지연→실제 ICS·PNG 경쟁·320 KO/EN을 검증한다.
