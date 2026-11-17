# 31차 순서 공개·복사 복구 — 읽기 메모

2026-11-17 KST. 27차 최종 체크포인트 대기 중 읽기만 진행했다. **제품/신규 TS/공용 번역 수정·브라우저 실행 없음.** CSV 성능 부모 연결 신호가 오면 그 작업을 우선하며31차는 별도 배정 뒤 구현한다.

## 실제 연결과 기존 경합

- `/order-picker/OrderPickerClient.tsx`는 `DecisionTools initialTab="order" single`, `/menu-roulette/`는 같은 부모의 menuMode/defaultPreset을 쓴다. 새 순서 UI를 독립 페이지 파일에만 넣으면 공유 부모의 경합이 남는다.
- `startOrder`(현재444줄 부근)는400ms await 뒤 `shuffle(orderItems)`1회, 이후500ms await마다`setRevealedCount(i)`를 실행한다. timer id와 세대 확인이 없어 `revealAll` 뒤 다음 i가 공개 수를 다시 줄일 수 있고 reset 뒤 남은 루프가 count/isRevealing을 바꿀 수 있다.400ms 중 reset/new request가 겹치면 이전 shuffled 결과도 다시 생길 수 있다. 소스에서 확인한 경계이며 실제 browser 재현으로 집계하지 않는다.
- 추가/삭제 함수와 입력/삭제 버튼은 공개 중 잠금이 없다. 완료 뒤 명단 변경도 기존 결과를 지우지 않는다. 추첨 결과가 클릭 당시 명단의 snapshot인지 UI에서 구분하기 어렵다.
- `copyRouletteResult`와 `copyOrderResult`는 Clipboard 거부 뒤 execCommand 반환값을 무시한다. true 성공 표시와2초 타이머에 요청 세대가 없어 과거 완료·과거 성공 지우기 타이머가 새 결과를 건드린다. `copyOrderResult` handler 자체도 완전 공개 여부를 검사하지 않는다(UI 버튼만 조건부 표시).
- 순서명단 URL은 기존 `order` comma 형식, 룰렛은`roulette`다. restore effect는 URL sync보다 먼저 선언돼 초기 searchParams 클로저를 읽는다. 이번 읽기만으로 hydration 결함을 새로 단정하지 않으며, 형식/복원은 기존 공유 URL 회귀로 보존한다.

## 작은 컨트롤러 계약 제안

`orderReveal` 전용 순수 상태/예약 controller에 phase=`idle|shuffling|revealing|complete`, mode=`auto|manual`(기본auto), 입력 snapshot·한 번 정한 순열·revealedCount·generation·현재 timer id를 둔다. 기존 `utils/password.shuffle`을 주입 포트로 호출하고 RNG 자체는 변경하지 않는다. 이름 중복은 사람별 배열 항목으로 유지하며 Set/dedup을 적용하지 않는다.

재귀적으로 다음 timeout 하나만 예약하는 방식이 현재 await loop보다 작고 취소가 명확하다. 모든 callback은 자신의 generation과 예상 phase를 확인한다. clearTimeout만으로 이미 실행 큐에 든 callback을 막을 수 있다고 가정하지 않는다.

| 동작 | 상태/예약 |
| --- | --- |
| 새 추첨 | 이전 timer/복사 세대 취소. 명단 배열 복사와 shuffle1회, count0, shuffling400ms.400ms 뒤 auto는500ms 공개 예약, manual은 다음 버튼을 기다림 |
| auto tick | 현재 순열의 count+1만 공개. 완료면 complete, 아니면500ms 하나만 다시 예약 |
| 다음 한 명 | manual+revealing일 때만 count+1. 이미 complete/no result면 no-op. shuffle 다시 호출하지 않음 |
| 모두 공개 | 현재 timer/generation 무효화→count=result.length→complete. 이후 옛 callback은 no-op |
| auto→manual | count/result 보존, 자동 예약만 취소. 다음 한 명 버튼으로 계속 |
| manual→auto | count/result 보존, 다음 카드부터500ms 예약. complete에서는 no-op에 가까운 모드 설정만 |
| reset/새 명단 | timer/generation/복사 상태 초기화, result 제거. reset은 명단 유지 |
| unmount | dispose로 예약·모든 늦은 callback 종료. React state 갱신 금지 |

shuffling/revealing 중에는 명단 추가·삭제·입력 Enter 모두 UI와 handler에서 잠근다. completed/idle에서 명단이 실제 바뀌면 이전 결과와 복사 복구를 무효화한다.400ms 단계에서도 취소/초기화가 필요하면 reset 버튼을 보이게 한다. 중복 클릭은 render state 갱신 전에도 controller 현재 phase로 막는다.

