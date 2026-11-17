# 43차 단위 변환 일괄 입력 — 부모 연결 완료

2026-11-17 KST. 작성자 범위 구현·실제 부모 검사·범위 lint 완료. **제품/검사 TS 안정·고정**. canonical 병합은 통합 담당이 완료 통지했으며, 독립 native 검증과 전체 타입은 각 담당의 후속 범위다. 실제 Chrome·전체 tsc·빌드·배포·커밋은 작성자가 실행하지 않았다.

## 연결 결과

`UnitConverter.tsx`의 기존 단일 입력·기본 결과·단위표·즐겨찾기·최근8개·URL을 유지했다. 현재 조합 바로 아래44px 열기/접기 버튼을 추가했다. 첫 열기에서만 일괄 자식을 마운트하고 이후 접기에서는 `hidden`으로 보존하므로 원문과 마지막 실행 결과가 남는다. 열기 시 패널로 이동한다. 기존 단일 입력/결과는 숨기지 않는다.

일괄 입력은 부모의 category/from/to/유효숫자/rem 기준만 받으며 단일 값과 독립이다. 부모에서 즐겨찾기·단위·swap·정밀도·rem 기준을 변경하면 이전 실행임을 안내하고, 명시적으로 다시 실행하기 전에는 표·TSV·CSV가 원래 snapshot을 사용한다. 전통 단위 요약은 한 쌍이 없으므로 실행을 막으며 기존 요약 행 선택으로 개별 조합을 고른다.

한 줄에 숫자 하나, 최대1,000물리행/50,000 UTF-16 code units, 처음200행 미리보기, 전체 반출 정책은 root의 `unitBatch.ts`를 그대로 사용한다. 빈 행·오류행을 빼지 않고 마지막 줄바꿈 하나만 종결자로 처리한다. 한도 오류는 원문과 이전 결과를 보존한다. 새 저장소·서버 전달·일괄 원문의 URL/최근값 기록은 없다.

단일 입력의 서버/첫 클라이언트 기본값은 기존과 같고 URL 초기 복원 뒤에 URL/최근값을 쓴다. 초기 복원보다 사용자 편집이 먼저면 편집을 유지한다. 무관 query의 중복 값·hash·history.state를 보존한다.

## 복사·이미지·CSV 소유권

부모의 `createUnitCopyController` 하나가 main·단위 행·전통 단위 행·batch TSV를 관리한다. 새 요청/입력·설정/언어 변화/언마운트는 이전 native 응답과 fallback·복구 안내를 무효화한다. native 성공 또는 실제 fallback true만 성공이고, 실패 시 클릭 당시 전체 문자열을 읽기 전용 필드에서 선택하거나 재시도할 수 있다.

자체 복사 시작/재시도와 CSV는 `shareRevision`을 갱신해 ShareResult `resultKey`를 바꾼다. ShareResult wrapper capture는 자체 복사 owner만 무효화하고 입력 context는 유지한다. 따라서 ShareResult를 사용한 다음에도 같은 단일 값 복사가 가능하다. child의 `onBeginOutput()`은 CSV에 명시적으로 연결했으며 context 무효화와 별도 콜백으로 표현했다. 두 콜백은 안정 참조이고 revision은 입력 context에 포함하지 않아 효과 순환이 없다.

root의 사전 CSV 경계 메모는 **읽기 우려**였으며 수정 전 실행 결함으로 집계하지 않는다. 연결 후 실제 부모·UnitBatchConverter·ShareResult를 실행해 PNG 렌더 Promise 대기 → CSV 클릭 → 오래된 PNG 완료에서 CSV 한 개만 다운로드됨을 확인했다. CSV 후 새 PNG 요청은 정상 다운로드된다. 기존 공용 ShareResult/API 파일은 수정하지 않았다.

## 작성자 검사

| 검사 | 결과 | 범위 |
|---|---:|---|
| 준비 `scripts/check-unit-batch-actions.ts` | 6그룹 PASS | 최신 copy owner·실제 fallback 결과·재시도·late/unmount |
| `check-unit-batch-children.mjs` | 5그룹 PASS | actual child/복구·1000행 전체 CSV/TSV 별도 parser·한도·locale ABA |
| 신규 `check-unit-parent.mjs` | 8그룹 PASS | 실제 연결 부모/자식/ShareResult·URL/최근/즐겨찾기·교차 요청 |

