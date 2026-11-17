# 25차 B 미연결 순수 준비 결과

2026-11-17 KST. 23차 전체 타입 검사 통과 뒤 신규 준비 단위만 작성했다. **기존 `Minesweeper.tsx`는 변경하지 않았고 24차 체크포인트 전 연결하지 않는다.** 생성/솔버/achievement/leaderboard/RPC도 변경하지 않았다.

## 준비 파일

- `src/utils/minesweeperReplay.ts`
- `scripts/check-minesweeper-replay.ts`
- `docs/verify/2026-11-17-repeat-batch25/translations-minesweeper.json` (ko/en 각 10키)

`ClassicReplaySource`는 `{ difficulty,w,h,mines,first,noGuessFailed,mine,count }`이며 원 배치의 readonly 복사본이다. `captureClassicReplaySource`는 생성 layout을 캡처하고 `cloneClassicReplaySource`는 깊은 복사와 freeze를 수행한다. 기존 범위인 5~30열/5~24행/지뢰1~N-9, 배열 길이·조밀성·boolean, 인접 지뢰 count, 안전한 first, preset 크기/지뢰 수를 확인한다. 잘못된 입력은 `invalidClassicReplaySource` 오류다. 내부 방문 메모리용이며 저장·URL schema가 아니다.

`createClassicPractice`는 layout/open/marks를 새로 만들고 같은 first를 기존 `openCell`로 연다. source와 재연습의 layout 배열을 공유하지 않는다. 반환값은 `practice:true`, `replaySource`, `first`, 기존 Game에 넣을 필드들이다. 부모에서 generation만 별도로 부여하면 된다. `boom=-1`, `start=end=clicks=0`, marks는 모두0이며 noGuessFailed는 원 값이다.

첫 펼침만으로 모든 안전 칸이 열리면 `status:'won'`, 아니면 `status:'ready'`다. 자동 완료에서도 사용자 깃발은 만들지 않고 time/click은0이다. 부모는 이 결과를 일반 finish 기록 경로에 넣지 않으며, 기존 `game.start>1` 결과 표시 조건을 연습의 즉시 완료까지 포함하도록 연결해야 한다.

## 연결에 사용할 guard

| API | 의미 |
|---|---|
| `canPracticeClassic(mode,status,source)` | 종료한 classic + 유효 source만 진입 |
| `shouldRecordMinesweeperResult(round)` | 일반 classic/daily 종료 결과만 기록 허용; practice는 자동 완료도 false |
| `isCurrentMinesweeperInput(expected,current)` | 유효한 같은 판 generation만 입력 허용 |
| `createMinesweeperScoreEligibility(round)` | 일반 classic preset won의 frozen `{generation,difficulty,ms,seconds}` 또는 null |
| `canSubmitMinesweeperScore(eligible,currentRound)` | 현재 판이 여전히 같은 일반 승리·난도·시간인지 재확인 |

`MinesweeperRoundContext`는 `{generation,mode,difficulty,practice,status,start,end}`다. 점수 seconds는 기존 `Math.max(1,Math.ceil(ms/1000))`를 그대로 사용한다. 리더보드 서버 최소 시간 검증을 새로 바꾸지 않는다.

이 helper를 만들었다고 기록 차단이 이미 UI에서 동작하는 것은 아니다. 후속 부모 연결은 finish의 모든 기록 호출보다 앞에 record guard를 배치하고, 모달 노출/제출 callback 양쪽에 eligibility를 적용해야 한다. input guard 역시 timer/click/contextmenu/keyboard 및 교체/unmount 세대와 연결해야 한다. 기존 hooks나 서버를 바꾸지 않는다.

## 검사 결과

`node --experimental-strip-types scripts/check-minesweeper-replay.ts`: **11그룹 PASS**.

1. preset 3종 × 모서리/중앙 3개 × seed 3개의 원 배치·count·first·noGuessFailed 보존.
2. 원 생성 배열 변경 후 snapshot 불변, clone 참조 분리 및 freeze.
3. 이전 연습의 layout/open/marks를 변경해도 재연습/source가 불변이며 clock/boom/clicks 초기화.
4. 기존 flood fill과 동일한 first/open/marks.
5. 5×5/지뢰1 판의 자동 완료 0ms/0clicks.
6. 잘못된 크기·지뢰 수·안전하지 않은 first·다른 preset·sparse/타입/count 배열 거부.
7. 종료 classic만 연습 진입.
8. 일반 win/loss 기록 허용과 모든 practice 기록 제외.
9. 일반 점수 반올림 보존 및 daily/custom/loss/practice/잘못된 시계 제출 제외.
10. 이전 모달 snapshot의 판/시간/난도/모드/연습 변경 후 제출 제외.
11. 현재 입력 generation과 stale/비정상 token 구분.

신규 TS 2파일 scoped ESLint **오류 0/경고 0**. ko/en 신규 10키 구조 일치. 기존 생성/솔버 함수는 미변경이므로 전체 기존 도메인 검사는 이 준비 단계에서 반복하지 않았다. 실제 부모/기록 bytes/모달·포인터 경합/브라우저 검증은 후속 연결 후 수행한다. 전체 tsc·Chrome·빌드·점수 RPC 실행은0회다.

준비 파일은 안정화 후 편집 중지한다. 24A PDF 독립 검토 요청이 우선이며, parent 연결은 24차 체크포인트와 명시 소유권 신호 이후다.