**탭 전환의 작은 정책 제안**: 숨겨질 때 order 예약을 취소하고 순열/공개 수는 유지한다. 돌아왔을 때 auto면 새 generation으로 다음 공개 예약을 재개하고 manual이면 기다린다. 이미 complete 결과는 계속 보존한다. shuffling 중 떠났다면 같은 순열을 유지하며 표시 단계만 재개한다. 이 정책은 ‘숨은 탭에서 공개가 계속됨’을 막으면서 결과를 불필요하게 지우지 않는다. 최종 구현 전에 root와 확정한다.

CSS reduced-motion은 bounce/scale/transition을 줄이되 순열·count·manual/auto 의미를 바꾸지 않는다. 공개 버튼을 같은 DOM 위치/키에 유지하고 진행은 별도 짧은 aria-live로 알려 카드 전체 이름을 매 tick 반복 낭독하지 않게 한다. 카드 이름은 truncate 대신 wrap, 모바일1열 또는 충분한 min-width와44px 조작/16px 입력을 사용한다.

## 복사·TXT

- 룰렛/순서 두 대상은 Clipboard가 하나이므로 **공통 최신 copy request 세대**를 사용한다. result identity·language·active tab·컴포넌트 mounted 상태도 함께 확인한다. 이전 대상이 늦게 reject해 fallback으로 최신 대상 클립보드를 덮지 않게 한다.
- click에서 현재 문자열을 고정한다. native write 성공 또는 legacy exact true만 성공이다. fallback false/throw/API 없음이면 읽기 전용 전체 문자열·명시 선택/재시도/닫기를 제공한다. 성공 표시2초 타이머도 같은 token일 때만 상태를 지운다. 새 요청/결과/명단/reset/탭/언마운트에서 timer와 상태를 정리한다.
- 순서 handler 자체에서 phase complete와count===result.length를 검사한다. 숨겨진 순서는 복사/TXT에 포함하지 않는다. 완전 공개 뒤 같은 번역된 rank/name 문자열이 복사·UTF-8 TXT의 한 snapshot이다. 파일명은 고정 `presentation-order.txt` 같은 이름이며 참가자 문자열을 넣지 않는다. 다운로드 실패는 성공 표시하지 않고 결과는 유지한다.
- 메뉴 주간 계획(`MealPlanPanel.copyWeek`)은 이미 execCommand false 검사와 자체 revision guard가 있는 별도 구현이다. 해당 코드를 통합 교체하거나 이번 복사 guard가 사이트 전체 Clipboard를 직렬화한다고 주장하지 않는다.

## 룰렛/식사 기능 영향 제한

룰렛의4200ms requestAnimationFrame·각도/결과 계산·confetti·PNG600×340 생성은 순서 controller와 분리한다. 기존 RAF unmount cleanup을 유지하고 순서 reset이 룰렛 RAF를 취소하지 않게 한다. 룰렛 복사 token만 새 spin/결과 변경/항목 편집/프리셋에서 무효화한다.

`persistMeals`의 저장 직전 raw 비교/readback, `addMeal` boolean, 최근 제외 wheelItems, MealHistoryPanel·MealPlanPanel의 입력/기록/계획 key는 그대로 유지한다. 식사 기록 성공이 spinResult를 지우므로 이 경우에도 과거 룰렛 copy/복구 상태가 남지 않게 guard를 연결해야 한다. 새 순서 UI 때문에 menu mode에서 저장 schema나 후보 제외 집합을 다시 만들지 않는다.

회귀는 menuMode에 합성 기존 기록/계획 raw를 넣어 제외 결과와 bytes가 순서/복사 조작만으로 변하지 않는지 확인한다. 명시 먹은 기록 추가는 기존 성공 boolean/두탭 보호를 유지한다. 기존 룰렛 한 장 PNG/공유 URL도 영향 범위로 확인한다. 이전 스타일 전반이나 룰렛 RNG를 일괄 수정하지 않는다.

## 의미 있는 검증 초안

1. 고정 shuffle 포트로 중복 명단의 multiset과순열1회만 확인.400ms/500ms callback을 캡처해 clearTimeout 뒤에도 강제로 실행하여 reset/revealAll/new request/dispose의 stale 차단 검증.
2. auto→manual→auto 및 complete에서 모드 변경, 첫/끝 count 경계, 재개 순서와 count 단조 증가. 탭 숨김/복귀에서 같은 순열 확인.
3. 실제 부모 이벤트로 모든 명단 편집 경로 잠금·완료 뒤 변경 무효화·키보드 Enter/포커스/live 안내·locale 문구만 변경을 확인.
4. line→다른 copy target·늦은 reject/fallback·새 결과·reset·이전2초 알림타이머가 새 복사를 지우지 않는 경합과 readOnly 전체 선택/재시도.
5. 완전 공개 전 copy/TXT handler까지 차단, 공개 뒤 TXT bytes와copy 문자열·순서 일치. menu 저장 bytes/후보/기존 PNG 영향 회귀.

현재는 읽기 설계만이며 테스트 PASS나 제품 수정 완료를 주장하지 않는다.
