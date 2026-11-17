# 56차 실제 부모 독립 검토 준비

상태: 준비 API·plan·baseline을 읽고 독립 기대값을 정리한 당시 문서다. 후속 부모 final 뒤 실제7그룹 PASS는 `independent-parent-review.md`에 별도로 기록했다. 작성자 준비14그룹을 반복 실행하거나 그 assertion을 가져오지 않았다. 이 문서 담당은 제품 TS/canonical/공용 host를 수정하지 않았다.

## 읽은 계약

- `imageConversionQueue`: 표시 key는 즉시, 실행은250ms 후. pause는 현재 파일 완료 후 다음만 보류한다. 이미 수용한 lastSuccess만 보존하고 이전 작업의 늦은 성공/오류는 새 설정에 승격하지 않는다. 설정 A→B→A도 세대로 구분한다.
- `imageConversionImports`: 같은 생명주기에서 정상 동시 추가는 함께 보존하며 clear/unmount만 모든 이전 헤더 읽기를 무효화한다. header read 실패는 기존 MIME/파일명 fallback을 유지한다.
- `imageConversionActions`: 현재 설정의 성공만 ZIP 클릭 snapshot에 고정한다. 단순 행 추가/삭제는 snapshot을 바꾸지 않으며 설정/reset/unmount는 취소한다. 기존 이름 예약/Blob/ZIP runner를 재사용한다.
- 준비 상태의 controller dispose는 재활성화 API가 없으므로 부모 setup별 인스턴스가 필요하다. 한 controller의 최대 process1과 페이지 remount 간 전역 native 실행량 보장은 구분한다. 전역 gate를 이번 독립 검토만으로 새 요구에 추가하지 않는다.

## 별도 기대값/제어 포트

실제 부모 및 실제 새 유틸을 연결하고 헤더 읽기·convertImage·ZIP encode·URL/anchor·clock만 합성한다. 원본 File identity, 옵션 객체, 각 요청의 시작/resolve/finally 순서, 생성/revoke된 URL과 Blob 내용을 독립 ledger에 기록한다. native decoder/pixel 성능은 verifier의 별도 범위다.

1. **pause/실행 순서:** 파일 A/B/C를 추가해 A 실행 중 pause→파일 D 추가→옵션 변경→debounce 완료→A 완료를 진행한다. 그 뒤 명시 resume 전 process 추가0이며 A의 옛 결과는 수용하지 않는다. 최신 설정 B/C/D 순서와 정상 연타·끝난 뒤 pause 상태를 별도 모델로 대조한다.
2. **실제 이전 파일:** 성공 JPG(품질/배경 포함)를 받은 뒤 새 PNG가 실패해도 이전 Blob/URL은 남는다. 현재 완료 합계와 ZIP은0, 개별 반출만 실제 JPG 이름/bytes/options를 사용한다. 새 성공 때 이전 URL을 정확히1회 해제한다. 같은 JPG라도 품질/배경 변경은 같은 형식이라는 이유로 현재 결과 취급하지 않는다.
3. **세대·삭제·재시도:** draft key 즉시 변경과250ms 안정화, ABA 옛 성공/오류, remove/clear 뒤 늦은 완료, 현재 error만 retry, 새 파일 추가로 실패가 자동재시도되지 않음, paused retry 보존을 확인한다. 오래된 timer 실행을 직접 호출하되 현재 handler로 새 요청도 정상 실행되는지 함께 본다.
4. **입력·URL:** 두 헤더 batch의 역순 완료가 모두 보존되며 reset/unmount 뒤 이전 read는0추가. 지원 판별/실패 fallback은 기존 API를 이용한다. f/q/bg 복원/early intent/Strict replay, 무관 중복 query/hash/history.state 보존과 URL 쓰기 실패 때 화면·원본 유지 확인.
5. **ZIP:** 현재 성공만 캡처하고 고유 파일명/Blob identity를 독립 비교한다. 캡처 후 행 삭제·추가와 설정 변경·reset을 각각 구분한다. old encode 성공/실패가 새 요청 다운로드/status를 바꾸지 않으며 실패 후 명시 retry가 가능하다. object URL/anchor 실패·unmount cleanup을 대조한다.
6. **실제 부모 수명/표시:** KO→EN→KO에서 원본·옵션·작업 소유권 유지. setup replay 전후 이전 controller/handlers의 영향0·개별URL소유권·중복해제0을 확인한다. 진행 중 이전 native promise는 실제 finally까지 정리되며 force-cancel했다고 주장하지 않는다.

## 보존 경계

기존 `imageConvert.ts`·압축/resize engine·원래 100MiB/0/SVG·HEIC/EXIF·format detection 정책은 변경하지 않는다. 이전 baseline JSON/MJS도 그대로 보존한다. 새 파일 저장소/원문 query/서버·모델·패키지를 추가하지 않는다. 원래 before 관측6을 새 assertion 통과수로 중복 세지 않는다.

56 부모 final 신호 뒤 fixture를 작성/실행하고 실제 결과와 한계를 별도 보고서에 기록한다. 58 복사 복구는 root의 미연결 child final 이후 별도 소유 파일로 짧게 검토하며57 Worker/원고 기능과 혼합하지 않는다.
