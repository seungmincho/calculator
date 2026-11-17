# 31차 순서 공개·반출 — 미연결 준비

2026-11-17 KST. CSV/29 전체 타입 체크포인트 05:26:25 KST 통과 뒤 root 승인으로 신규 모듈만 작성했다. **DecisionTools 부모·룰렛/메뉴·URL·공용 번역·메타는 변경하지 않았다.** 기존 사용자 화면에는 아직 연결되지 않았다.

## 준비 파일/API

- `src/utils/orderReveal.ts`: `OrderRevealSnapshot`, `createOrderRevealController`, `isOrderBusy`, `canRevealNext/canRevealAll/canExportOrder`.
- controller: `getSnapshot/start(items, expectedRun?)/setMode/revealNext(expectedRun?)/revealAll(expectedRun?)/reset(expectedRun?)/setActive/dispose`. `start`는 기존 password.shuffle을 주입하지 않으면 그대로 사용한다. 생성 시 자동 추첨/예약은 없다. 기본 모드는 auto, 생성 두 번째 인자로 초기 active를 지정할 수 있다.
- 한 run의 readonly 순열을 한 번 정한다. auto shuffling 400ms→revealing 500ms 간격, manual은 예약 없이 shuffling에서도 다음/모두 공개 가능하다. 탭 이탈은 phase/순열/count 보존, 복귀 auto만 해당 phase의 새 예약 하나를 만든다. mode 전환/복귀는 shuffle을 호출하지 않는다.
- `runId`와 예약 세대/자기 reservation identity를 분리한다. 이미 취소한 콜백·동일 native timer ID 재사용·옛 run handler·동기 onChange 재진입을 거부한다. 부모 effect replay는 `setActive(false/true)`를 사용하고 최종 dispose한 controller를 재사용하지 않는다.
- `src/utils/decisionResultActions.ts`: 완전 공개 snapshot 생성, 룰렛 snapshot 생성, 두 대상의 공통 요청 guard, Clipboard true/false/stale, UTF-8 TXT/Blob URL 관리. 고정 파일명 `presentation-order.txt`, no BOM. snapshot에는 원문과 대상/runId만 담으며 저장소/네트워크/URL 검색 파라미터를 사용하지 않는다.
- `src/components/DecisionResultCopyRecovery.tsx`: readOnly 원문, 명시 전체 선택, 선택 실패 안내, retry/busy/close. 16px textarea·44px 버튼. 부모가 현재 snapshot과 세대를 검사하고 닫기 뒤 focus를 복귀시키는 연결은 아직 남아 있다.
- `translations-decision-order.json`: decisionTools.order/resultActions의 **20개 ko/en leaf** 조각. 원본 messages 병합은 아직 요청하지 않았다.

## 실행한 검사

- `node --experimental-strip-types scripts/check-order-reveal.ts`: **10그룹 PASS**. 중복 포함 immutable 순열·shuffle 1회, auto/manual 단조 공개, shuffling 수동 탈출, 탭 보존/새 예약, 취소 callback/timer ID 재사용, 동기 재진입/재활성화, 완전 공개 전 snapshot 차단, literal·번역 문자열, Clipboard true/false/throw/역순 완료, 실제 TXT UTF-8 바이트·고정명·URL 정확 1회 회수·실패 후 재시도.
- `node docs/verify/2026-11-17-repeat-batch31/check-decision-copy-recovery.mjs`: **KO/EN 실제 child 2그룹 PASS**. 원문/readOnly·명시 선택과 실패·retry/busy/close·폭/크기 클래스. 제어 host ref 검증이며 실제 DOM focus/Clipboard 검증으로 주장하지 않는다.
- 5파일 scoped lint: 최종 **오류0·경고0**. 첫 실행의 검사파일 prefer-const 1건만 수정하고 해당 파일 exit0 재확인. 제품 파일에는 lint 경고/오류가 없었다.

## 연결 이후 남은 검증

실제 부모 state를 controller snapshot으로 대체하고 UI와 handler가 같은 can* 함수를 사용하도록 연결해야 한다. 추가/삭제/Enter 잠금, 명단 실제 변경 후 reset, 옛 complete handler 차단, 탭/locale/결과 변경 뒤 copy 취소·2초 알림 소유권·유효 focus 복귀를 실제 부모로 검사한다. shared copy guard는 DecisionTools의 룰렛/순서만 소유하며 MealPlanPanel의 별도 복사 구현은 바꾸지 않는다.

기존 명단 URL 자동 sync, 룰렛 RAF/각도/PNG, 최근 메뉴 제외·기록·주간 계획 raw bytes를 영향 회귀로 확인한다. 실제 native Clipboard·다운로드·320px KO/EN·키보드·reduced motion은 verify 단독 Chrome, 전체 타입 검사는 integrate 담당이다. 빌드·배포·커밋은 실행하지 않는다.

신규 TS/검사 단위를 안정화했으며 **편집 중지(freeze)** 상태다. 부모 연결은 root의 별도 실행 신호를 기다린다.