UI/actions 작성자 합계19그룹. 자식5그룹은 CSV 콜백 변경 영향으로 재실행했고 그대로 통과했다. root의 core10그룹·기존 units 회귀와 독립 core7그룹은 별도 근거이며 이번 연결에서 불필요하게 반복하지 않았다.

부모8그룹의 세부:

1. CSS 비기본 URL/초기 HTML 상태·초기 사용자 편집 우선·무관 query/hash/history.state.
2. 첫 열기 마운트·접기/재열기 원문/결과 유지·일괄 편집의 단일 URL/최근8개/입력 분리.
3. 즐겨찾기 조합 load의 단일 값 보존·CSS rem/precision·swap·이전 snapshot 반출.
4. 전통 단위 요약 실행 차단·기존 행 선택으로 조합 복귀.
5. main→batch→row→ShareResult link→main 순환 요청, 늦은 거부의 fallback/오래된 복구0.
6. actual ShareResult PNG 대기→CSV→late PNG0, CSV의 pending clipboard 취소, 새 PNG 허용·URL 정확1회 회수.
7. 원문/locale ABA, full manual TSV·retry, 이전 recovery close의 새 요청 보호.
8. Strict effect replay·unmount 뒤 Clipboard/이미지 완료의 fallback/다운로드/원문 저장0.

범용29 hook/event host만 재사용했다. 새 부모 fixture는 실제 제품 코드를 번들링해 각 컴포넌트 효과와 핸들러를 실행한다. native Clipboard/DOM anchor/이미지 렌더만 제어 포트다. 실제 브라우저의 캡처 전파/렌더 배치·OS Clipboard·파일 다운로드·320px 시각 검증과 구분한다.

scoped ESLint **7파일 exit0·오류0·경고0**:

`UnitConverter.tsx`, `UnitBatchConverter.tsx`, `UnitCopyRecovery.tsx`, `unitBatchActions.ts`, `check-unit-batch-actions.ts`, `check-unit-batch-children.mjs`, `check-unit-parent.mjs`.

## native 인계 선택자

- 기존 입력: `#uc-value`, `#uc-from`, `#uc-to`, `#uc-sig`, `#uc-rb`; `[data-unit-category="css|traditional|…"]`, `[data-unit-swap]`.
- 진입: `[data-unit-batch-toggle]`의 `aria-expanded`; `#unit-batch-panel`은 접어도 마운트를 유지하며 hidden 상태만 바뀐다.
- 일괄: `#unit-batch-input`, `[data-unit-batch-run/clear]`, `[data-unit-batch-result]`의 `data-unit-batch-stale`, `[data-unit-batch-line]`, `[data-unit-batch-counts]`.
- 반출: `[data-unit-copy="main|m|cm|trad.<id>"]`, `[data-unit-batch-copy/csv]`; 공유 `[data-unit-share-boundary]` 안의 실제 `[data-share-action="copy|save|share"]`.
- 복구: `[data-unit-copy-recovery/manual/select/retry/close]`; field는 클릭 당시 전체 내용을 유지한다. ShareResult는 기존 `[data-share-recovery]`.
- 오류: `[data-unit-batch-error="tooManyCharacters|tooManyRows|invalidPair"]`.

native에서 우선 확인할 경계는 CSV 전 pending PNG의 실제 Promise/렌더 순서, 양방향 copy race,1,000행 실제 다운로드 bytes와 BOM·8열, 실제 paste·320px KO/EN이다. 공개 외부 쓰기나 실제 사용자 자료는 필요 없다.

## 번역·남은 담당 범위

작성자 조각 `translations-unit-batch.json`은 준비본과 동일한 최종본이며 `unitConverter.batch`/`batchCopy`를 KO/EN 함께 작성했다. 통합 담당이 공용 guide와 함께 병합·생성/정적키 검사 완료를 통지했다. 이후 발견 결함은 작성자가 우선 대응한다. 전체 타입과 native를 아직 이 문서에서 통과로 주장하지 않는다.
