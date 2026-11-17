# 12차 팀 참석자 독립 리뷰

2026-11-16 · 검토자 `/root/taxi_repeat` · 구현자 `/root/team_rotation`

검토 범위 안에서 수정이 필요한 결함을 찾지 못했다. 제품 코드는 수정하지 않았다. `TeamDivider.tsx`의 전체 명단/참석자 경로를 정적으로 추적하고, 실제 유틸을 사용하는 독립 검사 9개 및 기존 관련 회귀 검사를 실행했다.

## 경로별 확인

| 계약 | 확인한 경로와 결과 |
|---|---|
| 전체 명단과 출석 분리 | `names`는 전체 명단이며 `absentNames`는 화면 내 `Set`이다. `attendingTeamMembers(names, absentNames)`로만 편성 입력을 만든다. 출석은 localStorage/백업 스키마에 들어가지 않는다. |
| 랜덤·균등·팀장 | `handleDivide`의 두 자동 모드와 팀장/드래프트 풀은 모두 `validNames`를 사용한다. 팀장은 참석한 이름의 원래 순서를 따른다. 정확히 팀 수만 참석했을 때 빈 드래프트 풀로 완료된다. |
| 이전 조합·잠금 | `handleRotate`와 `rotationRosterMatches`는 참석자 집합을 사용한다. 독립 검사에서 이전 전체 보드를 참석자 보드로 오인하지 않고, 일치하는 보드에서는 참석자 잠금만 유지한다. |
| 참석 변경 후 초기화 | 개별/전체 출석 변경이 `resetBoard()`를 거쳐 팀·잠금·선택·undo·비교·드래프트 풀·팀장 포인터·애니메이션 상태를 정리한다. 타이머도 취소하므로 이전 결과에서 빠진 이름이 undo로 돌아올 경로가 없다. |
| 진행 중 변경 방지 | 참석 핸들러와 checkbox/전체 버튼에 편성·드래프트 guard가 있고, 입력 영역 전체 fieldset도 disabled이다. |
| 불러오기·입력 변경 | 저장 명단 불러오기, 프리셋, 유효한 일괄 입력은 전원 참석으로 초기화한다. 개별 추가와 삭제는 해당 이름의 과거 부재 항목을 제거한다. |
| 전체 명단 저장·갱신 | `saveRoster`는 `validNames`가 아닌 전체 `names`와 그 이름들의 능력치로 저장 객체를 만든다. 참석자가 0명이어도 전체 명단의 저장 조건은 바뀌지 않는다. |
| 백업과 다른 탭 | 백업은 저장 명단만 내보낸다. 백업 import 콜백과 storage 이벤트는 현재 이름/출석을 바꾸지 않는다. 다른 탭 변경은 선택된 저장 명단을 해제하며, 이후 명시적 불러오기에서 최신 전체 명단과 전원 참석 상태를 적용한다. raw 비교·readback 경로는 유지된다. |
| 공유 | 공유 직전 `teams.flat()`의 이름으로 능력치를 다시 투영한다. 세 결과 모드 모두 URL 본문과 복원 결과에 실제 편성된 이름만 포함한다. |
| 부족 인원 | 참석자가 팀 수보다 적으면 메인 편성 버튼이 비활성이고 참석 인원/팀 수를 포함한 오류를 표시한다. 핸들러와 자동 편성 유틸도 거부한다. |
| 접근성·번역 | 참석 체크에 `{name} 오늘 참석` 별도 이름을 사용하고 삭제 버튼과 분리했다. 전체/참석 인원과 초기화·비영구 안내가 ko/en 조각에 있다. 새 체크의 label과 버튼은 min-h-11이다. |

주요 코드 위치: `src/components/TeamDivider.tsx:47`, `:94`, `:143`, `:171`, `:185`, `:202`, `:224`, `:244`, `:274`, `:318`, `:365`, `:452`, `:532`.

## 실행한 검증

- `node docs/verify/2026-11-16-repeat-batch12/check-attendance-independent.ts` — 독립 9개 그룹 PASS. 순서·불변성, 특수 이름, 과거 부재 잠금 차단, 팀장 순서/빈 풀, 회전 집합 검증, 세 모드 공유, 인원 부족, 전체 명단 저장·갱신·백업·stale write, 2~200명 경계를 포함한다.
- `node scripts/check-team-attendance.ts` — PASS.
- `node scripts/check-team-board.ts` — 편성·잠금·이동·교환·공유 PASS.
- `node scripts/check-team-rosters.ts` — 14개 검증 PASS.
- `node scripts/check-team-roster-backup.ts` — 10개 그룹 PASS.
- `node scripts/check-team-rotation.ts` — 168개 범위·잠금·균등·공유 시나리오 및 오류 입력 PASS.
- `node scripts/check-team-balance.ts` — PASS.
- `npx eslint docs/verify/2026-11-16-repeat-batch12/check-attendance-independent.ts` — 오류/경고 0.

Node의 기존 `MODULE_TYPELESS_PACKAGE_JSON` 경고 외 실행 실패는 없었다.

## 검증 한계

이 리뷰에서 React 이벤트를 실제 브라우저로 누르거나 storage 이벤트를 두 탭으로 발생시키지는 않았다. reset/undo·busy·명단 불러오기·교차 탭 UI는 코드 경로 검토이고, 실제 클릭·모바일 레이아웃·접근성은 별도 브라우저 검증 결과와 함께 판단해야 한다. 전체 타입 검사·빌드·dev 실행은 하지 않았다.
