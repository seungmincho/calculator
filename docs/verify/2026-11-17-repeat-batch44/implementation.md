# 44차 러닝 목표 비교 — 실제 부모 연결 완료

## native 인쇄 발견 보완

실제 Chrome PDF에서 비교500행 외에 breadcrumb와 공통 Footer/도구 링크가 추가로 인쇄됐다. root가 첫/마지막 페이지 이미지를 직접 확인하여 snapshot 인쇄 범위의 제품 결함으로 확정했다. `RunningPacePrint.tsx` 안의 조건부 print stylesheet만 추가했다. `body:has([data-running-print-document])`가 있을 때 문서·문서 자식·문서 조상을 제외한 노드를 숨기고 조상 wrapper의 margin/padding/min-height를 정리한다. style 자체는 printJob과 함께 마운트/정리되어 다른 도구/일반 화면/공용 globals는 변경하지 않는다.

해당 실제 부모 인쇄1그룹(500행·예약취소·오류·afterprint cleanup 포함) PASS, 영향2파일 ESLint exit0/오류·경고0. verifier의 실제 PDF 영향 재검사도 PASS: 전체500행 elapsed 추출, Footer/Breadcrumb 문자열0, afterprint 정리·늦은 print0을 확인했다. native 최종8/8이며 Chrome은 종료됐다.

native URL 초깃값 재방문 실패는 별도로 trace를 대조했다. 제품이 편집값4620을 정상 replaceState한 뒤 검증 fixture가 Next 내부 history state를 통째 교체하여 과거5400을 재기록한 순서였다. verifier가 fixture를 기존 state 보존으로 수정한 뒤 early edit4620→새 탭1:17 복원 PASS다. URL 제품 코드는 수정하지 않았다.

2026-11-17 KST. **작성자 구현·관련 회귀·실제 부모 검사·범위 lint 완료, 제품/검사 TS 안정·고정.** 실제 브라우저와 전체 타입은 전담 담당의 후속 검증이다. 작성자는 Chrome·전체 tsc·빌드·배포·커밋을 실행하지 않았다.

## 연결한 동작

기존 `RunningPaceCalculator`의 4개 거리/직접 거리, 시간·페이스 전환의 반올림 채우기, 1/5km 구간표, 단일 복사·인쇄를 유지하고 `RunningPaceComparison`을 연결했다. 기존 단일 기본값은 10km/50분이며 비교 목록만 빈 상태로 시작한다. 목표 최대3개·현재 완주시간 추가·시분초 직접 입력·수정/삭제, 거리 변경에도 목표초 유지, 유효 목표 수와 최단 대비 정수초 차이를 제공한다. 같은 목표도 별도 행으로 유지한다.

비교 입력은 초 단위이며 현재 결과 추가 시 반올림한다. 단일 계산의 833시간·0.x초 결과 의미는 유지하고, 비교 clock 범위 밖의 현재 추가만 안내한다. 미완성 목표를 0으로 바꾸거나 제거하지 않는다. 비교 거리/모든 목표가 유효해야 TSV·CSV·전체 인쇄를 허용한다. 단일 시간 입력만 미완성이어도 유효한 비교의 반출은 가능하며 전체 화면 링크는 차단한다.

이미 준비 단계에서 승인·수정한 `runningPace.ts`의 guarded 정수거리 비율 경로를 그대로 사용한다. 29초/100km의50km는 15초, 마지막 split은 입력 목표초다. public fractional/범위 밖 경로의 기존 정밀도를 바꾸지 않았다. 이 정확성 보완과 신규 비교 기능은 별도 근거다.

## URL·원문 입력 보호

`rpV=1`/`rp`만 소유하며 숫자 snapshot은 공통 거리·custom 표시·active mode/valueSeconds·간격·목표초0~3개다. ID/이름·비활성 모드 초안은 공유하지 않는다. unknown 중복 query·hash·`history.state`를 유지한다.

서버와 첫 client는 기본 트리다. hydration 이후 `restoreInitialRunningLocation` 0ms callback에서 한 번 복원하기 전에는 주소를 쓰지 않는다. 이미 들어온 직접 입력은 `createRunningInitialOwner`의 필드별 patch로 URL보다 우선한다. 실제 query가 바뀐 popstate만 복원하고, 같은 query/hash 이동은 초안을 유지한다.

잘못된/중복/미지원/초과 URL은 원주소를 보존하고 계산/공유를 보류하며 명확히 안내한다. 명시 편집 또는 기본 예시로 시작하면 새 상태를 쓴다. 미완성 draft는 오래된 rpV/rp를 지우고 링크를 비활성화한다. replaceState 실패도 링크를 중지하고 입력을 그대로 둔다.

## 반출과 인쇄

기본 복사, 비교 TSV, CSV, 단일/비교 인쇄와 실제 ShareResult를 같은 요청 소유권 아래 연결했다. 새 반출은 이전 자체 copy 및 ShareResult `resultKey` 세대를 무효화한다. ShareResult wrapper capture는 자체 owner를 무효화하되 자신을 다시 초기화하는 revision은 올리지 않는다. 입력·locale·lazy EN의 KO fallback→실제 EN·초기/외부 복원·언마운트 변화도 오래된 완료를 차단한다. feedback은 token과 scope를 함께 확인해 A→B→A에서 되살아나지 않는다.

