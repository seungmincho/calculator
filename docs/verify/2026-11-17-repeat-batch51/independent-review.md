# 51차 D-day 출력 복구 독립 검토

상태: **실제 부모/자식 독립 8그룹 PASS, 추가 재현 제품 결함 없음.** 제품 TS·작성자 검사·기존 before JSON은 수정하지 않았다. 작성자 helper 6/actual 8 및 기존 ICS63·날짜 검사는 다시 실행하거나 독립 집계하지 않았다.

## 방법과 범위

`independent-dday-output.mjs`는 작성자의 `dday-output-harness.mjs`에서 I/O·훅 호스트만 재사용한다. 실제 DdayCalculator/DdayCalendarExport/DdayCopyRecovery/ShareResult와 제품 helper를 실행하며 작성자 assertion은 가져오지 않는다. native Clipboard·anchor·PNG를 제어 포트로 바꾸고 SHA-256은 실제 Node Web Crypto, 반출은 실제 Blob을 사용한다.

독립 기대값은 새로 작성했다. ICS는 별도 unfold/TEXT parser로 읽고 기존 UID의 고정 identity tuple을 Node `createHash`로 산출한다. 날짜 기대값은 2028-02-29→2028-03-01이라는 고정 표본을 사용한다. D-label은 UTC epoch 간격으로 대조해 제품 날짜 helper를 oracle로 재호출하지 않았다.

## 통과한 8그룹

1. **현재 문구·명시 URL·수동 복구:** 특수문자/한글/공백 제목, D-label과 date/title을 확인했다. 클릭 때 존재하는 외부 중복 query/hash도 명시 URL에 유지된다. native API 부재·legacy false/throw는 전체 원문 복구로 남고, legacy true 재시도는 성공한다. 선택 실패도 원문을 지우지 않는다. 옛 close는 새 성공을 지우지 않으며, 다른 고정 일정이 있는 수신 화면에서도 같은 일정이 복원된다.
2. **100개 전체 내용과 UID:** 49→0→99의 클릭 순서부터 확인한 뒤 전체 선택 100개를 실제 ICS로 반출했다. 고정 목록의 정렬 순서, 쉼표/세미콜론/백슬래시/줄바꿈/이모지 제목, 모든 DTSTART/DTEND/UID를 대조했다. EN 전환 후 UID/내용이 같으며 원본 저장 raw 쓰기 0이다. 현재 일정이 저장 항목과 일치할 때 기존 saved UID도 그대로 사용한다.
3. **SHA 중 외부 변경:** 선택한 100개 중 하나의 제목만 다른 탭 값으로 바꿨을 때 파일 전체를 거부한다. URL 생성/anchor 0이고 100개 checkbox와 외부 raw를 유지한다. 이후 손상 raw도 덮어쓰거나 선택 일부를 내보내지 않는다.
4. **복사↔공용 공유↔ICS 소유권:** 결과 copy, 실제 ShareResult link/PNG, pending ICS를 교차 시작했다. 옛 copy 거절의 legacy fallback 0, 옛 SHA·PNG의 download 0이다. 현재 명시 요청만 완료된다.
5. **취소와 ABA:** cancel→재시작 뒤 옛 cancel/source handler가 새 작업을 건드리지 않는다. 옛 SHA를 먼저 완료해도 새 busy가 유지된다. 제목 A→B→A, KO→EN→KO, mode 이탈/복귀 후 옛 SHA는 파일을 만들지 않는다. 다음 명시 클릭은 현재 snapshot을 반출한다.
6. **안내·복구 callback:** 입력/언어 ABA 뒤 옛 retry/close가 복사를 새로 시작하거나 안내를 부활시키지 않는다. 이전 성공 때 캡처한 실제 2초 callback을 강제로 실행하고 오래된 native 성공을 전달해도 최신 실패 복구의 전체 원문을 지우지 않는다.
7. **101개 제한과 기존 목록 기능:** 101개 선택에서 disabled를 무시하고 handler를 직접 호출해도 hash/download 0이다. 한 개를 해제하면 다시 가능하다. 기존 pin/load 동작은 모든 ID·title·date를 유지하며 명시 선택한 고정 항목만 변경한다.
8. **실패·Strict·cleanup:** Strict replay 뒤 정상 반출, anchor 실패 안내와 즉시 URL 회수, 성공 URL 30초 회수, pending copy/SHA/PNG 상태에서 unmount를 확인했다. 이탈 뒤 late 완료는 새 반출/legacy가 없고 모든 생성 URL은 정확히 1회 회수된다.

## 실행 기록

```text
node docs/verify/2026-11-17-repeat-batch51/independent-dday-output.mjs
7 initial groups passed
node docs/verify/2026-11-17-repeat-batch51/independent-dday-output.mjs 101selected
1 additional group passed
node docs/verify/2026-11-17-repeat-batch51/independent-dday-output.mjs "copy feedback"
1 existing group with forced old-timer boundary passed
```

독립 합계는 **8그룹**이며 마지막 영향 재실행을 더하지 않는다. 초기 작성 중 parser 함수의 닫는 괄호 누락과 번역 성공 문구를 잘못 가정한 assertion(`복사했어요`→정본 `복사됨`)은 fixture 오류였다. 이를 고친 뒤 제품 수정 없이 처음 7그룹이 통과했고, 나머지 경계를 위와 같이 추가했다.

이 검사는 실제 OS Clipboard·캘린더 가져오기·파일 저장 확인·CSS/320px·실제 PNG를 증명하지 않는다. 기존 주소창 writer의 무관 query 제거 정책은 이번 계약에서 제외되어 리팩터링하지 않았으며, 명시 반출 URL만 클릭 시점 값을 검증했다. 공용 ShareResult 자체의 전체 포트 검증이나 기존 날짜/공휴일 자료를 새 독립 결과로 확대하지 않는다. Chrome·전체 타입·빌드·공개 RPC는 실행하지 않았다.

`npx eslint docs/verify/2026-11-17-repeat-batch51/independent-dday-output.mjs` 최종 exit 0, 오류 0·경고 0이다.
