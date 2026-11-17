# 49차 메뉴 룰렛 이번 제외·복구 — author ready / TS freeze

41/42/43/45 전체 타입 08:43:20 PASS 뒤 root 신호로 실제 부모를 연결했다. **순수 준비 8그룹 + 실제 부모/자식 7그룹 = 자체 15그룹 PASS**, 기존31 actual-parent race 2 + parent 8그룹 회귀 PASS, 최종6파일 scoped lint 오류0·경고0 exit0이다. 제품·검사 TS를 동결하고 독립/native/전체 타입은 별도 담당에게 넘긴다. 여기서는 Chrome·전체 tsc·빌드·배포·커밋을 실행하지 않았다.

## 연결한 동작

`src/components/DecisionTools.tsx`의 menuMode에서 확정 결과를 ‘이번에는 제외’로 제외하고 개별/모두 복구할 수 있다. 같은 trim 이름의 모든 중복 항목을 제외하며 원본 배열·원문·index·순서를 보존한다. 실제 남는 회전 항목이2개 미만이면 제외를 차단한다. 제외/복구 뒤 자동으로 다시 돌리지 않는다.

`src/components/MenuRoundExclusions.tsx`가 후보 수·임시 제외 목록·복구와 초기화/공유 범위를 안내한다. 최소44px 버튼, 긴 이름 줄바꿈, 명시 동작 후 ‘돌리기’ 버튼 초점 복귀를 연결했다. 같은 프리셋을 다시 선택해도 임시 제외는 해제한다. 직접 후보 변경 또는 기존 식사 제외를 적용한 배열의 값·순서가 바뀌어도 초기화한다. 관계없는 식사 기록 변경은 임시 제외를 지우지 않는다.

`src/utils/menuRoundExclusions.ts` 준비 API를 재사용했다. `mealEligibleItems`는 기존 식사 제외만 적용한 후보이고 주간 계획에 전달한다. `wheelItems`에만 추가 임시 제외를 적용한다. 새 local/sessionStorage key·URL field가 없다. 후보 URL·식사200개·주간 계획90일·최근 추첨20개 계약은 그대로다. 실제 먹은 기록은 기존 명시 저장 버튼을 누를 때만 추가한다.

기존 난수/이동 각도/당첨 index 계산을 바꾸지 않았다. spin token은 현재 run만 RAF callback을 실행하고 완료를1회 소비하게 한다. 옛 완료 callback을 직접 호출해도 결과/history를 다시 쓰지 않는다. confetti callback은 현재 run을 확인한다. 결과를 비운 뒤 옛 copy/PNG handler도 반출하지 않는다. 실제 native 이미지/RAF 동작은 browser 담당이 별도 확인한다.

공용 ShareResult는 이 부모에 원래 직접 연결되어 있지 않다. 기존31 `decisionResultActions` 복사복구 및 PNG 경로를 그대로 사용한다. `MenuPicker.tsx`(`/menu-picker`)는 미수정이다. `/coin-flip`은 별도 `DecisionToolPage` 경로이며 DecisionTools에는 roulette/order 두 모드만 있다. 동전/기타 결정 도구를 새로 연결하거나 바꾸지 않았다.

## 변경 파일/번역

- 제품: `DecisionTools.tsx`, 새 `MenuRoundExclusions.tsx`, 준비 `menuRoundExclusions.ts`(부모 연결 중 유틸 변경 없음).
- 검사: 준비 `scripts/check-menu-round-exclusions.ts`, 새 docs49 `menu-round-parent-harness.mjs`, `check-menu-round-parent.mjs`.
- `translations-menu-round.json`: KO/EN 각각 `decisionTools.menuRound` 11leaf. integrate가 canonical/common/page/meta를 따로 병합했으며 작성자는 정본/생성물을 직접 수정하지 않았다.

## 실제 부모/자식 7그룹

`node docs/verify/2026-11-17-repeat-batch49/check-menu-round-parent.mjs`

1. `[피자,국수,피자,김밥]`의 피자 전체 제외→원래4항목 복구. URL·storage writes0·주간 후보 그대로. 원본 목록에는2개 제외 배지.
2. `[A,A,B]` 최소2칸 경계, disabled handler 직접 실행 차단·옛 결과/복구 revision 무효화.
3. 후보 직접 추가·동일 프리셋 재적용 초기화, 관계없는 식사 기록은 유지, 실효 식사 필터가 바뀌면 초기화.
4. 날짜 경과로 필터 변화/원래 raw 보존, 제외 뒤 및 새 spin 중 과거 RAF callback 무효화·완료1회.
5. pending copy→제외 뒤 old rejection fallback0, 옛 PNG handler0, 복구 후 같은 결과의 새 copy/PNG 정상, locale 원본 보존.
6. 실제 effect Strict replay 이후 첫 추첨·제외, 일반 roulette에 임시 UI 없음, 최근20개 유지.
7. 실제 KO/EN 자식의 전체 이름·동작 revision 전달·busy handler 차단·44px 버튼.

실제 부모+순수 유틸은 번들링하고 DOM·canvas·storage·clock·Clipboard I/O를 제어했다. 문서/그림은 합성 자료다. PNG 검사는 실제 제품의600×340 생성 handler에서 파일명·그린 텍스트를 확인한 제어 포트이며 실제 픽셀 인코딩/저장 성공으로 주장하지 않는다. 새 자식은 별도로 실제 렌더했다. generic host나 기존31 검사 assertion을 수정하지 않았다.

기존 회귀 명령: `node docs/verify/2026-11-17-repeat-batch31/check-decision-order-races.mjs --expect-fixed`, `node docs/verify/2026-11-17-repeat-batch31/check-decision-order-parent.mjs` — 총10그룹 PASS. `--write-evidence`를 쓰지 않아 이전31 evidence 파일은 수정하지 않았다. 순서 자동/수동/탭 복귀·고정 순열/복사/TXT·늦은 응답·메뉴/계획·기존 PNG 회귀가 포함된다.

최종 scoped lint6파일은 위 제품3 + 준비검사1 + 신규JS2, 모두 오류0/경고0이다.

## native/독립 인계

- 현재 run/spin 상태: 부모 `data-roulette-run`, `data-roulette-spinning`.
- 제외: 결과 `data-menu-exclude-result`; 최소후보 부족이면 disabled와 설명을 함께 표시한다.
- 복구: `data-menu-round`의 `data-menu-round-revision`, `data-menu-round-count`, `data-menu-restore="메뉴이름"`, `data-menu-restore-all`.
- 원본 후보 행: `data-menu-candidate-index`, `data-menu-temporarily-excluded`; 원래 `#roulette-spin`, `#roulette-result`, canvas aria-label 유지.
- 실제 RNG는 기존 spin 시작의 `travel=(4+Math.random())*2π`에서1회, 완료 후 confetti의80개 입자에서 별도 소비한다. 테스트가 첫 travel과 confetti 소비를 혼동하지 않게 한다. 준비 유틸/새 UI는 RNG를 호출하지 않는다.
- 실제 RAF callback은 spin 시작 token+run을 확인하고 finish1회만 결과/history를 기록한다. 메뉴 원본/식사 실효 후보 변경 때 token을 무효화하고, 실제 native requestAnimationFrame 취소도 기존 cleanup에 남긴다.

native 담당에게 번역ready와 author ready 이후 단일 Chrome으로 중복/2칸·키보드/초점·320KOEN·저장 불변·native RAF/PNG/Clipboard를 요청한다. 독립/브라우저 결과가 올 때까지 제품 발견 대응을 우선하며 완료 배포로 표현하지 않는다.
