# 56차 이미지 변환 작업 제어 — 실제 부모 독립 검토

상태: **독립 실제 부모 7그룹 첫 실행 PASS, 추가 재현 결함·제품 수정 요청 없음.** 작성자 준비14·부모9와 구분한다. baseline6을 실행하거나 통과 수에 합산하지 않았다.

## 실행 근거

```text
node docs/verify/2026-11-17-repeat-batch56/independent-parent-check.mjs
npx eslint docs/verify/2026-11-17-repeat-batch56/independent-parent-check.mjs
```

actual-parent host의 I/O 포트만 재사용하고 작성자 assertion은 가져오지 않았다. 실제 `ImageConverter` + queue/import/actions를 실행하며 `convertImage`·JSZip encode·DOM/URL·timer만 제어한다. header는 실제 `readHead`에 File.slice 제어 포트를 제공한다. 파일 identity/호출 순서/설정/Blob bytes/URL·상태는 별도 기대값과 비교했다. Node TS import의 기존 module 재해석 경고와 무관하게 exit0이었다.

## 독립 결과

| 그룹 | 별도 확인 경계 | 결과 |
| --- | --- | --- |
| 1 | 파일A 진행 중 pause→PNG로 변경→D추가→250ms 완료. 이전A promise가 끝날 때까지 슬롯 유지, stale output URL 해제, 명시 resume 전 다음 시작0. resume 뒤 A/B/C/D 순서·모든 PNG·물리 process 최대1 | PASS |
| 2 | JPG85/흰 배경 성공 뒤 같은 JPG55 변환 실패. 이전 Blob/preview URL·다운로드명·실제85/배경 label 유지, 현재 합계/전체다운로드 제외. 새 배경 성공 때 이전 URL 정확1회 해제, 옛 개별다운로드 handler 무효 | PASS |
| 3 | error A + done B 뒤 C추가는 C만 시작하며A 자동retry0. paused retry는A만pending으로 바꾸고 자동resume0. 품질85→30→85와 옛timer/이전 error 완료는 새 attempt에 오류·현재 성공을 붙이지 않는다 | PASS |
| 4 | 두 헤더batch 역순 완료에서 batch별 원순서 유지·모든 정상추가 보존. 헤더 실패는 MIME fallback. reset 뒤 pending header와 이전 convert 완료는 추가/복원0, 새 batch는 정상이고 unmount 뒤 read/convert도 무복원·자원정리 | PASS |
| 5 | 동명이미지2개의 ZIP entry 이름과 Blob identity 고정. 캡처 뒤 행삭제/추가에도 ZIP내용 유지. old cancel은 새 ZIP을 취소하지 않음, encode실패→retry/cancel, 설정/reset/unmount 뒤 늦은 ZIP다운로드0. 임시다운로드URL과previewURL 정리 분리 | PASS |
| 6 | 초기 URL복원 전 WebP 직접선택이 우선. 외부중복 query/hash/history.state 유지. URL 쓰기실패에도 원본행·이전Blob 유지/실패안내. 이후외부popstate의 품질·배경 복원·다른query/hash 보존 | PASS |
| 7 | 실제effect setup replay로 새controller생성, old pause/convert 완료가 새목록·상태에 영향0. 이전작업drain뒤 새파일 정상. KO→EN→KO는preview/작업 유지. 다운로드실패 후재시도, unmount뒤 oldURLtimer를호출해도중복revoke0 | PASS |

## 해석 범위

- pause는 **현재 파일 완료 후 다음만 보류**다. native decode/encode 즉시중단을 검증했다고 주장하지 않는다. 물리 process 최대1은 같은 controller 흐름의 결과이며 remount 전역게이트 보장은 아니다. replay 검사에서는 이전 physical promise를 drain한 뒤 새 작업을 시작해 소유권과 격리만 검증했다.
- actual conversion encoder는 제어 포트다. 출력 Blob의 **정확한 참조·전달 bytes·actual options label**을 확인했으며 픽셀·색·EXIF·압축률·실제 브라우저 메모리 성능을 재인증하지 않는다.
- ZIP encode는 합성 포트여서 entries/Blob snapshot/다운로드 소유권을 검증한다. 실제 ZIP 포맷과 native 픽셀은 작성자 준비/전담 브라우저 결과와 별도로 표기해야 한다.
- 원래100MiB·HEIC·format detection 정책을 바꾸지 않았고 기존 engine2파일은 검사 전후 해시가 같다. 이 검토는 모든 파일 포맷을 다시 실행하는 검사가 아니다.

실행된 제품 검사에는 실패가 없었다. 최종 lint에서 독립 fixture의 미사용 보조 함수1개 경고를 제거했고 runtime assertion이나 제품은 바꾸지 않았다. 영향은 해당 MJS lint만 재확인했다.

## 검토 해시

- `ImageConverter.tsx`: `edf40893cb9ea1df366607de0b997421e2bd68bb8b52246e9eece7994c275ff2`
- `imageConversionQueue.ts`: `f7b411bd36fdca09f2f0824f8c03faab540839f7d1dca3b1ba1a20bc59a4c544`
- `imageConversionImports.ts`: `7850def3897df58bd7c4262bbd3a8fa303efc8d5f4ab3a4740493aad293b180e`
- `imageConversionActions.ts`: `5b27cf2d64941bb0c963c5a0919599a34ca80f5c3b4d0e7881e87f9a67100475`
- 보호한 `before-fix.json`: `6648904cb43d1d88337d83436521f7cf4efe4de22c4df0483916521d4ce052e7`

기존 `imageConvert.ts`·`imageCompress.ts`·baseline JSON/MJS의 검사 전후 불변 assertion PASS. 제품 TS/canonical/공용 host/원본 probe 수정0. Chrome·전체 타입·빌드·배포·커밋 실행0.

최종 독립 MJS scoped lint: **exit0, 오류0·경고0**.
