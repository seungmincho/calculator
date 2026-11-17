# 56차 이미지 변환기 미연결 준비

상태: root가 pause/lastSuccess/ZIP 정책을 승인한 뒤 **새 순수 유틸3개 + 검사 TS1개**를 준비했다. 실제 `ImageConverter.tsx`와 기존 engine/공유 유틸/API/100MiB·HEIC 정책은 미수정이며 부모 연결은 다음 체크포인트의 별도 신호를 기다린다.

## API와 소유권

- `imageConversionQueue.ts`: `createImageConversionQueue({options,process,release,onChange,schedule?,cancel?})`. `getSnapshot/add/remove/clear/setOptions/pause/resume/retryFailed/dispose`를 제공한다. `setOptions(next, delay=250)`는 표시 key를 즉시 바꾸고 세대를 올리며 자체 ticket으로 debounce를 소유한다. current process는 finally까지 슬롯을 점유한다. pause는 진행 중인 파일의 성공을 수용하고 다음 파일을 보류한다. pause 이전의 processing 알림에서 동기 pause가 발생하면 아직 시작하지 않은 process도 시작하지 않는다.
- Snapshot은 `options/key/settling/paused/activeId/phase/items`를 가진다. 각 행의 `status/attemptKey/error`와 `lastSuccess={key,options,output}`를 분리했다. 성공 output과 options wrapper는 동결하며 Blob 자체는 immutable 원본을 보존한다. 설정 변경/실패는 이미 수용한 성공을 해제하지 않고, 최신 성공 교체·행 삭제·clear·dispose에서만 해제한다. 늦은 output은 release하고 기존 성공으로 승격하지 않는다.
- `imageConversionImports.ts`: `createImageConversionImports({add,read?,onChange?})`의 `add(files)/clear/dispose/getReading`. readHead/acceptFile/detectFormat의 기존 정책을 재사용한다. 정상 동시 추가는 서로 취소하지 않고 각 묶음 내 입력 순서를 보존한다. clear/unmount 세대만 모든 pending read를 무효화한다. read 실패는 기존 MIME/파일명 판별로 이어지고 callback 실패는 `failed`를 반환한다. 헤더 실패를 변환 실패로 오인하지 않는다.
- `imageConversionActions.ts`: current-setting 성공만 고정하는 `captureImageConversionZip`, 요청별 기존 `createImageZipRunner`를 소유하는 `createImageConversionZip(run/cancel/dispose/getSnapshot)`, f/q/bg 소유필드만 변경하는 `imageConversionSettingsUrl`. ZIP은 기존 고유이름 예약 함수를 재사용한다. 부모는 reset/settings/unmount에서 cancel/dispose를 연결하고 단순 파일 추가/삭제에서는 취소하지 않는다.

실행기를 dispose한 뒤 재활성화하는 API는 없다. React StrictMode setup에서는 mount별 controller를 생성하고 그 cleanup이 소유 controller만 dispose해야 한다. `useMemo`의 단일 영구 인스턴스를 cleanup에서 폐기하고 재사용하는 형태로 연결하지 않는다. 부모 실제 fixture에서 effect replay·옛 handler를 별도 검증한다.

## 검사와 현재 한계

`node scripts/check-image-conversion-queue.ts`: **14그룹 PASS**.

- process 동시1·최신 성공 snapshot/options 동결.
- 현재 파일 완료 후 pause·resume 연타·finally drain.
- 설정 변경/실패 뒤 lastSuccess 보존·새 성공 URL 교체.
- 새 파일 추가의 실패 자동 retry 없음·현재 실패만 retry·paused 유지.
- 즉시 draft key·250ms·timer ID재사용·A→B→A 늦은 결과 폐기.
- remove/동일ID 재추가·clear/add 뒤 old process 무복원.
- processing 알림에서 pause/remove/clear/dispose 재진입.
- release 실패와 중복 ID add 원자성.
- 독립 header batch/역순 완료/이름 fallback.
- clear/unmount 헤더 세대·새 batch 보존·100MiB/0/SVG 정책.
- 동기 header clear·add callback 오류.
- current-only snapshot·원래 이름 예약·실제 JSZip 바이너리 encode/decode roundtrip.
- ZIP 취소/새 요청/encode·download 실패/재시도/unmount.
- URL owned fields·무관 중복/hash·기본설정 정규화.

이 검사는 실제 변환 engine의 픽셀/브라우저 decoder 실행을 대신하지 않는다. 부모는 아직 원래 상태라 baseline6의 결함도 아직 수정되지 않았다. 실제 ZIP 테스트만 기존 JSZip을 이용해 각 entry 바이트를 독립 확인했고, 반출 runner의 encode/download는 제어 포트다. Node의 TS module type 감지 경고는 package.json 변경 사유로 삼지 않았다.

TS4파일은 최종 동결했다. 첫 scoped lint의 검사 prefer-const2건은 통합 담당의 타입 실행 전 허용을 받아 명시 타입 있는 const 선언으로만 보완했다. 제품3+검사1파일 최종 scoped ESLint exit0, 오류0·경고0이다. 기능14그룹 결과와 선언 lint 보완을 구분하며 전체 타입/native/부모 연결은 아직 별도다.

## 번역과 다음 연결

`translations-image-conversion-queue.json`: ko/en 각27 leaf 준비, 아직 canonical 미병합. 일시정지는 다음 파일만 보류한다는 안내와 ZIP 별도 취소를 구분한다. 이전 성공은 포맷뿐 아니라 품질/JPG 배경까지 실제 성공 설정을 함께 표시한다. 실패·URL 저장 오류·현재 설정만 일괄 반출이라는 계약을 포함한다.

부모 연결 순서는 mount 소유 queue/import/ZIP 생성 → 기존 설정/event의 최신 live ref와250ms controller 연결 → 집계/이전 성공 표시·개별/ZIP output ownership → URL 초기복원/unknown/state → 실제 부모/번역/static/native 순이다. `convertImage`는 그대로 호출하고 결과에 부모 소유 object URL을 붙이는 adapter만 추가한다. `readHead` 원문/파일/변환 결과의 저장소는 추가하지 않는다. 반출 URL은 기존 공용 다운로드 lifecycle helper 재사용을 우선한다.

