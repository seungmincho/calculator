# 44 러닝 목표 비교 — 읽기 설계

2026-11-17. **제품/검사 TS 작성 0, 부모 미수정.** 37/39/40 전체 타입 barrier 뒤 별도 신호로 순수·미연결 자식을 준비한다. 39 native 발견 대응이 우선이다. 새 경로·저장소·계정·운동 데이터 수집·훈련 권고는 추가하지 않는다.

## 기존 범위와 책임

`RunningPaceCalculator.tsx`는 5/10/21.0975/42.195km·직접 거리, time/pace 전환, 1/5km 구간표, 복사/인쇄를 제공한다. mode 전환 시 현재 결과를 정수 초로 반올림해 반대 입력에 채우는 동작은 유지한다. 현재 URL/ShareResult 연결은 없다. 기존 copy는 native 완료 뒤 입력·locale 변경을 확인하지 않아 과거 성공 상태가 남을 수 있다.

`runningPace.ts`의 거리 parser는 >0~500km·소수4자리, clock은 0~99시간/0~59분·초이고 총합>0, pace는 0~99분/0~59초·총합>0이다. 마지막 split은 finishSeconds를 직접 넣는다. 이 코어와 원래 기본 예시 10km/50분을 재사용한다.

번역은 일반 namespace hook으로 교체하지 않는다. 기존 `@/lib/i18n/runningPace`의 `createLazyEnTranslations`와 retry fallback을 부모/자식에서 유지한다. KO/EN `runningPace.comparison` fragment는 제품 담당, canonical/메타/가이드는 integrator 소유다. locale scope에는 언어 코드만 아니라 실제 번역 표시 세대도 포함해 EN fallback→성공 뒤 옛 KO 복사 feedback이 남지 않게 한다.

## 파일과 정확한 API 안

- `utils/runningPaceComparison.ts`: `RunningGoalDraft { id: string; hours: string; minutes: string; seconds: string }`, `evaluateRunningGoals(distance: number|null, goals, splitKm)` → 입력 순서의 `rows: valid|invalid`, validCount, 전체유효 여부, 공통 구간거리와 목표별 누적값. 최대3개, id는 메모리 UI 식별자이며 URL/CSV에 넣지 않는다.
- `captureRunningComparison(...)` → 모든 존재 목표·거리가 유효할 때만 불변 snapshot. 단일 입력이 무효여도 비교 자체가 유효하면 비교 TSV/CSV/인쇄는 가능하지만, 전체 화면 URL은 별도 검사한다.
- `clockFromCurrentResult(result)` → 현재 finishSeconds를 정수 초로 반올림한 값이 1..359999면 시분초, 아니면 `belowOneSecond|aboveClockRange`. 원래 단일 계산 결과는 수정하지 않는다.
- `utils/runningPaceQuery.ts`: `restoreRunningQuery(params)`/`updateRunningQuery(href, draft)`. DOM/history는 부모만 소유한다. raw 입력 상태와 숫자 URL snapshot은 분리한다.
- `utils/runningPaceActions.ts`: TSV/CSV의 순수 직렬화, 요청 token·clipboard·object URL 관리. 파일명 `running-pace-comparison.csv`. CSV/TSV 전체 행은 같은 snapshot으로 만든다.
- 새 `components/RunningPaceComparison.tsx`: controlled 목표 목록·요약·표·명시 추가/삭제/반출. 기존 부모는 단일 계산/거리·간격/URL/공통 반출 revision 소유. 새 단계에서는 미연결 자식까지 준비하고 부모 import는 별도 신호 뒤 연결한다.
- `runningPace.ts`는 아래 재현된 누적값 경계에 한한 최소 보완 대상이다. 공용 ShareResult는 수정하지 않고 `resultKey` API를 사용한다.

## 3개 목표 입력과 비교

초기 비교 목록은 비어 있고 기존 기본 결과는 그대로 보인다. `현재 완주시간을 비교에 추가`와 `목표 직접 입력`을 제공한다. 직접 입력은 시/초 0·분 빈칸으로 시작하며 빈칸을0초로 채우거나 행을 버리지 않는다. 동일 시간 목표도 서로 다른 행으로 보존한다. 삭제 후 목표1/2/3은 현재 순서의 표시명이며 안정 id가 편집 대상 혼동을 막는다.

거리/단일 mode 변경으로 목표 시분초를 자동 변환하지 않는다. 공통 새 거리에서 각 목표의 페이스/속도/구간표만 다시 계산한다. 유효 행은 총시간·km당 페이스·속도, 2개 이상 유효하면 유효 목표 중 최단 총시간과의 **정수 초 차이**를 표시한다. 공동 최단은 모두 표시한다. 미완/오류행은 그대로 남기고 유효 목표 수를 명시하며, 무효 행을 포함한 순위/추천을 만들지 않는다. 거리 자체가 무효이면 비교 계산을 보류한다.

