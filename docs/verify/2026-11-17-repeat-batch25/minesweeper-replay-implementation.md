# 25차 B — 같은 지뢰판 연습 구현 결과

2026-11-17 KST. 24차 브라우저·전체 타입 검사 체크포인트 뒤 `Minesweeper.tsx` 부모 연결과 자체 검사를 완료했다. 이 문서는 미연결 준비 문서 이후 상태다. 제품 TS는 고정했고 독립 검토·전체 타입 검사 결과를 기다린다. 검증 담당의 실제 브라우저는 6/6 PASS·추가 결함 0·Chrome 종료 통지를 받았다.

## 현재 구현

- 기존 첫 열기에서 순수 source를 캡처하고, 종료한 클래식 판에서만 같은 배치·first·noGuessFailed의 새 연습 상태를 만든다.
- 같은 first는 자동으로 열고 다음 유효 행동에서 시계를 시작한다. 첫 펼침으로 완성된 판은 0ms/0clicks 승리로 즉시 표시한다.
- 연습 finish는 소리/축하 뒤 모든 achievement/BEST/daily/리더보드 경로 전에 반환한다. 모달 eligibility는 일반 preset 승리만 생성하며 제출 직전에도 현재 판 generation을 재검사한다.
- 판 교체·모드/난도·custom 적용·unmount는 timer 및 제출 eligibility를 무효화한다. 보드 DOM key도 generation으로 교체한다. 같은 선택의 classic/난도 버튼도 연습을 종료한다.
- Clock의 기존 render `Date.now()` purity 오류를 interval에서 읽는 state로 최소 보완했다. 시간 정책과 47ms 주기는 유지한다.
- KO/EN fragment는 `translations-minesweeper.json` 각 10키이며 통합 담당이 이미 병합했다. 추가 키는 없다.

## 자체 검증 결과

준비 순수 도메인 `scripts/check-minesweeper-replay.ts` **11그룹 PASS**(순수 파일은 준비 후 불변). `node scripts/check-minesweeper.ts` 기존 생성·솔버·일일/기록 계산 회귀 **PASS**.

`node docs/verify/2026-11-17-repeat-batch25/check-minesweeper-replay-component.cjs`: 실제 부모/Clock **11그룹 PASS**.

1. 일반 preset 승리의 achievement·BEST·qualifies·제출 유지와 중복 제출 callback 1회 제한.
2. 연습 승리/패배/반복 후 최초 칸·동일 펼침·generator 1회·저장 bytes 및 모든 기록 포트 불변.
3. 재연습 후 이전 모달 제출 0회, 이미 시작된 일반 제출의 늦은 완료에서 이름 저장 0회.
4. 무효한 첫 열린 칸 클릭은 0ms 유지, 유효한 깃발에서 시작, 물음표와 시계 재연습 초기화.
5. 같은 classic 탭/같은 난도/새 판/연습 종료/다른 난도/custom/일일 왕복은 일반 판으로 복귀.
6. 작은 판 최초 펼침 즉시 승리·반복은 0ms/0clicks이며 custom 적용으로 탈출.
7. 무추측 생성 실패 표시가 재연습에도 보존되고 generator 재호출 없음.
8. 이전 timer·pointer/mouse/context/key callback 차단, 현재 touch long press·keyboard 조작 유지.
9. pointer cancel/이동 후 이미 큐에 있던 timer 차단, 일반 우클릭과 IME 제외 유지.
10. 일일 완료는 기존 기록 경로를 유지하고 연습 진입 버튼 없음.
11. 실제 Clock의 시작 0·47ms interval 갱신·종료 시각 고정·다음 ready 0 확인.

제품/순수/도메인/부모 fixture 4파일 scoped ESLint **오류 0/경고 0**. 초기 기존 Clock render purity 1건은 위 최소 변경으로 해소했다. 초기 검사 fixture의 default export mock 누락, Clock 단독 fixture의 미사용 hook 외부 처리 누락은 검사 포트만 바로잡았고 제품 결함으로 집계하지 않았다.

공개 RPC와 실제 브라우저는 실행하지 않았다. 기록·음향·리더보드 포트는 자체 검사에서 mock한다. 단일 Chrome은 검증 담당, 전체 tsc는 통합 담당이다.

검증 담당의 별도 브라우저 6흐름은 실제 React game 읽기와 UI 클릭으로 배치/first/리셋·유효 조작 시계, 연습 win/loss 무기록·정상 win 기록, 같은 난도/classic/daily와 5×5 자동 완료, 늦은 submit/pointer·새 입력, 320px KO/EN을 확인했다. 공개 전송은 0, 정상 제출 1회는 로컬 mock이다. 이 결과를 자체 Node 11그룹과 합쳐 같은 검사를 중복 집계하지 않는다.

이미 시작된 정상 일반 점수 RPC를 연습 진입 후 서버에서 취소하거나 되돌릴 수 있다는 보장은 하지 않는다. 새 연습·이전 미실행 제출 callback은 전송하지 않고, 이전 요청의 완료에서 새 이름 저장을 하지 않는다. 클라이언트의 연습 제외이며 서버 부정행위 방지 기능은 아니다.

## 검증 선택자

보드 `[role=grid]`의 `data-minesweeper-status`, `data-minesweeper-practice`, `data-minesweeper-generation`, `data-minesweeper-first`, `data-minesweeper-clicks`. 지뢰 배열을 DOM 속성으로 공개하지 않는다.

버튼은 `[data-minesweeper-replay]`, `[data-minesweeper-exit-practice]`, `[data-minesweeper-new-game]`, `[data-minesweeper-difficulty="beginner|intermediate|expert|custom"]`. 개별 칸은 기존 `[data-i]`다.
