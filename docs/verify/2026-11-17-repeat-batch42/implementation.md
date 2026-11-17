# 42차 한글 워들 기록·공유 — 구현 체크포인트

2026-11-17. 작성자 구현과 범위 검사가 완료되어 제품 TS를 고정했다. **순수 11 + 실제 부모 8 + 자식 KO/EN 2 = 21그룹 PASS**, 기존 계산 회귀 PASS, 최종 연결 6파일 ESLint exit 0이다. 독립·실제 Chrome·전체 타입은 담당자의 후속 결과를 기다린다. 이 문서는 그 검증까지 완료했다고 주장하지 않는다.

## 제품 파일과 기존 흐름의 연결

- `src/components/KoreanWordle.tsx`: 저장 읽기·제출·화면 타이머·복사 소유권과 두 자식만 연결한다. 사전/seed/한글 조합/하드 모드/채점/누적 통계 수학을 가진 `src/utils/koreanWordle.ts`는 변경하지 않았다.
- `src/utils/koreanWordleStorage.ts`: 기존 daily/settings/legacy 키의 엄격 읽기, daily prefix append, 키별 Web Lock/CAS/readback. 초기 읽기에는 쓰기가 없다.
- `src/utils/koreanWordleController.ts`: 동기 제출 소유권, 의미상 완료의 한 번 처리, 화면별 타이머, 모든 자체 복사 대상의 단일 요청 세대.
- `src/utils/koreanWordleHistory.ts`, `src/components/KoreanWordleHistory.tsx`: 전체 기록을 유지한 채 최근 30일만 통계 창에 표시한다. 완료된 날짜의 격자와 고정 도구 링크를 펼치고 복사한다. 원래 정답·추측 단어는 공유 모델에 없다. 진행 중 행에는 격자/복사가 없다.
- `src/components/KoreanWordleCopyRecovery.tsx`: native/fallback 복사 실패 시 전체 readOnly 결과, 전체 선택/재시도/닫기. 실제 native 성공 또는 legacy true만 성공으로 표시한다.
- 번역 조각 `translations-wordle.json`: `koreanWordle.history`, `recordStorage`, `copyRecovery`의 KO/EN 각 37 leaf. canonical/생성본/페이지·메뉴는 통합 담당 소유다.

기존 state updater 내부 storage writer는 제거했다. 제출은 현재 controller가 추측을 동기 확정한 뒤 메모리와 저장 큐를 갱신한다. terminal 로컬 제출의 achievement 호출은 reveal 전에 한 번 처리한다. 저장본 복원/이미 반영된 동일 append는 achievement를 재생하지 않는다. 서로 다른 탭의 achievement 별도 키까지 원자적 한 번 저장을 보장하지는 않는다.

일일/연습·2/3글자·새 연습·자정은 화면 세대를 바꾼다. 이미 유효하게 제출한 전날 저장은 진행할 수 있으나 늦은 공개 callback이 새 판의 입력 잠금을 풀거나 이름/통계 창을 열지 못한다. 이름 제출은 기존 명시 RPC와 moves/duration snapshot을 사용하며, 이전 판의 응답은 새 창을 닫지 않는다. 테스트의 공개 RPC/이름 저장은 모두 가짜 포트다. 기존 submitScore의 null 반환을 새 성공 안내로 해석하지 않는다.

## 저장·재조회 계약

| 목적 | 기존 key 및 lock 이름 |
| --- | --- |
| 날짜별 일일 기록 | `koreanWordle-daily-v1` |
| 하드/색약 설정 | `koreanWordle-settings-v1` |
| 구버전 누적값(읽기 전용, 첫 유효 played>0 한 개) | `koreanWordle_stats_2`, `koreanWordle_stats` |

정상 빈 진행 예시는 `{ "321": { "guesses": [], "hard": false } }`다. 실제 완료 fixture 단어는 기존 `dailyAnswer(day)`/`VALID[2]`로 생성한다. 정답은 마지막 시도여야 하며 최대 6회, 반복 오답은 허용한다. 누락 hard는 false다. 키가 존재하지 않으면 빈 상태이고 null/배열/잘못된 구조/중복 JSON 속성/알 수 없는 항목/미래 날짜는 보존 후 해당 키 쓰기를 막는다.

같은 prefix의 동일 제출은 다시 append하지 않는다. 서로 다른 분기는 메모리 판을 유지하고 추가 쓰기를 막는다. storage 이벤트도 저장본을 자동으로 적용하지 않는다. 다른 날짜의 유효한 최신 기록은 append 시 보존한다. quota/readback 불명확/저장소 차단에도 메모리 판은 남는다. readback 실패 뒤에는 저장 성공을 표시하거나 rollback하지 않는다.

`저장본 다시 읽기` → `저장본으로 바꾸기`로 명시 확인해야 미저장 진행을 바꾼다. 취소는 현재 판을 유지한다. 재조회 실패도 현재 메모리를 유지한다. 설정은 별도 재조회라 일일 진행을 바꾸지 않는다. 잠금 없는 환경은 직전 raw 재확인/readback 보호 범위이며 localStorage 원자적 transaction이라고 표현하지 않는다.

**8MiB raw/80,000일은 읽기 보호 예산이며 기존 유효 legacy의 최대값이 아니다.** 초과하면 원문 보존·쓰기 중지, 일부 행 자동 채택/삭제/30일 절단 없음. 합성 측정과 정확 경계는 `preparation.md`, `storage-measurements.json`에 있다. 최대 합성 기록 validator의 Node 관찰 281.77ms는 실제 휴대전화 성능 보장이 아니다. 전체 통계/최근 projection은 memo화하여 1초 countdown과 자모 입력마다 전체 기록을 재계산하지 않는다.

