# 42차 한글 워들 기록·공유 읽기 설계

상태: **설계만 작성, 제품/TS 수정 없음.** 36 발견 대응과 39 부모 연결 신호가 우선이다. 실제 사용자 저장소와 공개 리더보드에는 접근하지 않았다. 아래 용량 보호값은 구현 전 확정할 제안이며, 기존 제품에 있던 한도로 설명하지 않는다.

## 현재 코드와 유지할 의미

- `KoreanWordle.tsx`의 `readJSON`은 JSON `null`/잘못된 구조를 그대로 넘긴다. `setRecords` updater 안에서 저장하고, 공개 애니메이션 뒤에 성과·이름·통계 창을 처리한다. 루트의 `before-fix.json` 5그룹 중 정상 빈 기록을 제외한 4개가 이 구조와 복사 거짓 성공을 재현했다. 실제 브라우저 증거와는 구분한다.
- `koreanWordle.ts`의 `DailyRecords`는 회차 키 → `{ guesses: string[], hard?: boolean }`이다. 일일 문제는 2글자, 최대 6회이며 **반복 추측은 허용**된다. 누락된 `hard`는 기존처럼 false로 읽는다. 하드 모드 판정을 새 검증기로 재해석하지 않고 기존 `hardModeError`를 재사용한다.
- 정답 배열 445개, 유효 2글자 단어 1,379개, KST `dayNumber`/seed/순서·조합·채점은 변경하지 않는다. 기존 `check-korean-wordle.ts`의 통계/legacy 연결 oracle도 유지한다.
- 구버전 누적값은 `koreanWordle_stats_2` → `koreanWordle_stats` 순서에서 첫 사용 가능한 값 **하나**를 더한다. 두 legacy 키를 모두 합산하거나 일일 값으로 이주하지 않는다. `computeStats`는 날짜 기록과 legacy 누적값을 더할 뿐, 양자의 같은 판 중복을 판별할 정보가 없다. 새로 추측하여 빼거나 기존 통계 수학을 바꾸지 않는다.

## 최소 파일/API

- 새 `utils/koreanWordleStorage.ts`: `parseDailyRecords(raw, today)`, `parseWordleSettings(raw)`, `parseLegacyStats(raw)`, `readWordleStorage`, `appendDailyGuess`, 키별 잠금/CAS/readback. 성공은 raw basis와 분리된 값, 실패는 `corrupt | unsupported | tooLarge | unavailable | conflict | writeUnknown | quota` 등 원인을 반환한다.
- 새 `utils/koreanWordleHistory.ts`: `projectRecentDays(records, today, limit=30)`, 완료 기록의 날짜/회차/격자 공유 모델. 실제 정답/추측은 공유 반환값에 넣지 않는다. 기존 순수 `dailyAnswer`/`shareGrid`/`shareText`를 사용한다.
- 새 `components/KoreanWordleHistory.tsx`: 통계 안의 읽기 전용 목록·완료 기록 펼치기·복사 복구. 부모가 검증된 기록과 요청 scope를 전달한다. 신규 저장소나 과거 문제 플레이 모드는 만들지 않는다.
- `KoreanWordle.tsx`: 초기 읽기와 key별 경고, 제출/판 수명, 기록 자식, 현재·과거·ShareResult 복사 소유권만 연결한다. KO/EN fragment는 같은 구현 담당이 작성하고 canonical은 통합 담당이 병합한다.
- `koreanWordle.ts`는 계산 수정 없이 재사용한다. 공용 achievement/leaderboard 훅의 저장 프로토콜·RPC도 수정하지 않는다.

## 읽기 검증과 호환성

1. 키 미존재는 정상 빈 상태, JSON `null`/배열/비객체 daily는 손상이다. 초기 읽기는 0쓰기. 검증 실패 raw를 고치거나 일부 정상 행만 골라 다시 저장하지 않는다. daily/settings/legacy 오류를 분리해 다른 정상 키와 연습은 계속 사용할 수 있다.
2. 일일 키는 canonical 정수 회차만 받는다(`01`, 소수, `NaN`, 중복 JSON 키 등 모호한 입력은 거부). epoch 이전의 음수/0을 무조건 잘못된 날짜로 취급하지 않는다. 기존 `dayNumber`가 표현할 수 있는 실제 날짜인지 왕복하고, 현재 KST 날짜 이후는 unsupported로 보존한다. 미래 기록 때문에 현재 기록을 덮어쓰지 않는다. 날짜 범위는 구현 시 합성 fixture와 함께 확정한다.
3. guesses는 0~6개의 정확한 2글자 한글 유효 단어, hard는 누락 또는 boolean이다. 첫 정답 뒤 추가 시도/7번째 시도는 잘못된 terminal 기록이다. 반복 오답은 유효하다. 알려지지 않은 일일 레코드 필드는 미래 스키마일 수 있으므로 자동 projection 저장 대신 해당 key 쓰기를 막는다. settings도 known boolean만 읽고, 다른 필드/타입을 임의로 지우지 않는다.
4. legacy는 쓰지 않는다. 현재 코드가 사용한 필드와 기본값을 명시한다: gamesPlayed/gamesWon/maxStreak/currentStreak는 안전한 비음수 정수, 누락된 부가 카운터는 0, guessDistribution은 누락/짧은 배열의 부족 칸을 0으로 읽되 존재 칸은 검증한다. 배열 합계를 억지로 wins와 같게 만들지 않는다. 알 수 없는 부가 필드는 읽기 전용이므로 원문에 둔다. 날짜 누락은 기존 sentinel -1, 존재 날짜는 엄격한 실제 YYYY-MM-DD만 허용한다. 비정상 값 때문에 다른 legacy를 자동 합산하지 않고 키별 상태를 알린다. 숫자 문자열/부분 객체 허용 범위는 원래 writer의 확인 가능한 fixture를 기준으로 결정하며 `Number(x) || 0`으로 손상을 숨기지 않는다.

