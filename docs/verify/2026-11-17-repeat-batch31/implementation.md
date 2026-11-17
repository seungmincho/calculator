# 31차 순서 공개·복사/TXT 연결 결과

2026-11-17 KST. root 승인으로28/30 native 검증 중 다른 파일의 부모 연결을 시작했고, 전체 타입 barrier에서 완결된 TSX 단위로 freeze했다. 28/30 타입 첫 실행 exit0 뒤 회귀/lint를 마무리했다. **31차 native/독립 검토와 최종 전체 타입 검사는 아직 별도 단계**다. 빌드·배포·커밋·Chrome·전체 tsc는 이 담당이 실행하지 않았다.

## 제품 파일과 실제 영향

- `src/components/DecisionTools.tsx`: 기존 부모의 순서 상태/await 루프를 준비 controller에 연결하고 입력 잠금·자동/수동·next/all·탭 취소/재개·복사/TXT/복구를 연결했다.
- 신규 준비 파일은 `src/utils/orderReveal.ts`, `src/utils/decisionResultActions.ts`, `src/components/DecisionResultCopyRecovery.tsx`다. 부모 연결 중 두 순수 유틸/복구 child는 수정하지 않았다.
- 실제 route는 `/order-picker`의 OrderPickerClient, `/roulette`의 DecisionToolClient, `/menu-roulette`의 page 직접 호출 **3곳**이다. 세 페이지는 single이고 공유 부모의 탭도 유지한다. 현재 이 컴포넌트의 호출 경로에 wheel-of-names는 없다.
- `translations-decision-order.json`은 decisionTools.order/resultActions의 **ko/en20 leaf**, 준비 조각 그대로 최종 확정해 integrate에 병합 요청했다. canonical/messages/meta는 직접 수정하지 않았다.

## 최종 동작

기본 auto는 단 한 번 정한 순열을400ms 준비 뒤500ms마다 한 명 공개한다. manual은 자동 예약0이며 shuffling에서도 다음 한 명/모두 공개로 진행할 수 있다. 모드 변경은 순열·runId·공개 수를 유지한다. 탭 숨김은 예약만 무효화하고 복귀 auto만 현재 phase에 맞는400/500ms 하나를 새 세대로 예약한다. 숨은 시간만큼 여러 명을 몰아서 공개하지 않는다.

추첨/공개 중 입력·추가·삭제·Enter는 UI와 handler가 모두 차단한다. 완료 후 실제 명단 추가/삭제는 결과와 복사 상태를 초기화하며 미확정 입력 문자열 편집만으로 결과를 지우지 않는다. 중복 이름과 기존 order/roulette comma URL을 보존한다. 새 mode/순열/반출 내용을 URL·storage에 추가하지 않는다. URL에는 현재도 입력 명단이 들어간다는 기존 경계를 유지한다.

공개 수는 같은 run에서 감소하지 않고 timeout은 자기 reservation을 검사한다. 초기화/모두 공개/새 추첨/탭/언마운트 뒤 이미 큐에 들어간 callback도 무효다. StrictMode cleanup/setup에서는 reversible active 전환을 사용해 초기 controller가 영구 dispose되거나 state/ref epoch가 어긋나지 않는다.

전체 공개 전에는 copy/TXT UI가 없고 handler도 최신 run·complete·active·현재 문자열을 확인한다. 복사와 TXT는 같은 번역 문자열 snapshot, UTF-8/no BOM, 고정 `presentation-order.txt`를 쓴다. Clipboard는 native 성공/legacy true만 성공이고 실패 시 원문 선택/재시도/닫기를 제공한다. order와roulette는 같은 최신 요청 guard를 공유한다. 늦은 거절의 fallback/옛2초 성공 timer가 다른 결과를 바꾸지 않는다. 이미 제출된 OS Clipboard 자체를 되돌린다는 보장은 하지 않는다.

최종 수동 공개/모두 공개는 활성 copy 버튼으로, 초기화는 draw로, 복구 닫기/재시도 성공은 유효한 복사 버튼으로 focus를 옮긴다. 공개/반출 버튼은44px, 입력/복구 textarea는16px다. 별도 짧은 live 진행 안내, 토큰 카드와 긴 이름 줄바꿈, reduced-motion에서 transition 없음, MobileResultLink를 연결했다. 실제 DOM focus/320px는 native 검증 담당의 별도 확인이다.