기존 pace 모드의 유효 결과는 500km × 99:59/km = **833:11:40**까지 가능하고 아주 짧은 거리는 0.x초가 가능하다. root 승인대로 비교 clock 범위는 늘리지 않는다. 현재 추가만 `round(finishSeconds)`의 1..359999를 확인하고 불가 이유를 설명한다. 정상 추가도 **비교 목표는 초 단위로 반올림**함을 밝힌다. 단일 결과의 833시간/0.x초 계산 의미는 유지한다. 최대3행이면 두 추가 버튼을 비활성화하고 이유를 표시한다.

## 누적 split과 기존 코어 정확성 발견

비교는 `calculateRunning(distance, 'time', goalSeconds, interval)`을 각 유효 목표에 적용한다. 화면에 표시한 반올림 pace를 다시 곱하지 않는다. 공통 split 거리 배열은 1/5km와 마지막 잔여 거리이며, 모든 목표의 마지막 누적값은 입력 목표 초와 같아야 한다. 500km·1km는 정확히500행, 500km·5km는100행, 짧은 소수 거리는 마지막1행이다.

읽기 중 메모리의 기존 순수 함수만 호출하여 다음 오류를 재현했다(제품/사용자 데이터 수정 없음).

| 입력 | 50km 기존 raw | 기존 표시 | 정수 비율의 올바른 반올림 |
| --- | ---: | --- | --- |
| 100km, 29초, 5km 간격 | 14.499999999999998 | 0:00:14 | 0:00:15 |
| 100km, 28,803초, 5km 간격 | 14401.499999999998 | 4:00:01 | 4:00:02 |

원인은 finish/distance를 먼저 구해 mark를 곱하는 순서다. root가 구현 때 최소 보완을 승인했다. **time 모드의 거리 소수4자리·정수 목표초 범위**에서는 거리의 1e4 정수 단위로 `(finishSeconds × splitDistanceUnits) / totalDistanceUnits`를 계산한다. ≤5,000,000×359,999 =1,799,995,000,000<2^53이고 분자도 safe integer임을 확인한다. 최종 행은 여전히 원래 finishSeconds다. core public 함수는 이외 유한 입력도 받으므로 모든 입력을 정수로 반올림하지 않는다. `round(distance*1e4)/1e4 === distance`, 정수초/범위/safe-product guard를 만족하지 않으면 기존 정밀도 경로를 유지한다. 단일/비교가 같은 코어를 사용해 표시가 어긋나지 않게 한다.

별도 BigInt 유리수 oracle로 half boundary와 모든 split의 초 반올림을 대조한다. 원래 하프/마라톤/pace/잔여구간 회귀도 함께 확인한다. 이 오류는 신규 비교 기능 자체를 만들었다는 주장과 분리해 보고한다.

## URL — owned keys와 초기 우선순위

새 소유 key는 **`rpV`, `rp` 두 개**, `rpV=1`, `rp`는 아래 고정 숫자 조건 JSON으로 한다. 현재 도구에 기존 URL writer/legacy 링크 계약은 없다. 일반적인 `mode/time/pace` 이름을 임의로 점유하지 않는다.

```text
{ distanceKm: number, custom: boolean, mode: 'time'|'pace', valueSeconds: number,
  splitKm: 1|5, goals: number[] } // 0~3개의 정수 목표초; 이름/id 없음
```

`custom`은 같은10km라도 직접거리 탭이었는지 보존한다. custom=false이면 기존4 preset 중 하나와 거리도 일치해야 한다. active mode의 숫자 값만 공유하고 비활성 입력·공백·선행0 같은 표기 자체까지 재현한다고 약속하지 않는다. 복원 시 time은 시분초, pace는 분초로 펼친다. 현재 단일 유효 입력과 모든 존재 목표가 유효한 경우에만 전체 URL snapshot을 생성한다. 미완/오류 행이 생기면 원문 draft는 유지하면서 옛 rpV/rp를 제거하고 공유 불가 이유를 표시한다. 일부 목표만 조용히 공유하지 않는다.

초기 기본 트리→주소 읽기→1회 복원 뒤 쓰기 순서다. 그 사이 이미 발생한 직접 편집은 필드별 patch로 초기 URL 위에 우선 적용한다. 자기 replaceState를 외부복원으로 취급하지 않고 같은 query/hash-only popstate는 초안을 유지한다. 실제 query 변경만 외부 snapshot으로 복원한다. unknown 중복 query·hash·history.state는 원형 보존한다.

rpV/rp 중 하나만 있음·중복 key·미지원 version·타입/범위/목표4개·거리 preset 불일치는 명확한 복원 오류다. 정상 기본 계산을 해당 공유 입력의 결과처럼 제시하지 않는다. 미지원 raw query는 초기부터 지우지 않고, 명시 입력 편집 또는 기본값으로 시작 행동 후 새 상태가 소유 key를 교체한다. `rp` 4KiB/완성URL16,384자 보호 상한을 제안하며 초과 시 축약 URL은 만들지 않는다. replaceState 실패도 링크 공유를 막고 현재 주소가 이전 입력일 수 있음을 알린다.