복사는 공용 `copyShareResultLink`를 재사용한다. 준비 중 root가 실제 helper의 focus-triggered owner 변경 뒤 legacy copy/초점복원 실행을 재현했고, 공용 current-aware fallback 재사용으로 해결했다. 이 수정 전 증거는 `copy-before-fix.json`에 보존했다. 공용 제품 파일은 변경하지 않았다.

실패 시 클릭 당시 전체 결과를 읽기 전용 필드로 제공하고 선택·재시도·닫기를 지원한다. 선택 예외와 오래된 재시도/닫기를 제어한다. CSV는 전체500행·최대18열, UTF-8 BOM/CRLF와 검증 숫자·번역 헤더다. 파일명은 `running-pace-comparison.csv`다. 화면 비교 표50행 페이지와 전체 반출은 분리된다.

새 `RunningPacePrint`는 클릭 시점 제목/거리/요약/전체 표를 별도 print-only DOM으로 렌더한다. 이후 RAF `printRunningSnapshot`에서 현재 요청인지 검사하고 `window.print()`를 호출한다. 입력/새 반출/언마운트로 취소된 callback은 호출하지 않으며 afterprint·실패에서 임시 문서를 정리한다. 실제 종이 출력 성공을 주장하지 않는다. 기본 단일 인쇄도 같은 full snapshot 경로다.

## 작성자 검사와 범위

| 검사 | 결과 |
| --- | --- |
| 준비 도메인 `scripts/check-running-pace-comparison.ts` | 기존11그룹 PASS, BigInt split oracle88,664개. 부모 연결에서 불필요하게 반복하지 않음 |
| `check-running-child.mjs` | 실제 자식3그룹 PASS. 부모 미연결 assertion을 연결 상태로 바꾸고 영향 재실행 |
| 새 `check-running-parent.mjs` | 실제 부모/자식/ShareResult/Print **8그룹 PASS** |
| 기존 `scripts/check-running-pace.mjs` | 기존 계산/format/오류 회귀 PASS |
| 준비 copy 보완 영향 | 작성자 actions2그룹 및 root 독립 copy1그룹 PASS(중복 합산 안 함) |

작성자 고유 검사 합계 **22그룹(준비14+부모8)**. root의 독립 core/copy6그룹은 별도이며, 후속 부모 독립/native는 아직 이 보고서에서 통과로 주장하지 않는다.

부모8그룹: 초기/부분 편집·query/hash/state 및 외부 이동, invalid/지원 버전·명시reset/주소쓰기실패, 실제 목표/모드·기존833h·정수 비율·단일 무효와 비교 반출 분리, 전체500행TSV/CSV/Print와 늦은 child/인쇄 callback, 복사6방향 및 copy↔CSV/print/ShareResult·PNG/CSV 경합, 전체 복구·focus 실패·retry/old close·locale/input ABA, Strict 효과/언마운트·URL 회수, 실제 locale export/기존 lazy retry import 계약이다.

`running-parent-harness.mjs`는 범용29 hook/event host만 재사용하며 실제 제품 컴포넌트들을 각각 실행한다. Clipboard/DOM anchor/이미지 renderer/RAF/window.print만 제어한다. 실제 OS Clipboard·Chrome PDF·인쇄 배치·lazy EN network failure/retry·모바일 렌더는 native 담당 범위다. 첫 검사 실패 중 bare data 속성 기대, VM realm 배열 비교, 실제 hook의 const/function 선언 검사 차이는 fixture를 수정했으며 제품 결함으로 집계하지 않는다.

범위 ESLint: 부모·Print·Comparison·부모 host/검사·자식 검사 **6파일 exit0/오류0/경고0**. 이후 assertions만 추가한 부모 검사1파일도 exit0. 최신 추가 assertions 두 그룹만 영향 실행해 통과했다.

## native / 독립 검토 인계

- 부모: `[data-running-workspace]`; `#running-hours`, `#running-minutes`, `#running-seconds`, `#running-distance`, `#running-pace-minutes`, `#running-pace-seconds`.
- 선택: `[data-running-distance="custom|5|10|21.0975|42.195"]`, `[data-running-mode="time|pace"]`, `[data-running-split="1|5"]`.
- 단일: `[data-running-single-action="copy|print"]`.
- 비교: `[data-running-goal]`, `[data-running-goal-field="hours|minutes|seconds"]`, `[data-running-goal-action="addCurrent|addBlank|remove"]`, `[data-running-page="previous|next"]`, `[data-running-export="tsv|csv|print"]`.
- URL: `[data-running-query-error="invalid|unsupported|tooLong|draft|writeFailed"]`, `[data-running-query-reset]`. 초기 callback 이름 `restoreInitialRunningLocation`.
- 반출: `[data-running-output]`, `#running-copy-manual`, `[data-running-recovery="select|retry|close"]`, `[data-running-share-boundary]` 안의 공용 ShareResult selector.
- 인쇄: `[data-running-print-document]`, `[data-running-print-row]`는 페이지와 관계없이 전체행. RAF callback 이름 `printRunningSnapshot`. afterprint가 cleanup한다.

## 파일·번역 상태

부모 `RunningPaceCalculator.tsx`, 신규 `RunningPacePrint.tsx` 연결. 기존 준비 `RunningPaceComparison.tsx`·3개 순수 helper·계산 core를 재사용했다. `translations-running.json` 최종57leaf(KO/EN comparison)는 integrator에게 전달했다. 공유 원본 messages/메타/menu·lazy 등록 파일을 직접 변경하지 않았다. 입력16px/제어44px/명시 모바일1열/결과 앵커를 유지했다. 새 저장소·경로·의존성·훈련 권고를 추가하지 않았다.