메뉴 기록 key/schema/raw CAS/readback, 주간 계획 key·props·로직, 최근 제외 집합은 미수정이다. 기존 roulette4200ms RAF/각도 계산·confetti·PNG600×340 경로도 유지한다. 결과가 새 spin/항목 편집/프리셋/먹은 기록 저장 성공으로 없어지는 지점에서 기존 copy만 무효화했다. MealPlanPanel의 별도 copy/revision을 병합하지 않았다.

## 실행 근거

- 미연결 준비 **순수10+KO/EN 실제 복구 child2 PASS**는 유지한다. 이번 부모 연결에서 해당 파일들을 변경하지 않았다.
- 수정 전 실제 부모 경합 **2건**은 `decision-order-before-fix.json`과 `decision-order-before-fix-review.md`에 보존했다. 같은 `check-decision-order-races.mjs --expect-fixed --write-evidence`가 이제 **2그룹 PASS**다. 모두 공개 뒤4명 유지/복사 가능, reset→새 추첨 뒤 첫 공개 전0명 유지다. after-fix 증거는 별도 파일이다.
- `check-decision-order-parent.mjs`: **8그룹 PASS**. Strict replay2회·중복 URL/편집 잠금·순열1회·수동/자동/최종focus, 탭 숨김/복귀, 공개 전 반출0·실제 UTF-8 TXT, copyfalse/복구/retry/close·download 실패, late rejection/옛timer/언마운트, locale/옛complete handler, order→roulette 역순 copy, 메뉴 raw/계획/후보·RAF/PNG·명시 기록 저장 boolean을 실제 부모로 확인했다.
- 기존 `scripts/check-meal-plan.ts`: **19검사 PASS**. 독립된 주간 계획 도메인 회귀이며 새 순서 기능 검사 수에 합치지 않는다.
- 제품·검사9파일 scoped lint **exit0, 오류0·경고0**.

fixture는 실제 부모와 제어된 React hook host/IO를 사용한다. 식사 child·MobileResultLink는 부모 props 포트로 분리했고, 복구 child는 준비 단계의 별도 실제 렌더로 검사했다. 초기 재실행에서 MobileResultLink의 shared import를 host가 찾지 못한 fixture 의존성 문제만 해당 child 포트로 보완했다. 실제 메뉴 저장 동작·순서/roulette handlers·Clipboard 함수·Blob 생성은 부모 코드를 실행한다. 가짜 canvas 검사에서 PNG 크기/format/기존 호출 경로를 확인했으며 실제 PNG 픽셀·다운로드는 native 단계로 구분한다.

## Native/독립 검증 선택자와 포트

- `#order-picker-result`: `data-order-phase`(idle/shuffling/revealing/complete), `data-order-run`, `data-order-revealed-count`, `data-order-reveal-mode`.
- `data-order-draw`, `data-order-reset`, `data-order-mode="auto|manual"`, `data-order-next`, `data-order-reveal-all`, `data-order-input`, `data-order-add`, `data-order-remove="index"`.
- `data-order-card="index"`/`data-order-visible="true|false"`. 숨은 이름은 카드 DOM/data/aria에 넣지 않는다.
- `data-order-copy`/`data-order-copied`, `data-order-download`, `data-roulette-copy`/`data-roulette-copied`, `#roulette-spin`. 공통 recovery는 `data-decision-copy-recovery/select/retry/close`.
- 공유 부모 탭 `data-decision-tab="roulette|order"`; 실제 세 페이지 single에서는 탭이 숨겨진다. generic parent fixture에서 tabswitch를 확인한다.
- 자동 공개는 native setTimeout400/500ms 한 개씩이다. callback을 캡처한 뒤 reset/all/tab 전환 후 강제 호출해도 새 상태를 바꾸지 않아야 한다. manual 예약은0이다. 복사 성공 안내2초, TXT URL 정리1초/언마운트다.
- URL fixture 예: `/order-picker?order=A,A,B,C`. 기존 중복 항목을 그대로 사람별 항목으로 유지한다.
- 메뉴 fixture key `toolhub-meals-v1` = `{records:[{id,name,date}],excludeDays:0|1|7}`, 계획 key `toolhub:meal-plan` = `{version:1,entries:[{date,menu}]}`. PNG 버튼은 기존 `roulette.saveImage` 문구(‘이미지…’)다.

본인 제품 TS는 final ready 후 freeze하며 발견 대응은 우선한다. 독립/native 검증 결과와 최종 whole tsc는 공용 보고서에서 별도로 합친다.
