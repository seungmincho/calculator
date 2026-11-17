# 44 러닝 목표 비교 — 미연결 준비 완료

2026-11-17. 37/39/40 전체 타입 PASS 뒤 승인된 범위만 구현했다. **신규 비교 부모 연결은 아직 하지 않았고 TS 편집을 중지한다.** `RunningPaceCalculator.tsx`, canonical/meta/공용 ShareResult는 수정하지 않았다. 기존 파일 변경은 승인된 `runningPace.ts` 누적 반올림 보완뿐이다.

## 준비 파일/API

- `src/utils/runningPaceComparison.ts`: 최대3 `RunningGoalDraft` 시분초, 독립 복사/편집, `evaluateRunningGoals`의 무효행 보존·유효 수·최단 동률·정수 차이, `captureRunningComparison`의 deep-frozen 전체 목표/구간 snapshot, `currentRunningGoal`의 반올림1..359999초 추가 범위.
- `src/utils/runningPaceQuery.ts`: `rpV/rp` v1 strict numeric codec, 4KiB payload/16,384 URL, mode·custom 선택·거리·간격·0~3목표만 공유한다. 모든 존재 목표와 active 단일 입력이 유효해야 URL을 만든다. invalid/tooLong은 옛 owned keys를 제거한 href와 shareUrl:null을 돌려준다. `createRunningInitialOwner`는 URL 읽기 전 partial 편집을 복사해 보관하고 한 번만 복원 위에 덮는다. 실제 DOM/history writer는 아직 연결하지 않았다.
- `src/utils/runningPaceActions.ts`: 전체 snapshot TSV/CSV. 공통3열+목표마다5열, 최대18열×500행. CSV UTF-8 BOM·CRLF·quoted cells, TSV BOM 없음·spreadsheet용 quoted cells. 헤더 수식 시작문자도 보호한다. 공통 request/locale/context guard, native/legacy 정확 성공, 늦은 fallback 차단, CSV object URL cleanup 포트가 준비됐다.
- `src/components/RunningPaceComparison.tsx`: controlled 시분초 추가/수정/삭제, 현재시간 가져오기, 3개 제한/불가 이유, 카드 요약, 무효행 보존, 50행 pagination과 전체 export callback. 기존 direct lazy `@/lib/i18n/runningPace` 경로를 유지한다. 실제 copy/CSV/print/ShareResult는 이후 부모가 공통 owner로 연결한다.
- `scripts/check-running-pace-comparison.ts`, `docs44/check-running-child.mjs`.
- `translations-running.json`: KO/EN `runningPace.comparison` **54leaf**, 동일 키·placeholder 확인. 아직 부모 미연결 문구이며 canonical 병합은 integrator 소유다.

## 기존 코어의 최소 정확성 수정

기존 100km/29초의 50km는 14.499999999999998→14초였고, 100km/28,803초는 14,401.499999999998→4:00:01이었다. time 모드의 소수4자리 거리/정수 목표초≤359999에 한해 거리1e4단위와 safe integer 분자에서 나눈 누적값을 사용한다. 두 경우는 각각15초/4:00:02가 된다.

거리 단위 왕복·정수초 범위·분자 safe integer guard를 만족하지 않는 public 호출은 기존 정밀도를 유지한다. fractional clock, 소수4자리 밖 거리, 더 큰 public time, pace 모드 의미를 임의 반올림하지 않았다. 마지막 split은 계속 원래 finishSeconds를 직접 넣고 단일/비교가 같은 코어를 사용한다.

## 자체 검사 — 14그룹 + 기존 회귀

```powershell
node scripts/check-running-pace-comparison.ts
node docs/verify/2026-11-17-repeat-batch44/check-running-child.mjs
node scripts/check-running-pace.mjs
npx eslint src/utils/runningPace.ts src/utils/runningPaceComparison.ts src/utils/runningPaceQuery.ts src/utils/runningPaceActions.ts src/components/RunningPaceComparison.tsx scripts/check-running-pace-comparison.ts docs/verify/2026-11-17-repeat-batch44/check-running-child.mjs
```

