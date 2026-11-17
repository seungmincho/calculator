# 한글 워들 기록·공유 준비 체크포인트

후속: 37/39/40 전체 타입 체크포인트 뒤 부모 연결 승인을 받아 자식/번역/부모 구현과 작성자 21그룹 검사를 완료했다. 최신 상태·선택자·통합 계약은 [implementation.md](implementation.md)에 있다. 아래는 미연결 순수 준비 당시의 기록으로 보존한다.

2026-11-17. 37차 native 발견 대응을 마친 뒤 **신규 순수3파일(storage/history/controller)과 실행 검사11그룹 PASS**까지 완료했다. 기존 `check-korean-wordle.ts` 전체 회귀도 PASS다. **부모 연결·canonical 변경0**이며 자식 UI/KOEN 조각은 아직 미작성이다. 40차 실제 부모 독립 검토를 먼저 수행하도록 순수 준비를 이 완결 단위에서 고정한다.

## 구현한 순수 경계와 다음 연결

- `utils/koreanWordleStorage.ts`: 기존 daily/settings/legacy 키를 그대로 읽는다. `{ok:true, raw, value}` 또는 `{ok:false, raw?, error}` 반환. daily와 settings를 따로 읽고 손상/미래 구조/초과 raw는 원문 보존·쓰기 중지한다. legacy는 첫 유효하고 played>0인 키 하나만 선택하며 키별 오류도 전달한다. 초기 읽기는0쓰기.
- daily validator는 canonical 정수 회차(음수/0 포함)·실제 JS Date 왕복·미래 날짜 차단·2글자 사전 단어0..6·hard optional boolean·terminal 뒤 추가 추측 차단을 수행한다. 반복 오답은 허용하고 하드 모드 판정을 저장 검증에서 새로 재해석하지 않는다. JSON.parse가 중복 키를 덮기 전에 별도 lexical property scan으로 중복 여부만 확인하며 JSON 구문 파서는 교체하지 않는다.
- `appendDailyGuess(basis, {day,prefix,hard,guess}, ports)`는 클릭 시점을 복제한다. lock 안 최신 raw를 검증한 뒤 같은 prefix append 또는 이미 반영된 동일 prefix 제출을 구분한다. 다른 날짜 최신 기록은 보존한다. 분기/짧아진 기록/다른hard는 conflict, 즉시 재확인 raw가 바뀌면 쓰지 않는다. readback 실패/불일치는 writeUnknown이며 rollback하거나 성공으로 표시하지 않는다. 실패 반환값은 새 쓰기 basis가 아니며 명시 재조회 이전 쓰기 차단은 부모가 유지한다.
- lock 대기 중 단순 모드/날짜 전환은 이미 완료한 옛 날짜의 저장 의미를 없애지 않는다. 명시 reload/cancel/unmount만 저장 작업 세대를 무효화한다. 화면 반영은 별도 round/view 세대를 검사한다.
- `utils/koreanWordleHistory.ts`: 전체 검증 기록에서 최신30개 표시 모델만 만든다. 통계 원본을 자르지 않는다. 완료 행의 날짜·회차·status·시도수·hard·기존 색상 격자/공유 텍스트를 반환하며 실제 정답/추측은 출력 모델에 포함하지 않는다. 진행 중 행은 격자/복사 없음.
- `utils/koreanWordleController.ts`: 동기 accepted-guess 소유로 중복 Enter를 막고 완료 snapshot은 별도 1회 claim한다. mode/practice/day 변경으로 view/timer를 무효화해도 이미 확정한 completion을 지우지 않는다. timer는 channel별 등록+view token으로 무효화하며 옛 reveal이 새 판 잠금을 풀지 않는다. copy 전대상은 별도 단일 요청 세대를 공유한다.
- `KoreanWordleHistory.tsx` 및 작은 copy recovery 자식은 부모 미연결 상태로 준비한다. KO/EN fragment도 같은 담당이 작성하고 원본 messages는 통합 담당에게 넘긴다. 부모 연결 시 ShareResult와 자체 current/history copy의 양방향 세대 경계가 필수다.

## 보호 상한 근거

`measure-storage.mjs`는 실제 순수 사전과 날짜 seed로 오늘부터 과거 날짜마다 정답이 아닌 유효 단어를6회 반복한 합성 데이터를 생성했다. 로컬/브라우저 저장소와 공개 리더보드는 사용하지 않았다. 결과는 `storage-measurements.json`에 있다.

- 321일:27,820 UTF-8 bytes.
- 80,000일:7,187,819 bytes, 기본 JSON.parse41.83ms·기존computeStats80.71ms(현재 Node 단일 관찰).
- 같은80,000일의 한글을JSON `\uXXXX`로 표현하면10,067,819 bytes다.
- 80,001일은7,187,909 bytes이므로 날짜수 제한은 raw byte와 독립해 검사해야 한다.

8MiB/80,000일은 기존 무상한을 보장하는 최대값이 아니라 구현 보호 예산이다. 유효한 동일 내용도 escape/공백 때문에 초과할 수 있다. 초과 기록은 원문을 유지하고 해당 키 저장/부분 통계 채택을 멈추며 사용자에게 이유를 안내한다. 최근30개로 축약하거나 초과 행만 삭제하지 않는다. Node 측정은 브라우저/휴대전화 처리 시간을 보장하지 않는다. 엄격 parser 구현 후80,000일/7,187,819B의 실제 validator는281.77ms를 관찰했다. 정확8MiB whitespace JSON 허용/1byte 초과 거부,80,001일 거부, 같은 유효 내용의 escaped raw 초과 원문 보존을 검사했다. 매우 큰 유효 기록은 초기 읽기에서 main thread 지연을 만들 수 있으며 모바일 성능 보장으로 표현하지 않는다.

## 아직 남은 작업

자식44px/16px/전체 readOnly 격자 UI·검사, KO/EN 조각, 실제 부모 연결과 전체 타입/독립/native 검증은 남아 있다. 부모는 준비 검토와 별도 연결 신호 전까지 수정하지 않는다. 37 수정 요청이 오면 이 작업보다 우선한다.

## 완료한 검사

`node scripts/check-korean-wordle-records.ts` —11그룹: strict daily/음수·0·terminal, decoded duplicate key, settings/legacy 분리·첫유효1개·초기0쓰기, 정확 byte/day 한도·전체 통계와30projection, prefix append/이미반영/다른날보존/분기, quota/prewrite CAS/readbackunknown/손상raw보존, 지연lock/캡처/취소/settingsCAS, spoilerfree격자·고정링크, 동기중복submit·완료의미와view분리, channel timer/자정/복원완료, copy 전대상/ABA/늦은fallback차단. 마지막 settings basis 재검증 보완 후 해당 지연lock1그룹만 영향 재실행PASS했다.

`node scripts/check-korean-wordle.ts` — 기존 사전445/1379·113/159, seed·채점·입력조합·통계·격자 회귀 PASS.

초기 범위5파일 lint exit0: 신규3util·검사TS·합성측정mjs. 마지막 settings basis 보완의 util/검사2파일 lint도 exit0이다. 실제 localStorage/공개RPC·Chrome·전체tsc·build는 실행하지 않았다.
