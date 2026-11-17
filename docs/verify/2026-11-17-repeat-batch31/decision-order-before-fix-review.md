# 31차 실제 부모 공개 경합 — 수정 전 재현

2026-11-17 KST. 28/30 native 검증 대기 중 root 지시로 작성했다. **기존 DecisionTools와 신규 준비 TS는 모두 수정하지 않았다.** 실제 부모를 읽기 bundle하고 고정 shuffle·제어 타이머·가벼운 React hook host로 이벤트를 실행했다. 브라우저/실제 DOM 재현으로 주장하지 않는다.

## 재현과 새 기대값

| 실제 이벤트 순서 | 현재 부모 관찰 | 수정 후 같은 fixture의 기대 |
| --- | --- | --- |
| 추첨→400ms→첫500ms(1명 공개)→모두 공개→이전500ms callback | 공개4명→2명, 전체 복사 버튼 사라짐 | 4명·복사 가능 상태 유지 |
| 추첨→400ms→첫500ms→초기화→새 추첨→옛500ms→새400ms | 새 추첨 자체의 첫500ms 전 이미2명 공개 | 공개0명, 자기 첫500ms를 기다림 |

첫 사례의 shuffle은1회, 두 번째는 명시 추첨2회에 정확히2회다. 이름은 기존 번역 기본 참가자만 사용했고 증거에는 인원수/상태만 기록했다. 두 번째는 reset 직후 빈 화면에 숨은 오래된 count가 **다음 추첨의 화면에 실제로 영향을 주는 경로**까지 확인했다.

근본 원인은 현재 `startOrder`의 Promise/timeout 루프가 예약 소유권을 가지지 않는 것이다. `revealAll/resetOrder`는 기존 loop를 취소하지 않아 이전 `setRevealedCount(i)`가 새 상태를 변경한다. count가 줄어도 isRevealing은 false여서 공개 제어 버튼도 사라질 수 있다.

## 파일과 실행 근거

- `decision-order-race-harness.mjs`: 실제 `src/components/DecisionTools.tsx` 실행, 기존 공용 component-harness는 읽기 재사용. 부모 `@/utils/password.shuffle` 포트만 reverse 순열로 고정하고 호출 수를 관찰한다. 네이티브 setTimeout/setInterval 예약을 캡처하므로 취소된 콜백도 의도적으로 다시 실행할 수 있다. 메뉴 child는 관련 없는 hook 실행을 피하기 위한 props 포트이며 제품 알고리즘 assertion으로 대체하지 않는다.
- `check-decision-order-races.mjs`: 두 actual-parent 이벤트 시나리오. 기본값은 **수정 전 결함 재현 모드**이고 제품 PASS로 출력하지 않는다.
- `decision-order-before-fix.json`: 당시 부모 SHA-256과 두 관찰값/예상 수정값. 제품 수정 후에도 덮지 않고 보존한다.
- `node docs/verify/2026-11-17-repeat-batch31/check-decision-order-races.mjs --write-evidence` → **두 결함 재현, exit0**. 이는 현재 정상이라는 검사가 아니다.
- `node docs/verify/2026-11-17-repeat-batch31/check-decision-order-races.mjs --expect-fixed` → **예상대로 exit1**, 첫 사례 `2 !== 4`. 수정 후에는 같은 명령이 통과해야 한다. `--expect-fixed --write-evidence`는 별도 after-fix 파일만 생성한다.
- JS2파일 scoped lint **exit0, 오류0·경고0**.

부모 연결 때 `data-order-draw/reveal-all/reset/copy`, 공개 수를 담는 `data-order-revealed-count`가 있으면 같은 fixture가 사용한다. 현재 부모에서는 기존 라벨/카드의 실제 표시된 이름 span을 세어 확인한다. 기존 RNG 구현을 바꾸지 않고 부모에서 현재 shuffle 포트를 controller에 전달하면 고정 RNG 검사도 그대로 이어진다.

## 메뉴·주간 계획·룰렛 읽기 대조

- `DecisionTools.persistMeals`는 현재 raw 비교→parse→setItem→readback을 수행하고 성공 boolean을 반환한다. 성공 시 spinResult를 지운다. 순서 연결은 이 저장 경로/key/schema와 최근 제외 집합을 바꾸지 않고, 결과가 사라질 때 복사 snapshot만 무효화해야 한다.
- `MealHistoryPanel`은 records/excludeDays/today/ready/busy/pick/candidates와 onAdd/onDelete/onExclude를 받는다. `MealPlanPanel`은 같은 wheelItems 후보와 history를 받으며 주간 계획은 별도 key/초안/revision·CAS를 유지한다. 순서 조작으로 저장 bytes나 이 props 의미를 바꾸지 않는다.
- `MealPlanPanel.copyWeek`는 legacy false를 검사하고 revision이 같은 경우에만 안내를 갱신한다. 부모의 새 복구 흐름에 통째로 합치지 않는다. 부모 룰렛/순서 복사만 공통 guard를 쓰는 범위와 별개다.
- 룰렛은 기존4200ms requestAnimationFrame, angleRef/rafRef/confettiRafRef, 마지막 wheelItems 기반 결과 계산을 쓴다. resetOrder 또는 order 탭 예약 취소가 이 RAF를 취소하지 않아야 한다. `copyRouletteResult`는 현재 false/예외 처리가 부족하므로 예정된 공통 copy guard/복구 범위에 포함한다. 기존 PNG600×340 생성/저장 경로는 유지한다.

메뉴/룰렛 위 항목은 이번에 읽기 대조만 수행했으며, 실제 회귀 PASS로 집계하지 않는다. 현재 상태는 **미연결 준비12그룹 PASS + 별도 기존 부모 결함2건 재현**이다. 부모 구현은 28/30 체크포인트 뒤 별도 신호를 따른다.
