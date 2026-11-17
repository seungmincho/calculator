# 말하기 기록 이름·검색 — 저장 API 준비

2026-11-17 KST. [20차 B 계약](plan.md)을 따른다. 18차 공용 번역의 브라우저 영향 검증까지 완료된 뒤 기존 말하기 코드를 읽었다. `SpeakingPractice.tsx`, `core.ts`, `storage.ts`는 19차 체크포인트 신호 전까지 수정하지 않는다.

## 현재 코드에서 확인한 경계

- `SpeakingSession` v1은 mode/시각/takes만 정의한다. 이름·revision이 없으며 기존 validator는 음성 Blob/전사/피드백을 검사한다. 20개 session, session당 5take, take당 전사 1,200자 한도다.
- `listSpeakingSessions()`는 잘못된 데이터를 조용히 filter하고 request 성공 시 resolve한다. 손상 기록이 있는지 UI에서 알 수 없다.
- `saveSpeakingSession()`은 같은 ID의 존재/개수만 확인한 뒤 전체 session을 put한다. `deleteSpeakingSession()`은 ID만으로 삭제한다. 둘 다 저장 기준 비교가 없다.
- 편집 중 `updatedAt`은 appendTake/updateTake가 계속 바꾼다. 따라서 legacy 저장 기준을 현재 session.updatedAt에서 나중에 읽으면 안 된다.
- 현재 save는 commit 뒤 목록 재조회까지 성공해야 dirty를 지운다. 목록만 실패한 경우 이미 저장됐다는 사실과 새 revision을 잃지 않도록 분리해야 한다.
- 실제 기존 storage API 호출자는 SpeakingPractice 한 곳이다. 모델/worker/audio 코드는 변경할 필요가 없다.

## 추가 타입과 기존 API 변경안

DB 이름 `toolhub-speaking-practice`, 버전 1, object store `sessions`/keyPath `id`는 유지한다. 별도 DB upgrade 없이 v1 문서의 선택 필드만 추가한다.

```ts
type SpeakingRecord = SpeakingSession & { title?: string; revision?: string }
type SpeakingStoredBasis =
  | { kind: 'absent' }
  | { kind: 'legacy'; updatedAt: number }
  | { kind: 'revision'; revision: string; updatedAt: number }
type SpeakingStoredRecord = { session: SpeakingRecord; basis: SpeakingStoredBasis }
type SpeakingRecordList = {
  records: SpeakingStoredRecord[]
  unreadableCount: number
  unsupportedCount: number
  totalCount: number
}
```

| 기존 함수 | 예정 반환/인자 | 이유 |
| --- | --- | --- |
| `listSpeakingSessions()` | `Promise<SpeakingRecordList>` | 유효 기록과 각 저장 기준을 함께 읽고 숨겨진 손상/미지원 항목 수도 알림 |
| `saveSpeakingSession(session, expected)` | `Promise<SpeakingStoredRecord>` | expected는 필수. commit으로 확정된 새 revision을 목록 재조회와 독립적으로 반환 |
| `deleteSpeakingSession(id, expected)` | `Promise<void>` | 선택한 목록 항목의 저장 기준과 현재 저장본이 같을 때만 삭제 |

준비 파일은 신규 `src/lib/speaking/records.ts`(타입/제목·검색/저장 기준), `src/lib/speaking/recordStorage.ts`(IDB 구현), `scripts/check-speaking-records.ts`다. 기존 storage.ts는 체크포인트 뒤 새 구현을 연결하고 SpeakingPractice 호출부를 같은 변경에서 전환한다. unsafe한 expected 생략 호환 경로를 남기지 않는다.

`title`은 선택적 40자 문자열이며 이름 없는 기존 기록을 읽을 때 필드를 만들어 쓰지 않는다. 명시 저장 시만 앞뒤 공백을 정리하고 빈 이름은 기존 모드/시각 표시로 사용한다. 중복 이름은 허용하고 ID로 식별한다. `revision`은 유효한 비어 있지 않은 문자열 토큰으로 검증하고 모든 새 저장마다 새 값을 만든다. 기존 v1 validator가 허용한 본문/Blob/take/feedback을 새 스키마라는 이유로 불필요하게 버리지 않는다.

## 트랜잭션 계약

