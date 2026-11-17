# 20차 독립 변경 경계 검토

2026-11-17 KST · 담당 writing_versions. [실행 계약](plan.md) 및 [미연결 읽기 검토](preconnection-review.md)를 기준으로 최종 부모 연결을 확인했다. **독립 실행 20그룹 통과(초기 19 + 브라우저 발견 abort 순서 회귀 1), 현재 추가 제품 수정 요청 없음.** 제품 파일은 수정하지 않았다. Chrome·전체 tsc·빌드·패키지 설치는 실행하지 않았다.

작성자 자체 domain/UI 검사, root의 읽기 검토, 이전 17차 ICS 검사와 이번 20그룹을 중복 집계하지 않는다. 이 보고서는 실제 브라우저 결과를 대신하지 않는다. 신규 검사 CJS 3파일 scoped ESLint는 exit 0, 오류·경고 0이다.

## B. 말하기 기록: 16그룹

### 실제 부모 이벤트: 7그룹

명령: `node docs/verify/2026-11-17-repeat-batch20/check-speaking-component.cjs`

`SpeakingPractice.tsx` 실제 코드를 기존 컴포넌트 harness로 실행했다. 녹음기·모델·저장소·파일 다운로드는 제어 포트다. React 렌더러·브라우저 DOM/IndexedDB 통과로 주장하지 않는다.

1. legacy 저장 기준을 편집 updatedAt과 분리한다. 저장 대기 중 제목·전사문을 다시 편집해도 완료가 최신 입력을 덮지 않고, 다음 저장은 commit에서 받은 revision을 사용한다. 기존 첫 take의 Blob·피드백도 유지한다.
2. commit 이후 목록 읽기만 실패하면 저장 완료와 재조회 실패를 구분한다. 다음 편집/저장의 기준은 commit된 revision이며 quota 실패는 제목·dirty를 보존한다.
3. 충돌 후 목록을 재조회해도 현재 draft/저장 기준을 새 목록으로 바꾸지 않는다. 불러오기 확인 취소 시 현재 원문을 유지하고, 명시 확인 후에만 다른 revision을 채택한다.
4. 현재 저장본을 삭제하는 동안 편집한 제목·전사문은 유지한다. 삭제 완료 후 다음 저장은 absent 기준이며 오래된 revision을 제거한다.
5. 다른 기록의 삭제 충돌/성공이 현재 작성 중 기록의 revision과 원문을 바꾸지 않는다.
6. 모든 take 검색·NFKC 검색어·모드 필터·결과 없음이 현재 원고를 유지한다. TXT에 선택 이름과 모든 take를 포함하고 공유 URL에 이름을 넣지 않는다.
7. 언마운트 뒤 저장/삭제가 늦게 완료돼도 목록 재조회나 현재 화면 갱신을 이어 가지 않는다.

fixture의 첫 실행에서는 VM Promise의 완료 전 microtask 횟수만 고정해 save 버튼이 아직 busy인 상태를 관찰했다. 이벤트 루프 턴을 기다리도록 검사를 수정한 뒤 통과했다. 제품 결함으로 집계하거나 제품을 수정하지 않았다.

### 실제 저장 API + 제어 IDB 이벤트: 9그룹

명령: `node --experimental-strip-types docs/verify/2026-11-17-repeat-batch20/check-speaking-storage.cjs`

실제 `recordStorage.ts`와 `records.ts`를 호출했다. fixture는 같은 store의 트랜잭션을 직렬화하고 staged map/commit/abort를 제어한다. 이는 **IDB 이벤트 계약의 mock 검사이며 실제 Chromium의 트랜잭션 스케줄러·디스크 quota 검사가 아니다.** 실제 브라우저 두 탭/IDB 검사는 verify 담당 결과와 분리한다.