## 전체 TSV/CSV/인쇄와 공유·복사 소유권

유효한 비교 snapshot에서만 전체 반출한다. 하나라도 미완행이 있으면 오류를 남기고 전체 비교 반출을 비활성화한다. 기본 단일 결과 복사는 기본 결과를 명시하는 기존 별도 기능으로 유지한다.

비교 표는 화면에서 최대50행씩 페이지를 나눌 수 있지만 TSV/CSV/인쇄는500행 전체를 사용한다. 직사각형 schema는 공통 `distanceKm, splitIntervalKm, splitDistanceKm` 3열 뒤 각 목표 순서대로 `totalSeconds, paceSecondsPerKm, speedKmh, elapsedSeconds, elapsedClock` 5열을 반복한다(최대18열). 헤더는 번역된 목표번호·단위를 포함한다. 모든 행의 열 수가 같고 total/pace/speed도 반복하므로 파일 일부 행만 읽어도 당시 전체 숫자 조건을 알 수 있다. 별도 제목행이나 넓이가 다른 summary 행을 끼워 넣지 않는다.

원시 숫자는 locale 소수쉼표를 쓰지 않고, 읽기용 HH:MM:SS와 구분한다. CSV는 comma/quote/CRLF escape와 UTF-8 BOM, TSV는 spreadsheet용 quoted-cell 규칙(tab/newline/quote 포함 셀을 큰따옴표로 감싸고 내부 quote는 두 번)·BOM 없음으로 명시한다. 동적 내용은 검증된 숫자와 앱 번역 목표명뿐이며 사용자 이름/임의 수식 문자열은 없다. spreadsheet의 자동 시간 형식까지 보장하지 않고 초 숫자 열로 재사용할 수 있게 한다.

클릭 당시 거리/3목표/간격/locale의 불변 snapshot을 사용한다. 동작별 버튼이 현재 입력을 내보내는지 명확히 표시하고, 편집 후 뒤늦은 파일 생성·clipboard fallback·성공 표시를 막는다. 실패 시 전체 읽기 전용 TSV와 선택/재시도/닫기, focus/select throw 안내를 제공한다. input/locale A→B→A도 문자열 동등 비교만으로 처리하지 않고 증가 token으로 무효화한다.

ShareResult는 유효한 전체 URL이 있을 때 정식 공용 컴포넌트 하나를 연결한다. card는 같은 거리와 목표 최대3개 요약이며 전체 split은 TSV/CSV로 반출한다. 기존 단일 copy/비교 TSV/CSV/인쇄는 공통 owner를 사용하고 시작할 때 `resultKey` 반출 revision을 증가시킨다. ShareResult wrapper click capture는 바깥 복사를 무효화한다. 반대로 바깥 작업이 시작되면 pending ShareResult 이미지/링크가 옛 결과로 완료되지 않게 한다. 공용 파일을 수정하거나 공유 UI를 복제하지 않는다.

인쇄는 snapshot 전체 표를 별도 print 전용 DOM에 확정한 뒤 다음 렌더에서 window.print를 호출한다. 그 사이 편집/취소/언마운트이면 호출하지 않는다. afterprint/실패에서 임시 snapshot을 정리한다. 이미 열린 OS 인쇄/clipboard 작업을 취소했다고 말하지 않고 출력물 성공도 단정하지 않는다. 실제 종이 출력은 검증 범위가 아니다.

## 검증 순서와 UI

준비 단계: 기존 check-running-pace 회귀 + 별도 정수/BigInt oracle, 0/99:59:59/60분·초/500km/0.0001km/하프·마라톤·마지막 split·0.5초, 현재 추가833h/반올림0/경계, 0~3목표 CRUD/중복/무효행, URL 엄격 왕복/손상/미완 제거, full CSV/TSV 행수·UTF-8·escape를 확인한다.

부모 연결 뒤: 초기 edit 우선·URL 새 방문·mode 자동 변환/목표값 보존, unknown/hash/state, 실제 child·공용 ShareResult 양방향 copy/late image·옛 timer·ABA·다운로드 cleanup, print snapshot/취소/전체500행을 제어 포트로 검증한다. Chrome 전담은 실제 Clipboard/CSV 바이트·print media·320 KOEN·lazy EN 실패 후 retry를 확인한다.

입력16px/버튼44px/토큰, 모바일1열 카드·가로스크롤 표, 비교 결과 id와 MobileResultLink, print 전체 표의 overflow 제거를 적용한다. 페이지 전체 가로밀림·숨겨진 기본 결과·잘못된 최단 추천을 허용하지 않는다. 비교 계획/필요정보는 준비 단계에서 확정하고, 전체 tsc/Chrome/build는 지정 담당 소유를 유지한다.
