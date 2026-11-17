# 43차 단위 변환 일괄 UI — 미연결 준비

후속: 37/39/40 타입 체크포인트 뒤 부모 연결과 작성자 검사를 완료했다. 아래는 준비 시점 기록이며 현재 상태는 [implementation.md](./implementation.md)를 따른다.

2026-11-17 KST. **신규 자식/복사 actions 준비 완료·TS 고정**. 기존 `UnitConverter.tsx`와 canonical·공용 ShareResult는 수정하거나 연결하지 않았다. root 소유 `unitBatch.ts`/`check-unit-batch.ts`는 읽기 전용으로 사용했다. 부모 연결은 37/39/40 전체 타입 체크포인트 뒤 별도 신호를 기다린다.

## 소유 파일·검사

| 파일 | 책임 |
|---|---|
| `src/components/UnitBatchConverter.tsx` | 입력·명시 실행 snapshot·이전 결과 안내·처음200행/전체 반출 |
| `src/components/UnitCopyRecovery.tsx` | 클릭 당시 전체 텍스트 선택·재시도·닫기 |
| `src/utils/unitBatchActions.ts` | 부모 소유 단일/행/일괄 공통 복사 세대·늦은 결과/타이머 무효화 |
| `scripts/check-unit-batch-actions.ts` | 복사6그룹 |
| `docs43/check-unit-batch-children.mjs` | 실제 자식5그룹·별도 delimited-text reader |
| `translations-unit-batch.json` | KO/EN batch·batchCopy 조각, 연결 전 canonical 미병합 |

실행 결과:

```text
node scripts/check-unit-batch-actions.ts                             6그룹 PASS
node docs/verify/2026-11-17-repeat-batch43/check-unit-batch-children.mjs 5그룹 PASS
```

신규 제품3파일 및 검사2파일 scoped ESLint exit0·오류0·경고0. 합계11그룹은 root의 core10그룹과 별도로 집계한다. 이미 통과한 root core/기존 units 회귀는 중복 실행하지 않았다. actual child 검사는 JSX/효과/핸들러를 실행하고 DOM·Clipboard·URL 다운로드만 포트로 대체했다. 실제 브라우저/OS Clipboard·다운로드·320px layout을 완료했다고 주장하지 않는다.

## 자식 API와 처리 정책

`UnitBatchConverter` props:

- `pair: UnitFavoritePair | null`, `ready: boolean` — 현재 조합과 URL 복원 준비 상태. c/f/t/p/rb의 알려진5필드만 부모가 전달한다. 전통 단위 요약처럼 조합이 없으면 null이며 실행을 막고 위에서 개별 조합을 선택하라고 안내한다.
- `copyState: UnitCopyState | null`, `onCopy(request)`, `onInvalidateCopy()` — 단일/행/일괄의 부모 소유 복사 컨트롤러를 연결한다. 콜백은 안정 참조를 유지한다. 일괄 target ID는 `batch`다.
- `recovery?: ReactNode` — 부모가 현재 batch 실패에 해당하는 복구 UI를 전달한다. 다른 target의 실패 복구는 부모에서 표시한다.

초기 textarea에는 숫자 예시1/10/100이 있지만 실행은 사용자가 변환 버튼을 눌러야 한다. 기본 단일 변환 결과는 기존 부모에 남는다. 문자열은 자동 저장/URL/최근값/서버로 전달하지 않는다. 원문이50,000자/1,000물리행을 넘으면 잘라내지 않고 현재 원문과 이전 정상 snapshot을 보존하며 실행 오류를 표시한다. textarea의 maxLength로 원문을 조용히 자르지 않는다.

core가 반환한 불변 source/pair/rows snapshot만 결과로 저장한다. 입력이나 단위/정밀도/rem 기준이 바뀌면 표는 이전 결과임을 표시하며 다시 실행하기 전까지 CSV/TSV도 이전 snapshot을 사용한다. 언어 변경은 숫자를 재계산하지 않으며 현재 표시 언어의 헤더/상태로 반출한다. 원문/단위/언어 변경·unmount는 진행 중 복사와 복구 안내를 무효화한다.

