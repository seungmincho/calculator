# 31차 순서 공개·반출 독립 검토

2026-11-17 KST. **독립 8그룹 PASS, 추가 재현 결함 및 제품 수정 요청 없음.** 제품 파일은 직접 수정하지 않았다. 34차 준비 TS도 고정 상태를 유지했다.

## 기준과 방법

`plan.md`, 실제 최종 설계 `decision-order-implementation-design.md`, `implementation.md`와 `DecisionTools.tsx`, `orderReveal.ts`, `decisionResultActions.ts`, `DecisionResultCopyRecovery.tsx`를 읽었다. 이 디렉터리에는 별도 `design.md`가 없으므로 명시된 최종 설계 파일을 기준으로 삼았다.

작성자의 baseline 2그룹/부모 8그룹 검사와 assertion은 실행하거나 재사용하지 않았다. 새 `independent-decision-order.mjs`에서 별도 기대 순서·명령 순서·IO 포트를 작성했다. 재사용한 것은 29차의 범용 React hook host(19차 공용 host에 effect replay만 추가한 것)뿐이다. 실제 부모·controller·복사/TXT 모듈과 별도 실제 복구 child를 번들해 실행했다. MealHistoryPanel/MealPlanPanel/MobileResultLink는 부모 props 경계를 확인하는 포트로 분리했다.

이번 정책의 탭은 **공유 부모의 순서/룰렛 도구 탭**이다. 실제 전용 3개 경로는 single이라 탭 전환 UI를 숨긴다. 브라우저 문서 background pause는 최종 설계에서 제외했으므로 이를 신규 기능 또는 실패로 판정하지 않았다.

## 실행 근거

실행: `node docs/verify/2026-11-17-repeat-batch31/independent-decision-order.mjs`

| 그룹 | 독립 관찰과 판정 |
|---|---|
| 1. 순수 공개 controller | 고정 순열 `same,omega,same,alpha`·중복 수·readonly 입력을 별도 기대값으로 확인. 자동 준비→수동→다음→자동→비활성→수동 복귀→다음/전체에서 run/순열 유지와 shuffle1회. native timer ID를 항상1로 재사용하고 cancel을 no-op으로 두어도 옛 예약이 새 run을 바꾸지 않음 |
| 2. 다운로드 자원 소유권 | Blob URL 생성 중 current가 바뀌면 click0·예약0, URL 정확1회 회수. click throw도 실패 판정과 URL 정확1회 정리. dispose 후 중복 회수 없음 |
| 3. 실제 자동→수동→다음→전체 | effect replay 뒤 실제 부모 조작. 명단 `A,dup,B,dup,한글🧾,last`에서 별도 예상 순서 `B,dup,한글🧾,last,A,dup` 확인. 진행 중 캡처한 add/remove/Enter handler도 편집0. 미공개 카드에는 `?`만 있고 이름 data/aria/title 없음. 완전 공개 전 copy/TXT UI0. 같은 run에서 공개 수 감소·재추첨 없음 |
| 4. 도구 탭 복귀·이전 run | 순서1명 공개→룰렛 이탈→옛 공개 callback20회 강제 호출→순서 복귀 시 여전히1명, 500ms 새 예약1개. reset/새 draw 뒤 옛 copy/TXT/reset/all handler와 이전 timer를 호출해도 새 준비/count0 유지·반출0. unmount 뒤 준비 callback도 다음 공개 예약0 |
| 5. 실제 반출·명단 변경 | 복사 문자열과 실제 Blob의 UTF-8 byte array가 별도 기대 `1위: B`부터 전체6명 문자열과 동일. BOM 없음, 고정 `presentation-order.txt`. 추가 필드 draft 편집은 complete/복사 안내 유지, 실제 add는 결과/반출 무효화. 관련 없는 query/hash 보존, storage 쓰기0. 다운로드 정리 callback과 unmount가 겹쳐도 URL 회수1회 |
| 6. 실제 복구 UI | native 거부+legacy false는 성공 표시 없이 전체 원문 recovery. 실제 child readOnly text/전체 UTF-16 범위 선택 확인, 선택 자체는 복사 성공 아님. 재시도 성공 후 동일 전체 텍스트·복구 해제·copy focus. 후속 legacy selection throw도 실패 유지, 명시 close는 결과를 지우지 않음 |
| 7. 공유 copy 세대 | order pending→roulette 실제 RAF 완료→roulette copy 성공 뒤 order의 늦은 reject는 fallback0·복구0. 옛 성공 timer도 roulette 성공을 지우지 않음. order locale 변경과 unmount 뒤 늦은 reject 역시 fallback0·복구0이며 순열 보존 |
| 8. 메뉴 영향 최소 회귀 | 합성 먹은 기록 raw와 주간 계획 raw가 mount/순서 공개/도구 탭 왕복에서 byte 불변·쓰기0. 최근 제외 후보 X 제거 후 Y/Z 유지, 주간 계획에 전달되는 history/candidates 보존. 미래 식사 추가 boolean false·쓰기0 |

범위 ESLint: `npx eslint docs/verify/2026-11-17-repeat-batch31/independent-decision-order.mjs` **exit0, 오류0·경고0**.

새 검사 파일 최초 실행은 fixture 객체의 닫는 괄호 누락으로 파싱 실패했고, 해당 JS만 고친 뒤8그룹을 통과했다. 제품 실패로 집계하지 않는다. 이후 같은 그룹에 legacy 선택 throw·close 경계를 추가해 최종8그룹을 다시 통과했다. Node의 기존 module-type package 경고를 없애기 위한 package 변경은 하지 않았다.

## 범위와 한계

- 실제 부모 이벤트·순수 controller·문자열·Blob byte 검증이다. Clipboard/textarea/focus/타이머/RAF/Blob URL과 앵커는 제어 포트다. 실제 OS Clipboard 또는 실제 DOM focus가 검증됐다고 주장하지 않는다.
- 룰렛은 실제 부모의4200ms RAF 결과 경로로 완료시켜 cross-target copy를 확인했다. PNG 픽셀/전체 룰렛 수학·식사 계획 child의 내부 CRUD를 반복 검사하지 않았다. 변경되지 않은 범위이며 작성자/브라우저 담당 근거와 구분한다.
- 실제320px·KO/EN UI·키보드·reduced-motion·브라우저 다운로드는 verify의 단독 Chrome 범위다. 본인은 Chrome·전체 타입·빌드·배포·커밋을 실행하지 않았다.
- 원래 order/roulette 입력 명단의 URL sync는 계속 존재한다. 신규 순열/공개 모드/복구 내용을 storage 또는 URL에 추가하지 않았다는 범위로만 판정한다.

이 독립 결과에는 제품 변경 요청이 없어 현재 31차 TS freeze를 해제할 이유가 없다. 최종 native/전체 타입 결과는 통합 보고서에서 별도로 합친다.