- 도메인/포트 **11그룹 PASS**. 별도 BigInt 유리수 oracle **88,664개 split**의 반올림과 모든 마지막 목표초를 대조했다. 500km/0.0001km/99시간/60분·초/하프·마라톤/반초, public 비정수 경로, immutable 목표/동률/무효행, 현재833시간·반올림0초 추가 불가, full500 CSV/TSV·escape, strict URL/owned 제거/초기 편집, clipboard ABA/late fallback·download stale/URL cleanup을 포함한다.
- 실제 자식 **3그룹 PASS**: 직접 추가/공란/편집/삭제/빠른 추가3개 제한·삭제된 행 늦은 편집, 거리 변경 시 목표 원본 보존, 500행 중 화면50과 모든 export callback500, KO/EN 키·44px/16px·추가 불가 이유. 부모가 신규 자식을 import하지 않았고 기존 lazy EN retry 경로가 남아 있음도 확인했다.
- 기존 `check-running-pace.mjs` **PASS**.
- 영향7파일 ESLint **exit0·오류/경고0**. 마지막 immutable 편집 projection 보완 뒤 영향2파일 lint와 도메인11을 재확인했다.
- KO/EN fragment54leaf·placeholder 일치.

새 검사는 합성 값/포트만 사용했다. 실제 운동·클립보드·CSV 앱·인쇄물·Chrome 검증을 주장하지 않는다. 전체 tsc/build/dev/배포/커밋은 실행하지 않았다.

## 이후 부모 연결에 남은 일

별도 신호 뒤 기본 계산/목표 상태와 URL ownership을 연결한다. malformed 초기 URL의 blocked 표시·명시 기본 예시·초기 직접 편집 우선, 같은 query/hash popstate 보존, history.state 유지/실패 안내는 실제 부모 이벤트로 검증해야 한다. mode 전환의 기존 단일 입력 반올림과 목표 원본 유지도 함께 확인한다.

기존 단일 copy와 비교 TSV/CSV/인쇄가 같은 반출 guard를 사용하고, ShareResult wrapper capture/`resultKey`가 양방향으로 옛 작업을 무효화하도록 연결한다. 전체 print snapshot DOM·render 이후 명시 window.print·afterprint cleanup, 복사 실패 readOnly 원문/선택/재시도·locale fallback/retry scope는 아직 부모 작업이다. 자식의 print callback은 full snapshot만 제공하며 현재 paged DOM을 전부 인쇄한다고 주장하지 않는다.

이후 자체 실제 부모/독립 oracle·native Clipboard/CSV/print media/320 KOEN/lazy EN retry, 공용 번역·메타, 전체 타입 checkpoint가 남아 있다. 신규 기능이 현재 route에 이미 보인다고 설명하지 않는다.
# 복사 fallback 경계 보완

root가 미연결 helper에서 `field.focus()` 중 owner가 바뀐 뒤에도 이전 `execCommand`와 초점 복원이 실행되는 제어 DOM 경계를 재현했다(`copy-before-fix.json`). `copyRunningText`의 중복 fallback을 제거하고 기존 공용 `copyShareResultLink`를 재사용했다. 공용 helper는 execCommand 직전 current를 확인하고, 현재 요청이면서 activeElement가 자신이 만든 field일 때만 이전 초점을 복원한다. 공용 제품 파일과 기존 RunningPace 부모는 수정하지 않았다.

영향 검사: 독립 `check-running-independent.mjs --copy-only` 1그룹 PASS(무효화 뒤 execCommand 0), 작성자 `check-running-pace-comparison.ts --actions-only` 2그룹 PASS. 준비 계산/URL/BigInt 전체는 변경이 없어 반복하지 않았다. 제품 helper와 작성자 검사 2파일 범위 lint exit 0/오류·경고 0. 제품/검사 TS를 다시 고정했다.

