# 47차 준비 계약 — 텍스트 비교에서 변경 구간 선택 병합

상태: 완료(미배포). 작성자 28·독립 17·Chrome 기본8+앵커 영향1흐름과09:43:59 KST 전체2GB 타입 재검사·번역/범위lint/diff를 통과했다. [완료 보고서](report.md). 아래 실행 계약과 사전 조사/수정 전 근거는 이력으로 보존한다.

## 확정 범위

- 마지막으로 성공한 비교의 연속된 변경 행 묶음마다 ‘원본 유지 / 수정본 반영’을 고른다. 기본은 모든 구간 원본 유지다. 변경 묶음은 `unchanged` 행으로 나뉘며 인접한 added/removed는 순서에 관계없이 한 묶음이다. 이것은 두 문서의 줄 선택 병합이며 Git patch·3-way merge·충돌 해결을 주장하지 않는다.
- 선택 결과의 미리보기, **전체 병합 문장 복사와 TXT 다운로드만** 추가한다. root 확정에 따라 이번 범위에는 왼쪽/오른쪽 입력에 적용 버튼도 넣지 않는다. 원래 두 입력·저장 원고·원고 5탭은 자동/명시 덮어쓰지 않는다.
- 기존 비교 Worker/취소/한도, 추가·삭제·유지 통계, 비교 표시 텍스트의 전체 복사/TXT, 전체/변경 필터와 200행 페이지, 25차 원고 전달을 유지한다. 비교 표시 텍스트는 `+/-` 기호가 있는 결과이며, 병합 TXT는 이러한 기호가 없는 완성 문서다. 둘의 버튼·파일명을 구분한다.
- CRLF와 단독 CR은 기존 비교와 동일하게 LF로 정규화한다. 따라서 ‘모두 원본’은 원본의 **LF 정규화 문장**과 같고 원본 바이트/CRLF 보존을 약속하지 않는다. 끝 개행을 나타내는 마지막 빈 줄, 실제 빈 문서, 반복 줄, 공백을 제거하지 않는다.

## 현재 코드 근거와 검증 gate

- `src/utils/lineDiff.ts`의 `splitDiffLines`는 빈 문자열을 `[]`, 그 외를 CRLF/CR→LF 뒤 `split('\n')`로 취급한다. `compareTextLines`는 공통 앞/뒤 줄을 제외하고 최대 4,000,000개 DP 셀을 처리한다. 두 입력은 각각 UTF-8 1MiB·10,000줄이다.
- `src/lib/diff/protocol.ts:isTextDiffResult`는 타입·행 번호의 순차성·개수·summary·문자 합을 검증하지만 요청 원문과 content를 대조하지 않는다. 합성 probe에서 정상 행의 content를 바꾸거나 모든 행을 지운 응답도 기존 모양 검사를 통과했다. 이는 **조작된 응답을 사용한 경계 증거**이며 실제 Worker가 잘못된 행을 생성했다는 보고는 아니다.
- 수락 시 기존 모양 검사에 더해, 요청 시점 좌우 원문을 정규화한 배열과 각 방향의 content·순차 1-based 번호·행 개수·summary를 정확히 대조한다. 전체 join 문자열만 비교하면 `[]`와 `['']`가 모두 `''`가 되는 모호성이 있으므로 배열 길이와 원소를 함께 비교한다. UTF-8 입력 한도도 이 단계에서 일치시킨다.
- 잘못된 응답은 `invalidResponse`로 처리해 마지막 정상 비교/선택을 보존한다. 신뢰 검사를 통과하지 않은 행에서 병합 문서나 다운로드를 만들지 않는다. 이 gate는 client 완료 직전 한 번 실행하며 매 구간 선택마다 반복하지 않는다.

## 결과 한도와 계산 방식

입력 한도를 그대로 병합 문서에 적용하면 정상 선택 결과를 거부한다. probe의 실제 기존 엔진 결과:

| 합성 입력 | 확인 결과 |
| --- | --- |
| 왼쪽 `a` 1,048,575자 + 끝 LF, 오른쪽 첫 LF + `b` 1,048,575자 | 각 1,048,576바이트. 공통 빈 줄 전후를 선택하면 **2,097,152바이트**·3줄 |
| 공통 앞 8,001줄 + 좌우 각각 1,999줄, 한 공통 anchor | 입력 각각 10,000줄·남은 DP 정확 4,000,000셀. 선택 병합 **11,998줄** |

