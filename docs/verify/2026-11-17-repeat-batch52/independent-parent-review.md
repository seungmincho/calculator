# 52차 퍼센트 결과 비교 — 실제 부모 독립 검토

상태: **독립 실제 부모 7그룹 PASS, 제품 수정 요청 없음.** 미연결 준비 독립 8그룹과 별도다. 작성자 검사를 재실행해 합산하지 않았다. 새 MJS 2파일 scoped ESLint는 오류·경고 없이 exit 0이다.

실행:

```text
node docs/verify/2026-11-17-repeat-batch52/independent-parent-check.mjs
node docs/verify/2026-11-17-repeat-batch52/independent-parent-check.mjs "output ownership"
```

첫 명령은 7그룹 PASS다. 둘째는 같은 locale에서 EN namespace 준비 완료로 실제 비교 제목이 바뀌는 영향 assertion을 추가한 뒤 해당 그룹만 재실행한 PASS이며 총 그룹 수에 중복 합산하지 않았다.

## 방법

별도 `independent-parent-harness.mjs`는 공용 29차 React 이벤트 호스트만 재사용한다. 실제 `PercentCalculator`와 현재 props로 연결한 실제 `PercentComparisonPanel`/`PercentCopyRecovery`를 각각 실행한다. 작성자 52차 host/assertion은 가져오지 않았다. Clipboard/legacy DOM/Blob URL/download anchor/history/초기 queueMicrotask를 제어한다. Blob 내용은 실제 Node Blob의 `text()`로 확인했다.

기록/외부 데이터 접근, 실제 Chrome/OS clipboard/파일 저장은 없다. disabled DOM 버튼에 대한 네이티브 클릭 방지는 브라우저 담당 범위이고, 제어된 옛 handler 직접 호출은 소유권 검사 범위다. 이미 제출한 OS clipboard 쓰기를 취소했다고 주장하지 않는다.

## 결과

| 그룹 | 독립 actual-parent 경계 | 결과 |
|---|---|---|
| 1 | hydrated=false의 기본 7500·URL 쓰기0 → 준비 후 공유120×25%=30. dec/한글 표시 복원. 반복 foreign query/hash/history.state 참조 유지, 명시 빈 입력 `a=`. 복원 전 사용자 편집이 늦은 URL 복원보다 우선 | PASS |
| 2 | 실제8종 결과가 snapshot의 값/단위·관련 raw·당시dec/ko와 일치. 6개·7번째/noevict·중복, 제거 후 나머지2종도 검증. 기존 reset은 목록 유지, 목록 clear는 현재 입력·URL 유지, storage write0 | PASS |
| 3 | 유한 입력 곱 overflow가 formatter 이전 오류로 바뀌어 숫자/copy/add가 사라짐. 실제0은0 복사/저장 허용·빈칸은오류. %p의 비유한 상대비율 차단, 큰 유한 VAT와 선택 cp 기존 정책 유지 | PASS |
| 4 | 카드2종/전체 비교의 pending copy → 4종 다음 출력(카드2·비교·TXT) 12방향. old reject fallback0. 입력·locale·dec·수식 표시·목록의 ABA, 같은 locale의 지연 namespace 도착 뒤 이전 출력 복구/성공 표시0 | PASS |
| 5 | 실제 native reject+legacy false가 카드/전체 비교의 수동 복구를 표시. 대상 변경 시 새 key·전체 문자열 유지. 선택 실패→성공/전체 범위, 재시도 중 입력 변경·닫기 뒤 오래된 복구 표시0 | PASS |
| 6 | 6개 전체 TXT Blob에 당시main/formula/raw 포함·현재EN 라벨. 새 입력은 기존 snapshot 불변. anchor 실패는 실패 안내, 성공/실패 URL 각각 회수. TXT 요청이 URL·스토리지를 바꾸지 않음 | PASS |
| 7 | 기존 한 줄 질문·5단계 chain·단계삭제 정상, 저장 snapshot은 기존5단계 유지. 이전1500ms 성공 타이머가 새 성공 표시를 지우지 않음. effect replay와unmount 뒤 old reject fallback0·목록 유지 | PASS |

원래 `before-fix.json`의 baseline 3문제는 이 부모 검사에서 각각 확인했다. 원본 probe를 새 코드에서 재기록하거나 수정하지 않았다. 네이티브 브라우저 재현/해결 증거는 별도 담당 보고서와 구분한다.

## 검증기 보정 기록

- 부모 7그룹은 첫 전체 실행에서 통과했다.
- 추가 locale-load case의 최초 fixture가 제품에서 실제로 관찰하는 `comparison.title` 대신 일반 `title`만 단독 교체했다. 실제 namespace 전체 도착과 다른 주입이므로 fixture를 `comparison.title` 전환으로 바로잡아 영향 그룹을 재실행했다. 제품 결함/제품 수정은 없었다.
- 검사 호스트의 focus 포트에서 `activeElement = this`를 lint가 지적하여 동작이 같은 인자 전달 helper로 변경했다. 제품 파일은 변경하지 않았다.

## 해시와 한계

검토 제품 부모 SHA-256: `src/components/PercentCalculator.tsx` = `4078d9138b13e06c2bc72c1a5a9265d2f500e93c82283de66e4e93dc950493ad`.

순수 `percentComparison.ts`/`percentComparisonActions.ts`는 준비 독립 검토 시 해시 그대로다. 기존 `percent.ts`는 `82e13ab72236be7058b1a9b183007c6b740ac7536c6a7abfe9df89db2a6d370b`이며 original baseline JSON/probe도 검사 전후 SHA 동일 assertion으로 보존했다.

새 리뷰 파일은 MJS/MD만이며 제품 TS·공용 호스트·canonical 변경0이다. 전체 타입·Chrome·빌드·배포·커밋은 실행하지 않았다. 수치 정밀도는 기존 계산식 범위로 유지하며 새로운 임의 최대 금액이나 정밀도 보장을 추가하지 않았다.
