# 31차 순서 공개·결과 반출 — 연결 설계

2026-11-17 KST. root의 31차 계획과 taxi의 `decision-order-design-note.md`, 실제 `DecisionTools.tsx`를 읽어 연결 경계를 확정한 문서다. 처음 작성 당시 읽기 전용이었다. CSV/29 체크포인트 05:26:25 KST 통과 뒤 root가 신규 미연결 모듈 준비를 승인했다. 현재 준비 결과는 `decision-order-preparation.md`에 별도 기록하며 기존 부모·공용 번역은 수정하지 않는다.

## 확인한 영향 경로

- `/order-picker/OrderPickerClient.tsx` → `DecisionTools initialTab="order" single`.
- `/roulette/` → `DecisionToolClient.tsx` → `DecisionTools initialTab="roulette" single`.
- `/menu-roulette/page.tsx` → 같은 부모의 `menuMode/defaultPreset`. 일반 공유 부모의 탭 UI도 보존하되, 이 세 페이지의 현재 진입은 single이므로 탭 전환은 실제 부모 fixture에서도 따로 검사한다.
- 순서 상태는 부모의 `orderResult/revealedCount/isShuffling/isRevealing` 네 곳에 분산되어 있다. `startOrder`의 400ms/500ms await에 취소가 없고 `revealAll/resetOrder`는 상태만 바꾼다. 복사 버튼은 전부 공개된 때만 보이지만 `copyOrderResult` 함수 자체에는 이 조건이 없다.
- `addOrderItem/removeOrderItem`과 입력 Enter는 진행 중에도 허용된다. 기존 입력은 추가 시 trim/빈 값 제외, 최소 2명, 입력 maxLength 20이며 중복 이름을 허용한다. URL 복원에는 별도 이름 길이/인원 상한이 없으므로 이번 기능에서 임의로 저장 데이터나 URL 명단을 잘라내지 않는다.
- `copyRouletteResult/copyOrderResult`는 legacy 반환값을 무시하고 성공 처리한다. `spin`, 룰렛 항목 추가/삭제·프리셋, `persistMeals` 성공이 결과를 지우므로 새 copy 세대의 무효화 지점이다.

## 제안 파일/API

| 파일 | 최소 책임 |
| --- | --- |
| `src/utils/orderReveal.ts` 신규 | 순열 snapshot, 공개 상태·예약 소유권. React/DOM/저장소에 의존하지 않음 |
| `src/utils/decisionResultActions.ts` 신규 | 완전 공개 검사, 순서 문자열 snapshot, 공통 최신 복사 guard, true/false/stale 처리, 고정 파일명 TXT/URL 정리 |
| `src/components/DecisionResultCopyRecovery.tsx` 신규 | readOnly 원문·전체 선택·재시도·닫기, KO/EN 텍스트와 유효한 focus 복귀 |
| `src/components/DecisionTools.tsx` 최소 연결 | 기존 순서 상태/await loop를 controller snapshot으로 대체, 편집/반출 handler guard, 자동/수동 공개 UI, 룰렛 복사 연결 |
| `scripts/check-order-reveal.ts`, `docs31/check-decision-order-parent.mjs` 신규 | 순수 전이·실제 부모 이벤트와 기존 메뉴/룰렛 영향 회귀 |
| `docs31/translations-decision-order.json` 신규 | `decisionTools.order`의 모드/진행/잠금/TXT 안내와 공통 복구 문구 ko/en 조각. canonical 병합은 integrate |

컨트롤러 후보 API는 `createOrderRevealController({ shuffle, schedule, cancel, onChange })` → `getSnapshot/start/setMode/revealNext/revealAll/reset/setActive/dispose`다. 공개 snapshot은 readonly `{ runId, phase, mode, items, revealedCount, active }`, phase는 `idle | shuffling | revealing | complete`, mode 기본값은 `auto`다. `items`는 클릭 시 명단을 복사해 기존 `utils/password.shuffle`을 **정확히 한 번** 호출한 결과다. 동일 이름도 항목 수를 유지하며 Set으로 바꾸지 않는다.

`runId`는 추첨 식별, 내부 `scheduleGeneration + 자기 timeout ID`는 예약 소유권으로 분리한다. mode/tab 변경은 runId와 순열을 보존하며 예약만 교체한다. 취소한 timeout이 큐에서 늦게 실행되어도 새 예약을 지우거나 공개 수를 바꿀 수 없다. 한 시점에는 timeout 하나만 유지하며, 콜백은 소유한 예약을 해제한 뒤 상태 전이→다음 예약 순으로 실행한다. 동기 `onChange` 재진입으로 reset/탭 전환한 경우에도 다시 예약하지 않도록 전이 뒤 세대를 재확인한다.

