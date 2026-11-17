# 36차 DutchPay 미연결 준비

2026-11-17 KST. root 승인 후 순수 저장/복사 포트·복구 child와 검사를 작성했다. **DutchPay.tsx 부모 연결은 하지 않았고 기존 계산/URL codec·canonical 메시지·메타·생성물도 미수정**이다. 전체 tsc/Chrome/빌드/배포/커밋을 실행하지 않았다. 검토용 준비 TS를 stable freeze한다.

## 파일과 API

- `src/utils/dutchPayStorage.ts`: 기존 recent/account 두 key와 schema, 제한 상수, 엄격 parser, 저장 가능한 State 왕복 검증, read/write/commit, 같은 key Web Locks와 CAS/readback, 최신 계좌 입력 coordinator.
- `src/utils/dutchPayCopy.ts`: amount/notice/link 원문 snapshot, scope/request/activation guard, native/legacy 정확한 복사 결과와 stale fallback 차단.
- `src/components/DutchPayCopyRecovery.tsx`: 전체 literal readOnly 원문·유형별 label·선택 실패 안내·재시도/닫기, 16px/44px 토큰 UI. 부모가 현재 snapshot만 표시하고 닫기/완료 초점 복귀를 맡는다.
- `scripts/check-dutch-pay-storage.ts`, `scripts/check-dutch-pay-copy.ts`, `docs36/check-dutch-pay-copy-recovery.mjs`가 준비 검사다.
- `docs36/translations-dutch-pay.json`: KO/EN `dutchPay.storage`20개 + `dutchPay.copyRecovery`11개, 총31 leaf씩. 공용 통합은 부모 연결 최종본과 맞춰 요청할 예정이다.

`parseDutchPayRecent`/`parseDutchPayAccount`는 null만 빈 정상값으로 읽고 실패 때 얻은 raw도 보존한다. 계좌 raw 손상이 recent 쓰기를 막거나 반대가 되지 않는다. 정상 초기 읽기는0 write다. recent는 알려진 필드만 허용하며 decoded State와 title/n/total metadata도 대조한다. d는 UTF-8 fatal/정규 base64url·v1 왕복을 확인하므로 관대한 decoder가 조용히 버리는 내용은 저장본의 유효성으로 오인하지 않는다.

`prepareDutchPayRecent(state, at)`는 기존 State 전체를 복제한 후 정확한 왕복을 확인한다. 101항목뿐 아니라 잘리는 이름·정규화되는 weight·잘못된 amount/among도 `unsupportedState`로 거부하고 원본을 변경하지 않는다. UI의 100항목 강제 제한이나 codec 확장은 없다. 현재 metadata 산출에는 기존 simpleSplit/settle을 그대로 쓴다.

`commitDutchPayRecent(expectedRaw, operation, ports)`는 lock 대기 전에 operation snapshot을 복제/검증한다. 저장은 동일 d를 맨 앞 갱신하고 최근10개, 삭제는 해당 d만 제거한다. lock callback에서 최신 여부→raw CAS→동기 setItem→readback을 확인한다. `commitDutchPayAccount`도 같은 프로토콜이다. key별 lock이 없는 환경은 CAS/readback만 유지하며 원자성을 과장하지 않는다. readback 차단/불일치는 `unconfirmed`이며 rollback0이다.

`createDutchPayAccountWriter`는 `initialize/recheck/edit/retry/snapshot/activate/dispose`를 제공한다. edit는 즉시 메모리 value를 갱신하고 예전 대기 작업을 취소한다. 확인된 자기 write basis는 lock callback에서 즉시 갱신해 Promise continuation 전의 다음 편집도 올바른 basis로 저장한다. conflict/unconfirmed/손상 상태는 자동 재쓰기를 막으며 recheck는 현재 입력을 보존하고 자동 write를 하지 않는다. 초기 읽기 전 편집·onChange 재진입·cleanup/setup도 검사했다. React 화면 연결·storage event 구독은 부모 단계에 남아 있다.

## 실제 검사 결과

| 범위 | 결과 |
| --- | --- |
| 저장·경합·account coordinator | **12그룹 PASS** |
| snapshot/Clipboard 포트·scope 경합 | **4그룹 PASS** |
| KO/EN 실제 복구 child | **2그룹 PASS** |
| 기존 check-dutch-pay.ts 계산/URL 회귀 | **PASS**, 별도 기존 검사 |
| 제품/검사6파일 scoped lint | **exit0, 오류0·경고0** |

저장 검사는 정상 legacy 읽기0쓰기, 중복/빈 이름, 100항목·최악의 서로 다른10개 d raw **339,201 bytes**, 문자 escape/lone surrogate, 101→100 codec 손실 차단을 확인했다. 잘못된 구조·future·UTF-8/metadata·한도 원본 보존, 같은 basis 두 writer 경쟁/취소 lock, 독립 key 오류, quota/get 차단/readback unknown·rollback0, account 대기 중 새 편집/타 탭 충돌/재조회/재시도/이탈을 포함한다. controlled storage/Web Lock port의 실제 유틸 실행이며 native 두 탭 브라우저 검증으로 보고하지 않는다.

복사 검사는 native 성공/거절/없음과 legacy true/false/throw를 구분하며 늦은 성공/거절/다른 목표/재진입/언마운트/재활성화 뒤 결과를 검사한다. child 검사는 실제 렌더에서 원문 value·HTML 비삽입·유형별 label·명시 전체 선택/선택 오류·busy handler 차단·닫기와 조작 크기를 확인했다. 실제 DOM focus/Clipboard/320px는 아직 브라우저 단계다. 합성 계좌 원문을 출력 로그에 남기지 않는다.

Node 실행에서 기존 package.json의 type 미지정에 따른 MODULE_TYPELESS_PACKAGE_JSON 경고가 나오지만 검사 exit는0이다. 이를 없애려고 공용 패키지 설정을 변경하지 않았다.

## 부모 연결 때 남은 일

1. URL 초기 복원 완료 전 저장/불러오기 동작 차단, 현재 폼과 마지막 확인 저장목록·복사/저장 상태 분리. 현재 codec/legacy URL/기본 예시/비활성 모드 처리 유지.
2. storage event와 lock 대기 수명 연결. 계좌는 실패 후 메모리 notice 보존/상태 재조회 입력 보존, 명시 불러오기만 폼 적용. 손상 원본 폐기 메뉴는 추가하지 않음.
3. amount/notice/link의 의미값과 locale/ro/계좌 변화에 copy guard 연결, 성공 timer 자기 소유권, 복구 종료의 유효 초점. 공용 ShareResult optional resultKey/래퍼 click capture로 같은 화면 양방향 late-copy 경계 연결.
4. ro/account privacy·URL/저장본 미포함·편집 공지의 명시 공유 포함을 actual parent fixture로 확인하고 번역 최종본을 통합 담당에게 전달.
5. 부모 포함 scoped lint→독립 검토→지정 Chrome/전체 타입 단계. 준비18그룹을 실제 부모/브라우저 완료로 집계하지 않음.