- save/delete는 하나의 readwrite transaction 안에서 현재 ID를 읽고 기준을 비교한 뒤 put/delete한다. get과 write 사이에 Promise/타이머/외부 I/O를 await하지 않는다.
- `absent`: 같은 ID가 어떤 값으로든 이미 존재하면 생성 충돌. 기존 기록을 overwrite하지 않는다.
- `legacy`: 저장된 데이터에도 revision이 없고, 처음 읽을 때 캡처한 updatedAt과 같을 때만 쓴다. 성공하면 revision 있는 형식으로 전환한다.
- `revision`: revision과 캡처한 updatedAt을 함께 확인한다. revision을 그대로 남기는 옛 탭의 일부 수정도 updatedAt으로 감지한다. 다만 revision을 모르는 옛 탭이 guarded API 없이 덮어쓰는 경쟁을 완전히 막는다고 주장하지 않는다.
- 신규 ID는 전체 key 개수를 확인해 20개 한도를 적용한다. 손상/미지원 기록도 물리적으로 자리를 차지하므로 개수에서 빼고 새 기록을 덮어 넣지 않는다. 기존 ID 갱신은 한도에서도 가능하다.
- 목록 조회도 request 성공만으로 확정하지 않고 readonly transaction 완료를 기다린다. 쓰기는 `tx.oncomplete`에서만 성공으로 처리하고 abort/error/quota/blocked를 구분한다. IndexedDB commit 뒤 다른 transaction이 수정할 수 있으므로 별도 readback에서 최신 revision을 현재 편집 기준으로 자동 채택하지 않는다.
- 잘못된 기존 대상/미지원 버전은 수정·삭제하지 않는다. 목록은 정상 기록과 손상/미지원 개수를 표시하고 원본을 그대로 둔다. 최초 범위에 손상 항목 강제 삭제·자동 복구·DB 재생성을 넣지 않는다.
- DB open의 blocked/error/늦은 success를 정리해 이미 reject한 연결을 열어 두지 않는다. 모든 완료 경로에서 연결을 닫는다.

## UI 상태와 늦은 완료

- 현재 연습 옆에 선택적 이름 입력을 두고 기존 ‘기기에 저장’에 포함한다. 목록 검색은 제목과 **모든 take 전사문**을 대상으로 하며, 전체/자기소개/업무 보고 필터를 적용한다. 검색/필터/언어 변경은 session을 바꾸지 않는다.
- 저장 기준은 current session.updatedAt과 별도 state/ref에 보관한다. 새 연습은 absent, 목록에서 불러온 기록은 목록이 캡처한 basis를 사용한다. 단순 목록 재조회로 현재 편집의 basis를 최신값으로 바꾸지 않는다.
- save는 클릭 시 snapshot/basis/session ID와 편집 세대를 캡처한다. commit 후 같은 연습이면 새 basis를 반영하되, 그 사이 편집했다면 dirty를 유지하고 새 원문을 덮지 않는다. 다른 연습을 열었거나 unmount됐다면 뒤늦게 현재 입력/성공 안내를 바꾸지 않는다.
- 모델 작업용 기존 job ref와 저장/목록 작업 세대를 분리한다. 이름 검색이나 목록 재조회가 진행 중 ASR/코칭을 취소하지 않게 한다.
- commit 성공과 목록 재조회 실패를 구분한다. 새 basis는 commit 결과에서 먼저 갱신하고, 재조회 실패는 ‘저장은 됐지만 목록을 다시 읽어야 함’으로 안내한다. 충돌/저장 실패 시 현재 title·음성·takes·피드백을 유지한다.
- 목록의 열기/삭제는 ID 기준. 삭제에는 해당 항목 basis를 전달하고 늦은 완료가 다른 연습을 dirty로 만들지 않게 한다. 현재 연습의 저장본을 실제로 삭제했다면 입력은 유지하고 다음 저장 기준만 absent로 전환한다.
- 제목은 텍스트 파일에 포함하지만 요약 URL에는 추가하지 않는다. 음성 반출·모든 take·첫 take 비교·생성 코칭 동의 흐름은 유지한다.

## 검증