새 병합 결과 budget은 **UTF-8 2MiB 포함·선택 행 최대 20,000개 포함**으로 둔다. 20,000은 두 원문의 행 개수 합에 대한 보수적 상한이며 기존 DP 제한에서 실제 최대 20,000줄이 달성된다고 주장하지 않는다. 변경 block은 한쪽만 선택하고 유지 행은 한 번 쓰므로 내용이 두 원문의 합을 넘지 않는다. 공통 행 없는 단일 block은 한 입력만 선택한다. 방어적 최종 budget 검사를 포함하고, 한도 초과를 잘라 내거나 일부만 반출하지 않는다.

`compare`의 LCS는 기존 Worker 그대로 실행한다. 병합 자체는 검증된 행을 한 번 순회하고 선택한 문자열을 `join('\n')`하는 O(행+문자) 작업이며 LCS를 재계산하지 않는다. Node 합성 prototype의 거의 2MiB 결과 생성+UTF-8 검사는 12회 중 중앙 2.35ms/최대 3.40ms였다. **Node 수치는 모바일/브라우저 응답성 근거가 아니다.** 현재 최소안은 검증을 비교 완료 시 한 번, 병합을 명시 선택 시 한 번 수행하고 React 렌더에서는 재계산하지 않는다. native 검증에서 긴 task/입력 지연이 확인되면 병합 계산도 별도 Worker 요청으로 옮긴다. 기존 LCS를 메인 스레드로 되돌리는 대안은 없다.

병합 미리보기는 200행 페이지로 제한하고 한 행이 1MiB인 사례도 고려해 **페이지 합계 50,000 UTF-16 code units·개별 행 2,000 code units**까지의 텍스트만 표시한다. UTF-16 절단이 surrogate pair를 나누지 않게 끝을 조정한다. 줄/문자 생략 안내와 전체 길이를 표시하며 복사·TXT는 항상 전체 결과다. 기존 비교 표의 표현까지 함께 바꾸지는 않는다. 페이지 바깥 구간 선택이 사라지지 않게 선택은 전체 snapshot에 저장한다.

## snapshot·선택·지난 결과 정책

- `Completed`에 단조 증가하는 `snapshotId`를 부여하고 검증된 행/원문을 복제해 고정한다. 변경 block ID는 해당 snapshot ID와 원래 행의 start/end 범위로 만들며 내용 hash나 페이지 내 index만 사용하지 않는다. 반복되는 같은 문장은 서로 다른 위치의 block이다.
- 선택은 block ID→`original | modified`이며 선택 개수와 입력된 ID의 정확성을 검증한다. 새 결과에 이전 선택을 index로 재사용하지 않는다. ‘모두 원본 / 모두 수정본’과 개별 라디오를 제공하고 no-op 선택은 revision을 늘리지 않는다.
- 입력 편집·swap 뒤에도 지난 완료 결과의 선택/병합 문서는 유지한다. 구간 선택과 반출 버튼 주변에 ‘이전 비교의 두 입력 기준’임을 명시한다. 현재 초안으로 다시 병합한 것처럼 설명하지 않는다.
- 새 비교를 시작하거나 실패/취소해도 마지막 성공 결과와 선택은 유지한다. **새 비교가 성공했을 때만** fresh snapshot + 모든 원본으로 reset한다. clear와 25차 handoff 성공 적용은 결과/선택/반출 안내를 함께 비운다.
- 단순 필터/페이지 변경은 선택이나 병합 내용을 바꾸지 않는다. 동일 값 A→B→A의 입력·언어·선택 왕복은 revision으로 구분해 오래된 반출 성공/실패가 살아나지 않게 한다.

## 반출 소유권·복구와 전달 보존

기존 비교 복사, 병합 복사, 양쪽 TXT를 **하나의 output owner** 아래 둔다. 새 요청, 선택 변경, 입력 변경, 새 성공 snapshot, clear, handoff, locale 변경, 언마운트는 이전 요청 token을 무효화한다. Worker 요청의 세대와 output 세대는 분리해 지난 결과의 구간을 고르는 행위가 최신 비교 Worker를 취소하지 않게 한다.

복사는 클릭 순간 target(`comparison`/`merged`)·전체 text·snapshot ID·선택 revision을 캡처한다. native 성공 또는 fallback true만 성공이며 오래된 거부는 fallback을 실행하지 않는다. 실패 수동 필드는 클릭했던 **전체 문자열**을 읽기 전용으로 제공한다. 큰 필드는 실패 뒤 명시 ‘전체 내용 보기/선택’에서 열어 상시 2MiB DOM을 피한다. focus/select 예외를 안내로 처리하고, 재시도·닫기도 token 소유권을 확인한다. 기존 자동 focus effect의 예외 누락을 이 범위에서 같이 보완한다.