## 복사와 표시 소유권

현재/과거 격자 복사는 요청 token을 공유한다. 새 자체 복사 시작은 ShareResult `resultKey`를 바꾸고, `[data-wordle-share-boundary]` click capture는 자체 이전 요청을 무효화한다. 입력 revision·모드·판·현재 날짜·기록 revision·하드/색약·언어·열린 모달·선택 날짜가 달라지면 이전 성공/복구를 지운다. A→B→A에서도 token은 복구되지 않는다. native 쓰기가 이미 OS에 맡겨졌다면 클립보드 자체를 취소할 수 없지만 늦은 fallback/상태 표시를 막는다.

복구 textarea는 실패한 전체 결과를 그대로 제공한다. 통계 창이 열렸다면 복구도 그 창 안에 표시해 수동 선택이 가능하다. 마지막 30일 행을 보아도 현재 문제/원본 저장값은 바뀌지 않는다. SSR 초기에는 새로 일일 정답/격자를 넣지 않는다.

## 안정 선택자와 타이머

| 영역 | 선택자 |
| --- | --- |
| 부모/날짜/상태 | `[data-wordle-mode]`, `data-wordle-day`, `data-wordle-status`, `data-wordle-revealing` |
| 전환/입력 | `[data-wordle-switch="daily|practice"]`, `[data-wordle-length="2|3"]`, `[data-wordle-new-practice]`, `[data-wordle-key]`, `[data-wordle-row]` |
| 설정/모달 | `[data-wordle-setting="hard|contrast"]`, `[data-wordle-help]`, `[data-wordle-stats]` |
| 저장 상태 | `[data-wordle-save="pending|saved"]`, `[data-wordle-daily-error]`, `[data-wordle-settings-error]`, `[data-wordle-legacy-error]` |
| 확인 재조회 | `[data-wordle-reload]`, `[data-wordle-confirm-reload]`, `[data-wordle-cancel-reload]`, `[data-wordle-settings-reload]` |
| 과거 기록 | `[data-wordle-history]`, `[data-wordle-history-day]`, `[data-wordle-history-expand]`, `[data-wordle-history-grid]`, `[data-wordle-history-copy]` |
| 복사/복구 | `[data-wordle-copy="current"]`, `[data-wordle-share-boundary]`, `[data-wordle-copy-recovery]`, `[data-wordle-copy-manual]`, `[data-wordle-copy-select]`, `[data-wordle-copy-retry]`, `[data-wordle-copy-close]` |

reveal은 기존 두 글자 750ms/세 글자 1000ms, daily terminal 뒤 통계 열기는 추가 1500ms다. semantic completion은 이 timeout보다 먼저 확정된다. 새 버튼/수동 필드는 44px 높이/16px 입력을 사용한다. 기존 좁은 한글 키보드의 모든 개별 키가 44px 너비라는 주장은 하지 않는다. 실제 320px/터치·native Clipboard·두 탭은 담당 브라우저 검사 범위다.

## 작성자 검사와 경계

`node scripts/check-korean-wordle-records.ts` — 순수 11그룹 PASS. strict schema/중복키/미래·legacy 첫 유효/보호 예산/전체 통계 대조/prefix·분기·unrelated 보존/quota/CAS/writeUnknown/지연락/semantic completion/타이머/copy ABA.

`node scripts/check-korean-wordle.ts` — 기존 사전·조합·채점·seed·통계·격자 회귀 PASS.

`node docs/verify/2026-11-17-repeat-batch42/check-wordle-parent.mjs` — 실제 부모 8그룹 PASS. Strict replay·초기0쓰기, 빠른 중복 Enter/성과 한 번/새 연습, 저장 실패·writeUnknown 메모리 유지/확인 재조회, 두 실제 host 동일 append와 분기, 옛 날짜 lock/재조회·unmount, 자정 뒤 이전 timer, 40일 전체통계/30행/복사 ABA·memo, ShareResult 경계와 가짜 명시 이름 제출.

`node docs/verify/2026-11-17-repeat-batch42/check-wordle-children.mjs` — 실제 자식 KO/EN 2그룹 PASS. 완료/미완료 행·스포일러 없는 전체 결과·선택/복사 및 수동 선택 실패/재시도/닫기.

마지막 보완은 부모 8그룹 안의 `failed saves`/`latest30` 두 그룹만 영향 재실행 PASS했다. 그룹 수에 중복 합산하지 않았다. 원본 baseline 5개의 SHA/관측은 `before-fix.json` 그대로 보존한다. null/잘못된 guesses 2건은 부모 첫 그룹, 거짓 복사 성공은 7번째, 이전 공개 callback은 2·6번째 그룹에서 새 실제 부모로 확인했다. 작성자 host는 실제 제품 코드를 번들하고 DOM/clock/storage/Clipboard/lock/RPC만 제어하며, 실제 브라우저 결과를 대신하지 않는다.

최종 범위 lint: `npx eslint src/components/KoreanWordle.tsx src/components/KoreanWordleHistory.tsx src/components/KoreanWordleCopyRecovery.tsx docs/verify/2026-11-17-repeat-batch42/wordle-parent-harness.mjs docs/verify/2026-11-17-repeat-batch42/check-wordle-parent.mjs docs/verify/2026-11-17-repeat-batch42/check-wordle-children.mjs` — exit 0, 오류/경고 0. 준비 순수/검사 5파일 lint exit 0도 유지한다.

실제 사용자 저장소·공개 RPC·Chrome·전체 tsc·build·deploy·git 작업은 작성자가 실행하지 않았다. 이후 독립/브라우저 발견은 우선 수정하며 전체 타입은 통합 담당만 실행한다.