미리보기는 처음200행이며 전체/정상/오류/빈 행 수를 각각 표시한다. 빈 줄과 오류행도 전체 반출에 포함한다. 마지막 줄바꿈 하나만 종결자로 제거하고 추가 빈 줄은 보존한다. 빈 원문 실행은0행 결과로 표시하며 복사/CSV가 비활성이다.

CSV/TSV는 root의 serializer를 그대로 사용한다. CSV는 UTF-8 BOM이 정확히 한 번 들어가며8열·1,000데이터행+헤더를 별도 parser로 확인했다. 수식 형태 원문과 탭 오류 원문도 보존되며 텍스트 보호 prefix를 유지한다. 다운로드는 기존 `createShareResultDownloads`의 자원 owner를 사용해 성공 후 예약/언마운트에서 URL을 정확히 회수한다.

## 복사 actions와 부모 연결 예정

`createUnitCopyController({clipboard?, after}, onChange)`는 `request({id,text,label})`, `retry(token)`, `close(token)`, `invalidate()`, `dispose()`, `getSnapshot()`을 제공한다. 단일 결과·전체표·행·일괄은 한 controller를 공유한다. token은 요청마다 새로운 불변 객체이며 현재 token과 동일할 때만 후속 안내/재시도/타이머가 유효하다.

네이티브 Clipboard 성공 또는 실제 fallback true만 성공으로 표시한다. 복사 실패 후 full text와 target label을 부모 복구 UI에 제공한다. 기존 안전한 `copyShareResultLink`의 텍스트 복사 구현을 재사용하며 새 브라우저 Clipboard 구현이나 공용 API는 추가하지 않았다. 늦은 native 성공/거부, 다른target 시작, 입력/locale ABA, 이전 성공 타이머, unmount, stale retry/close를6그룹에서 확인했다.

후속 부모 연결은 root가 지정한 기존 검증 패턴을 따른다.

1. 단일/행/일괄의 모든 복사를 같은 controller로 연결하고 입력·즐겨찾기 load/swap/정밀도/rem·locale 변화는 동기적으로 무효화한다.
2. 자체 copy begin 때 `shareRevision`을 증가시켜 ShareResult `resultKey`에 반영한다. ShareResult wrapper `onClickCapture`는 자체 controller만 invalidate하며 입력 context를 지우지 않는다. copy context/locale도 resultKey에 포함한다.
3. 이번 준비에서 ShareResult optional API/공용 파일을 확대하지 않는다. 실제 양방향 경합은 부모 연결 후 검증하며 새 재현이 있다면 root 소유 공용 범위로 보고한다.
4. 단일 결과 옆에44px 열기/접기 진입을 두고, 처음 연 뒤에는 자식 상태를 유지하여 접기/재열기에서 원문·snapshot이 사라지지 않게 한다. 단일 입력/결과는 숨기지 않는다.
5. 기존 URL/즐겨찾기/최근8개/전통 단위·전체표의 의미를 유지하고 batch raw는 해당 경로에 전달하지 않는다.

## 준비 선택자

- `#unit-batch-input`, `[data-unit-batch-run]`, `[data-unit-batch-clear]`
- `[data-unit-batch-result]`와 `data-unit-batch-stale`, `[data-unit-batch-line]`, `[data-unit-batch-counts]`
- `[data-unit-batch-copy]`, `[data-unit-batch-csv]`, `[data-unit-batch-error]`
- `[data-unit-copy-recovery/manual/select/retry/close]`

남은 범위: 기존 부모 연결·양방향 ShareResult 경합·URL/즐겨찾기/최근값 회귀·독립/native/전체 타입. 새 패키지·Chrome·전체 tsc·빌드·배포·커밋은 실행하지 않았다. 현재 상태를 전체 기능 완료로 표시하지 않는다.