TXT는 `toolhub-text-merged.txt`, 기존 비교는 `toolhub-text-comparison.txt`를 유지한다. 다운로드 시작도 이전 clipboard owner를 무효화한다. Blob/URL/anchor 생성·클릭 실패를 안내하고 성공·실패·언마운트에서 URL을 정확 한 번 회수한다. 새 UI에 ShareResult를 추가하거나 원문을 URL로 옮기지 않는다.

25차 `createWritingDiffReceiver`의 초기 dirty/StrictMode/조건부 consume를 그대로 유지한다. 병합 선택/반출도 pending handoff가 있을 때 사용자 작업으로 기록해 늦은 자동 수신이 최신 작업을 지우지 않게 한다. 수신 성공 때 두 입력 적용·기존 결과 제거·자동 Worker 0회 정책은 유지한다. 원고 출처 역할과 5탭/저장 bytes를 수정하지 않는다.

## 제안 파일/API와 후속 검증

이름은 구현 전 제안이며 아직 제품 파일을 만들지 않았다.

- `src/utils/lineMerge.ts`: `validateDiffAgainstSources(left,right,result)`, `prepareLineMerge(snapshotId,...)` → 고정 rows/blocks, `selectLineMerge(document,choices)` → `{text,lineCount,bytes}`. 선택 수/ID/type/budget 오류는 명시 실패.
- `src/lib/diff/protocol.ts`/`client.ts`: Worker 응답의 원문 재구성 gate 최소 연결. 기존 Worker entry/요청 제한/취소와 엔진 알고리즘은 유지.
- `src/lib/diff/output.ts`: 공통 copy/download owner·포트·수동 복구 snapshot. 기존 clipboard helper는 가능한 한 재사용.
- `src/components/LineMergePanel.tsx`: controlled snapshot·choices, block 라디오/전체 선택·200행 미리보기·전체 반출. 44px 제어, 16px 필드, 명확한 group label, 페이지 이동 후 사라진 행에 강제 focus하지 않음.
- `src/components/TextDiffWorkspace.tsx`: 완료/초기화/handoff·output owner 연결. 기존 `DiffViewer` wrapper/가이드/원문 입력 구조 유지.
- 작성자 ko/en `diffViewer.merge` 조각, canonical/페이지 설명은 integrator 소유.

순수 검증은 모두 원본/모두 수정본의 정확 LF 재구성, 빈 문서/마지막 개행/반복 줄/인접 추가삭제, 조작된 행과 summary/번호 거부, snapshot 분리, 정확 2MiB/초과와 20k 방어 경계, 전체 출력과 미리보기 분리를 포함한다. 실제 부모 검사는 stale/새 성공 reset/실패 보존, 새 비교 중 지난 선택, 출력 간 양방향 late reject, ABA/수동 선택 실패/언마운트, handoff dirty/consume/자동 Worker 0회를 확인한다. native 담당은 긴 한 줄/12k줄의 실제 선택 응답성·200행 페이지·전체 Clipboard/TXT bytes·320 KO/EN을 확인한다.

## 현재 읽기 probe 결과

`node docs/verify/2026-11-17-repeat-batch47/probe-line-merge.mjs` — **5그룹 PASS**, 실제 기존 엔진을 사용한 1,849 원문 쌍·5,063 선택 조합. 새로운 병합 로직은 문서 폴더 안의 측정용 prototype일 뿐 제품 구현이 아니다. 첫 byte fixture의 예상값은 반복 anchor의 LCS 정렬을 고정 가정해 한 차례 실패했으며, 제품 결함으로 집계하지 않고 공통 빈 줄의 정확 2MiB fixture로 고쳤다. Node의 기존 TS import에 대한 `MODULE_TYPELESS_PACKAGE_JSON` 경고가 있었고 package 설정은 바꾸지 않았다.

Chrome·전체 tsc·빌드·제품 TS·공용 번역 변경 없이 이 문서와 MJS probe만 작성했다.

범위 lint: `npx eslint docs/verify/2026-11-17-repeat-batch47/probe-line-merge.mjs` — exit 0, 오류·경고 0. 기존 44차 준비 TS는 고정 상태다.