- 순수: title 0/40/41자·제어문자, 이름 없는 v1/revision 없는 basis, 동일 제목 ID 구분, 모든 take 검색/공백·대소문자/모드 필터, 편집 중 updatedAt과 저장 기준 분리, same revision+다른 updatedAt 충돌, 새 ID 충돌, Blob/take/feedback 불변.
- IDB/독립: 실제 v1 DB 읽기와 무자동 migration, 동일 readwrite transaction의 get→compare→put/delete, 두 탭 갱신/삭제 경합, commit 전 abort/quota, 손상/미지원 기록 노출과 유지, 20개 물리 한도, 목록만 실패한 저장 성공 경계.
- 브라우저: 새 방문·선택 이름/빈 이름 저장·검색 결과 없음·모드 필터, 현재 입력/언어 왕복 보존, 수동 입력·첫 take 비교·텍스트 파일/요약 URL·음성 Blob 보존, late 작업/320px/44px/16px. 모델 코드가 그대로면 대용량 모델 재다운로드를 필수로 하지 않는다.

기존 파일 연결은 root의 19차 체크포인트 신호 이후다. 독립 신규 TS도 19차 전체 타입 검사 직전에는 작성 단위 안정화와 편집 정지를 통합 담당에게 알린다.

## 미연결 준비 결과

- `records.ts`, `recordStorage.ts`, `check-speaking-records.ts`를 추가했다. 기존 `SpeakingPractice.tsx`/`core.ts`/`storage.ts`는 연결하지 않았다.
- `node --experimental-strip-types scripts/check-speaking-records.ts`: 11그룹 통과. 제목·검색·legacy/revision 기준·Blob/피드백 보존·손상/미지원 목록·open blocked/늦은 연결 정리·quota 경계를 확인했다.
- 신규 3파일 scoped ESLint: exit 0, 오류 0/경고 0. 실제 IDB 트랜잭션 경합·abort/commit 경계는 연결 뒤 독립/브라우저 검사로 확인하며 이 순수 검사로 대신했다고 주장하지 않는다.
- 19차 전체 타입 검사와 충돌하지 않도록 TS 편집 중지를 통합 담당에게 알렸다.

## 부모 연결 준비 완료

19차 체크포인트 신호 뒤 `SpeakingPractice.tsx`와 `storage.ts`를 연결했다. `core.ts`·모델 client/worker·녹음 훅·다운로드 동의 흐름은 변경하지 않았다.

- `storedBasis` ref는 편집 중 updatedAt과 분리된다. `practiceGeneration`은 새 연습/불러오기, `editGeneration`은 title/take 편집을 추적한다. 저장·목록 작업 카운터는 기존 AI job과 별개다.
- 저장 대기 중 제목·전사문 편집을 허용한다. commit 뒤 편집 세대가 같으면 저장 snapshot을 적용하고, 다르면 새 revision만 채택해 화면 최신 원문과 dirty를 유지한다. commit 기준은 목록 재조회보다 먼저 반영한다.
- 목록 재조회 실패는 저장 실패와 별개로 표시한다. 현재 연습을 덮지 않는 명시 새로고침과 손상/미지원 개수 안내를 제공한다. 같은 연습의 저장본 삭제 완료는 입력을 유지한 채 기준을 absent로 바꾼다.
- 이름은 텍스트 반출에만 포함한다. 기존 공유 URL의 모드/시간/어절 수만 담는 계약을 유지했다.
- 브라우저 선택자: `#speaking-session-title`, `#speaking-history-search`, `#speaking-history-filter`, `[data-speaking-record="id"]`, `[data-speaking-save]`, `[data-speaking-refresh]`.
- 자체 검증: 신규 기록 검사 11그룹 + 기존 말하기 검사 18그룹 PASS. 변경 5파일 scoped ESLint exit 0, 오류 0/경고 0. ko/en 조각 `translations-speaking-records.json`은 통합 담당이 병합·생성했다.
- 실제 IndexedDB와 부모 상태의 독립/브라우저 결과는 별도 보고서에서 관리한다. 제품 ready 통지 뒤 TS 편집을 멈추고 발견된 결함 대응을 우선한다.

브라우저 검증에서 native abort의 요청 오류가 `tx.error === null`인 동안 먼저 bubbling해 일반 저장 오류로 표시되는 경계를 발견했다. `tx.onerror`에서는 요청 오류를 캡처하고 최종 `onabort`에서 실패를 확정하도록 보완했다. `oncomplete`만 성공하는 계약은 유지한다. 변경 파일 lint 오류 0/경고 0, 자체 기록 11그룹 통과 뒤 실제 Chrome 영향 1건에서 abort/quota 안내 구분, DB/Blob·이름·원고 보존과 재시도를 확인했다. 브라우저 담당의 최종 말하기 결과는 13/13, JS/hydration 오류 0이다.