## 용량 근거와 구현 전 측정

현재 코드에는 날짜 수/바이트 상한이 없어 **유효 legacy 전체에 대한 유한한 최대 크기가 정의되어 있지 않다.** 브라우저 저장 quota도 이 코드만으로 단정할 수 없다. 최근 30개 표시를 저장 한도로 사용하지 않는다.

2026-11-17 KST 회차는 321이다. 실제 순수 단어 목록에서 각 날짜 정답과 다른 유효어를 골라 6번 반복하고 `hard:false`로 `JSON.stringify`한 합성 자료를 메모리에서 측정했다. 파일·localStorage 쓰기는 없었다.

| 날짜 수 | UTF-16 길이 | UTF-8 bytes |
| ---: | ---: | ---: |
| 1 | 62 | 86 |
| 321 | 20,116 | 27,820 |
| 366 | 22,951 | 31,735 |
| 10,000 | 638,895 | 878,895 |

10,000일은 용량 합성 fixture이며 오늘 기준으로 유효한 실제 기록이라는 뜻이 아니다. 과거 epoch 이전 회차·큰 회차 키·JSON 공백/한글 escape는 추가 측정한다. 오늘 321이라는 값으로 저장 배열을 자르지 않는다.

제안은 **raw UTF-8 8 MiB와 80,000일 보호 상한**이다. 10,000일 크기의 약 9배/약 219년 분량이며 통상 사용을 크게 넘지만, 기존 무상한과 동치인 보장은 아니다. 상한 밖도 원문 보존·쓰기 중단·용량 안내이며 자동 삭제/축약은 없다. 확정 전 정확한 raw byte 경계·최대 합법 형태·공백/escape·키 길이를 합성 생성하여 JSON parse 전/후 예산과 계산 시간을 측정한다. 날짜 수 상한은 초과 데이터를 읽은 척 통계에 섞지 않기 위한 보호값이고 UI 30개와 별개다. 구버전 aggregate의 safe-integer 카운터 최대와 6칸 배열은 별도 시험한다. 한도가 기존 정상 fixture를 거부하면 한도를 재검토하고 조용히 예외 처리하지 않는다.

## 같은 날짜 두 탭의 append 정책

- 제출은 클릭 시 `day`, guesses prefix, hard, 새 단어, raw basis, round token을 캡처한다. `navigator.locks`가 있으면 daily key 독점 잠금 안에서 다시 읽는다. 없으면 raw 재검사 + setItem 후 정확 readback을 사용하며 완전 동시 쓰기 원자성을 보장한다고 말하지 않는다.
- 최신 같은 날짜 guesses가 캡처 prefix와 같으면 해당 날짜만 append하고 **다른 날짜의 최신 기록은 보존**한다. unrelated 날짜 변경은 최신 전체를 검증한 뒤 병합한다.
- 최신 기록이 요청한 `prefix + guess`와 같거나 이를 prefix로 가진 경우, 같은 제출이 이미 반영된 것으로 처리한다. 다시 append/성과 재생하지 않고 검증된 최신 상태를 채택할 수 있다. hard 값도 같아야 한다.
- 다른 다음 추측/다른 hard로 갈라졌거나 저장 기록이 짧아졌다면 conflict다. 합치거나 내 기록으로 덮지 않는다. 내가 푼 메모리 분기와 저장본을 구분해 안내하고, **저장본 다시 불러오기**는 현재 미저장 진행을 바꾼다는 명시 확인을 받는다. 단어가 달라진 분기는 시도 횟수를 합산하지 않는다.
- 저장 실패/확인 불가에도 이미 입력한 메모리 판은 유지한다. readback 실패를 성공/실패 확정으로 꾸미거나 rollback하지 않는다. 재조회가 성공하기 전 쓰기 basis를 갱신하지 않는다. storage 이벤트로 새 basis를 자동 인정하지 않는다.
- lock 대기 중 날짜/모드 변경은 옛 날짜 append 자체의 의미를 지우지 않되, 늦은 완료가 현재 입력·오늘 판·새 모달을 바꾸지 못하게 한다. 명시 reload/cancel·언마운트 전 아직 시작되지 않은 요청은 세대 guard로 중단한다. 입력 지우기도 캡처한 입력 revision에만 적용한다.