## 동작 정책

| 동작 | 결과 |
| --- | --- |
| 새 추첨 | active이고 idle/complete, 2명 이상일 때만. 명단 복사·shuffle 1회·count 0·shuffling. auto는 400ms 뒤 revealing, manual은 예약 없이 명시 공개를 기다림. 같은 프레임의 중복 클릭도 현재 controller phase로 거부 |
| 자동 공개 | revealing 진입 뒤 500ms마다 다음 한 명. 마지막에서 complete. 공개 수는 같은 run에서 감소하지 않음 |
| 수동 공개 | manual의 shuffling/revealing에서 다음 한 명 버튼. shuffling에서도 고정된 첫 명을 공개할 수 있어 탭 복귀 뒤 멈추지 않음. 마지막 이후는 no-op이며 새 shuffle 없음 |
| 모두 공개 | revealing 또는 manual shuffling에서 소유 예약 취소, 같은 순열을 count=length/complete로 변경. 버튼뿐 아니라 handler도 phase/active/run 검사 |
| 자동↔수동 | 모드만 바꾸며 순서/count 유지. 자동→수동은 예약 취소, 수동→자동은 phase에 따라 shuffling 400ms/revealing 500ms 하나를 새로 예약. complete의 모드 변경은 숨기거나 다시 추첨하지 않음 |
| 초기화 | shuffling부터 항상 사용 가능. 결과·예약·복사 안내 초기화, 명단/선택 공개 모드는 보존 |
| 명단 편집 | shuffling/revealing 동안 입력·추가·삭제·Enter 모두 UI와 handler에서 잠금. idle/complete의 **실제 추가·삭제**는 결과/복사 snapshot 무효화. 추가 입력의 미확정 문자열만 편집한 때는 현재 결과를 지우지 않음 |
| 다른 도구 탭 | `setActive(false)`로 예약·복사 세대 취소, phase/순열/count 보존. 돌아오면 auto만 shuffling 400ms/revealing 500ms 하나를 새로 예약하고 manual은 예약 0으로 명시 공개를 기다림. 숨겨진 동안 경과분을 몰아서 공개하지 않음 |
| 언어 변경 | 명단/순열/count/mode 유지. 변경된 반출 문자열과 기존 copy 요청을 분리하고 안내만 번역 |

탭 이탈 시 보존/재개와 manual shuffling의 다음 한 명/모두 공개는 **root가 확정했다**. 브라우저 문서가 background로 바뀌는 별도 pause 기능은 이번 범위에 넣지 않는다. 기존 동작처럼 native timer가 지연되면 순서대로 한 명씩 이어가며 타이머 지연을 난수 재생성으로 처리하지 않는다.

React effect cleanup에서는 예약·복사·download 소유권을 무효화한다. StrictMode setup→cleanup→setup에서 ref에 영구 dispose된 controller만 남기지 않도록, 재활성화 가능한 inactive 상태와 최종 dispose를 구분하거나 setup 때 controller를 다시 연결한다. state/ref epoch를 cleanup 한쪽에서만 증가시키지 않는다. 실제 effect replay 후 첫 추첨·복사 가능 여부를 필수로 검사한다.

## 반출·접근성