1. DB open 전 input/basis snapshot 분리, put success만으로 성공하지 않음, tx complete 뒤에만 성공, Blob·피드백 보존.
2. put/delete request success 뒤 transaction abort가 발생하면 성공하지 않고 staged 변경을 rollback한다.
3. 같은 legacy basis로 두 writer가 경쟁하면 한쪽만 commit하고 다른 쪽은 conflict다.
4. revision update/delete의 두 순서에서 뒤의 오래된 작업을 거부한다.
5. 미래 기록을 포함한 physical 19개에서 두 신규 ID가 경쟁해 총 20개만 남는다. 꽉 찬 상태의 기존 ID 갱신은 가능하다.
6. 손상/미래 기록을 non-absent 갱신·삭제하거나 absent로 덮으려 해도 원본을 바꾸지 않는다.
7. get/count/put 요청의 quota 실패에 phantom commit이 없고 연결을 닫는다.
8. getAll success 뒤 tx complete 전에는 목록 성공을 반환하지 않는다. post-read abort는 목록 실패다. 정상 목록은 unreadable/unsupported/total과 legacy Blob을 보존한다.
9. 브라우저 검증에서 발견한 **request.error=AbortError → bubbled tx error(tx.error=null) → onabort** 순서를 추가했다. 작성자의 최소 수정 뒤 list/save/delete가 모두 `storageAborted`를 유지하며 원본과 연결 정리 경계가 통과했다. 기존 15그룹 전체를 다시 돌리지 않고 이 영향 그룹을 별도 실행했다: `node --experimental-strip-types docs/verify/2026-11-17-repeat-batch20/check-speaking-storage.cjs "native request"`.

초기 fixture는 transaction error 전에 tx.error를 채워 실제 브라우저의 null 경계를 포함하지 못했다. 이 한계를 브라우저 결함 발견 이후 수정했다. 제품은 이제 onerror에서 request/transaction 오류를 캡처하고 onabort에서 최종 실패를 판정하며 oncomplete만 성공으로 본다. 브라우저 발견을 독립 최초 발견으로 주장하지 않는다.

Node의 MODULE_TYPELESS_PACKAGE_JSON 경고는 실행 환경의 기존 TS import 감지 안내다. 패키지 형식 변경은 하지 않았다.

## A. 음력 기념일: 4그룹

명령: `node docs/verify/2026-11-17-repeat-batch20/check-lunar-independent.cjs`

작성자가 이미 검사한 원 윤달/짧은 달/CRUD·Clipboard 조합을 전부 반복하지 않고 남은 변경 경계에 집중했다. 실제 `LunarSavedAnniversaries`, `LunarConverter`, `LunarAnniversaryCalendar` 코드를 실행하고 storage/lock/DOM/SHA 완료 시점만 제어했다.

1. **쓰기 이후 readback 실패:** 실제 raw에는 저장됐을 수 있으므로 rollback을 주장하지 않는다. 입력 이름은 보존하고 unverified를 표시하며 명시 재조회 전 추가 작업을 막는다. 재조회는 이미 저장된 목록을 확인하고 자동 중복 저장하지 않는다.
2. **두 실제 패널의 lock 경쟁:** 같은 raw를 읽은 두 패널을 하나의 lock queue에 대기시킨다. 첫 저장만 성공하고 두 번째는 충돌·입력 보존이다. 명시 refresh 후 재시도하면 두 기록이 모두 남는다. 실제 두 브라우저 탭의 lock 구현을 검증한 것은 아니다.
3. **storage event 없이 바뀐 raw:** load 확인 후 lock 대기 중 다른 raw로 바뀌면 callback 안의 재조회가 충돌을 반환하고 부모 입력 교체를 호출하지 않는다.
4. **같은 기록 다시 불러오기 + 늦은 SHA:** 최초 URL 원 날짜가 우선이다. 명시 load는 원 윤달 연도를 복원하고 ICS 제목을 전달한다. 같은 기록을 다시 load해도 JSX key가 바뀐다. 이전 달력에서 선택·다운로드를 시작한 뒤 key 변경에 해당하는 cleanup/remount를 실행하면 새 달력은 제목만 유지하고 연도는 미선택이다. 이전 SHA가 늦게 완료돼도 Blob URL/다운로드 클릭을 생성하지 않는다.

기존 공용 harness의 JSX 모형에 `key` 인수 보존 한 줄만 추가했다. 이전 fixture의 렌더/이벤트 동작은 바꾸지 않았다.

## 판정과 남은 실제 환경 범위

검사 중 제품 수정이 필요한 재현 결함을 발견하지 않았다. 저장 전 실패와 쓰기 후 확인 불가를 구분하고, 최신 입력·원 날짜·음성 Blob·commit된 기준을 유지하는 코드 경계를 확인했다.

실제 IndexedDB의 두 탭 직렬화/abort/quota, localStorage Web Locks, 320px·키보드·실제 다운로드/카메라·모델 등은 해당 브라우저/기존 검증 결과에서만 판정한다. 이번 변경이 없는 모델 코드를 실행하거나 대용량 모델을 다시 내려받지 않았다. 이전 검사의 전체 재실행은 하지 않았다.