## 완료 확정과 화면 타이머 수명

- submit handler의 동기 ref가 같은 판의 accepted guesses/진행 중 제출을 먼저 차지한다. React render를 기다리지 않아 빠른 Enter 두 번으로 같은 시도가 중복되지 않게 한다. 저장 부수효과는 setState updater 밖에 둔다.
- terminal 전이를 만든 **로컬 유효 제출**에 completion token을 붙여 `recordGameResult`를 한 번 호출한다. 완료 의미는 reveal timeout에서 분리한다. 단순 화면 전환으로 이미 끝난 판의 성과를 잃지 않는다. 초기 읽기/외부 저장본 채택/중복 append 재조회는 새 성과를 만들지 않는다. 다른 두 탭과 achievement의 별도 저장 키까지 하나의 transaction으로 확정한다는 보장은 하지 않는다.
- round identity는 daily 회차+로컬 분기 식별자, practice는 증가하는 run id다. 같은 연습 정답이 다시 나와도 새 판이다. view generation은 별도이며 mode/글자 수/날짜/new practice/언마운트 때 증가한다.
- reveal, shake, bounce, celebrate, toast, statistics-open, copied timer를 등록/정리하고 token도 확인한다. 옛 callback이 오늘 reveal lock을 풀거나 새 판의 상태를 지우지 못한다. 색상/locale/모달 변경은 복사·문구 scope도 갱신한다. reduced motion에서도 terminal 처리는 동일하다.
- 이름 창은 해당 daily completion snapshot에 귀속시킨다. 제출 시 캡처한 moves와 판 시작 시각 기준 duration을 사용하고, await 뒤 같은 이름 요청만 닫는다. 이전 판의 창을 새 판에서 자동으로 열지 않는다. 공개 제출은 기존 명시 동작과 성공 조건을 대조해 유지한다. 현재 부모는 `submitScore`의 null 결과를 구분하지 않고 닫으므로, 이를 성공 안내로 새로 해석하지 않는다. 테스트에서는 RPC/저장 이름 포트를 가짜로 대체한다.

## 최근 기록과 복사 수명

- 최신 30개의 유효 날짜를 숫자 역순으로 projection한다. 진행 중 기록은 날짜/진행 상태만, 완료 기록만 색상 격자와 복사를 제공한다. 전체 통계는 전체 검증 기록으로 계산하며 선택은 현재 game/day를 바꾸지 않는다. legacy 누적값에서 가짜 날짜 행을 만들지 않는다.
- 과거 결과는 KST 날짜·회차·승/패·시도 수·하드 표시·기존 색상 격자·고정 도구 링크만 포함한다. 실제 정답/추측 문자열, 과거 playable URL을 내보내지 않는다. 첫 SSR에는 일일 정답/격자 계산을 추가하지 않는다.
- current/history copy와 ShareResult를 공통 반출 revision으로 묶는다. 자체 복사를 시작하면 ShareResult resultKey를 바꾸고, ShareResult 클릭 capture는 부모/과거 copy 요청을 무효화한다. native 뒤 fallback 직전·성공/실패 표시·타이머에서 모두 mounted/request/context token을 확인한다.
- native 성공 또는 legacy true만 성공이다. 실패하면 **클릭 시점 전체 텍스트**의 readOnly textarea·선택/재시도/닫기를 제공하고 focus/select throw도 잡는다. 모달 닫기·선택 날짜/contrast/locale A→B→A에서 옛 feedback이 되살아나지 않는다. OS에 이미 전달한 비동기 clipboard 쓰기를 취소한다는 보장은 하지 않는다.

## 검증 완료 기준과 제한

순수: 기존 회귀, strict parser/legacy 우선순위, 30 projection vs 전체 통계, spoiler-free 별도 기대값, raw/개수 정확 한도, CAS same-prefix/branch/unrelated 날짜/unknown write. 실제 부모 합성 포트: Strict replay/중복 Enter/완료 후 새 연습/자정/지연 lock·modal·성과 1회, current/history/ShareResult 양방향 복사와 A-B-A. 브라우저 전담: native Clipboard·실제 두 탭·한국어 입력·320 KOEN·모달 키보드·reduced motion. 저장/리더보드 실제 사용자 데이터나 공개 제출을 시험하지 않는다. 무잠금 동시 쓰기와 여러 키를 묶은 전역 exactly-once는 지원한다고 주장하지 않는다.