- 순서 반출은 `phase === complete && revealedCount === items.length && items.length >= 2 && active`를 **UI와 copy/TXT handler 양쪽**에서 검사한다. 이전 complete handler를 잡아뒀다가 reset/new draw 뒤 호출해도 현재 run 검사를 통과하지 못한다. 숨긴 이름은 DOM의 data/aria 속성이나 복구 textarea에도 넣지 않는다.
- `createOrderResultSnapshot`은 기존 `t('order.copyLine', { rank, name })`를 줄바꿈으로 이어 붙인다. 같은 snapshot을 Clipboard와 UTF-8/no BOM TXT로 사용하고 파일명은 `presentation-order.txt`로 고정한다. 다운로드 실패 안내 후 결과는 보존하며 URL은 실패/지연 회수/언마운트에 정확히 한 번 해제한다.
- 룰렛·순서는 부모 하나의 최신 복사 세대를 공유한다. 요청 당시 문자열/대상/run 또는 결과 identity/현재 탭/마운트 상태를 확인한다. native 성공 또는 legacy 정확한 true만 성공이고, 늦은 rejection이면 legacy fallback 자체도 실행하지 않는다. 이미 OS에 제출한 native 복사를 되돌린다고 주장하지 않는다.
- 성공 2초 타이머도 자기 요청 소유권을 확인한다. 새 요청·결과·실제 목록 변경·reset·탭·언어로 반출 문자열 변경·복구 닫기·이탈에서 이전 복구/성공 표시를 정리한다. 복구 child는 전체 readOnly 원문 선택·재시도·닫기만 담당한다.
- 자동/수동 선택·다음/모두 공개·초기화·반출은 min-height 44px, 추가 입력 16px. 진행 버튼은 같은 key/DOM을 유지하고 마지막 공개에서 활성 copy 또는 reset으로 유효한 focus를 보낸다. 카드 전체의 `aria-live`는 별도 짧은 진행 상태로 바꿔 매 tick 전체 명단을 반복 낭독하지 않는다. 좁은 화면의 긴 이름/버튼 줄바꿈과 reduced-motion 장식 감소를 적용한다.
- 순서 카드/수정 버튼의 기존 gradient·색 직접 지정은 이번 변경 영역에서 토큰으로 정리하되 룰렛 canvas 팔레트/이미지 구성을 일괄 변경하지 않는다. 명단 카드 위 `MobileResultLink`와 결과 id/scroll offset을 연결한다.

## 보존 범위와 확인할 회귀

룰렛의 4,200ms RAF·각도/결과 계산·confetti·PNG 600×340 생성, `utils/password.shuffle`의 난수 구현, 기존 `order/roulette` comma URL 형식은 그대로 둔다. URL은 **현재도 명단을 자동 sync**하므로 새 privacy 문구에서 기존 URL까지 없다고 설명하지 않는다. 순열/공개 mode/copy 원문을 신규 URL·storage·서버에 추가하지 않는다. 새 진입 동의·계정·패키지·route는 필요 없다.

`MealPlanPanel.copyWeek`는 이미 legacy false를 확인하고 revision으로 자기 안내를 보호한다. 이번 부모 guard와 병합하지 않으며 사이트 전체 Clipboard가 직렬화된다는 보장을 하지 않는다. `MEAL_HISTORY_KEY`, 계획 key, raw 비교/readback, `addMeal` boolean, 최근 제외와 날짜 기준은 유지한다. 메뉴 저장 성공으로 `spinResult=null`이 된 경우 복사 snapshot만 무효화한다.

필요 검증은 다음 묶음으로 제한한다.

1. 고정 shuffle 포트: 중복 포함 multiset/정확한 한 번 호출, auto/manual/complete 전환, 순서/count 불변, 동기 중복 클릭·예약 소유권·timer ID 재사용·onChange 재진입.
2. 캡처한 400/500ms callback을 취소 뒤 강제 실행: 모두 공개/reset/새 추첨/탭/이탈이 되돌아가지 않음. 같은 run count 단조 증가와 StrictMode 재설정 후 초기 동작.
3. 실제 부모: 모든 명단 편집 경로 잠금, 완료 뒤 실제 명단 변경만 무효화, locale 보존, 기존 URL 초기 복원·sync, 탭 복귀 같은 순열, 옛 handler의 반출 차단.
4. 실제 Blob/TXT 및 Clipboard port: 공개 전 요청 0, 완료 뒤 같은 문자열/바이트, native/legacy true/false, 두 대상 역순 완료·늦은 거절·닫기·새 결과·타이머·이탈, 다운로드 실패와 URL 회수.
5. 메뉴/룰렛 영향: 합성 저장 raw bytes 불변·후보 제외·주간 계획 props/먹은 기록 저장 boolean·기존 PNG 경로. 순서 reset이 룰렛 RAF를 지우지 않음.
6. verify 단독 Chrome: 실제 자동/수동/전체 공개와 충분히 늦은 timer, native 복사와 다운로드, Tab/Enter/Space·실제 focus·320px KO/EN·reduced motion. controlled fixture를 실제 DOM/Clipboard 검증으로 집계하지 않음.

기존 부모 연결은 별도 체크포인트 신호를 따른다. 미연결 준비 상태와 실제 실행한 검사만 별도 준비 보고서에 기록한다.
