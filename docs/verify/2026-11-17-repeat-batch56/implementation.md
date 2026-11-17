# 56차 ImageConverter 부모 연결 완료

상태: **작성자 실제 부모9그룹·기존 image-convert 회귀 PASS, scoped lint exit0, TS 동결**. 독립 담당의 실제 부모7그룹 첫 PASS를 수신했으며 최종 독립 문서는 담당 보고서를 따른다. canonical28키는 통합 담당이 병합하며 native/전체 타입 완료는 아직 별도다.

## 구현 범위

실제 부모 `src/components/ImageConverter.tsx`가 준비한 `imageConversionQueue/Imports/Actions`를 연결했다. 신규 자식 컴포넌트는 없다. 기존 `imageConvert.ts`의100MiB 한도, decoder/encoder, HEIC/native 판단, EXIF·format detection·큰 이미지 실패 시 축소, 기존 API와 다른 도구는 변경하지 않았다. 22차 압축과 달리 이 변환기의 pause는 **현재 파일을 완료한 다음 다음 파일만 보류**한다.

- 정상 추가는 자동 순차 처리하며 한 controller의 실제 process promise 최대1을 finally까지 유지한다. paused 상태는 파일 추가/설정 변경/실패 retry에서도 유지한다.
- 설정은 표시 key를 즉시 갱신하고 새 실행은250ms 묶는다. 이 사이 이전 성공은 ‘이전 성공’으로 표시하며 현재 집계/전체 다운로드에 포함하지 않는다. 다른 설정의 진행 중 결과와 A→B→A 이전 세대는 폐기한다.
- 이미 수용한 lastSuccess의 Blob/URL/실제 포맷·품질·JPG 배경은 다음 변환 실패에도 보존한다. 행에는 현재/이전 성공 구분과 당시 설정을 표시하며 개별 다운로드도 그 포맷·이름을 사용한다. 새 성공이 도착하면 이전 미리보기 URL을 교체한다.
- 실패 retry는 현재 안정된 설정의 실패만 pending으로 돌린다. 새 파일이 들어왔다고 기존 실패를 자동 retry하지 않는다.
- header 읽기는 현재 목록 생명주기만 공유한다. 정상 동시 추가는 모두 보존하며 초기화/이탈 뒤 늦은 추가는 막는다. 각 batch 내 파일 순서는 유지하고, 완료 순서가 다른 batch끼리는 완료된 묶음부터 추가한다. 최신 파일 선택의 skipped/error 안내가 이전 완료로 바뀌지 않게 별도 notice 세대를 둔다.
- ZIP은 클릭한 현재 설정 완료 Blob snapshot이다. 파일 추가/삭제는 snapshot을 바꾸지 않으며 **reset/settings/unmount는 취소**한다. old cancel/retry/완료가 새 ZIP의 상태를 바꾸지 않는다. 개별/ZIP 다운로드는 공용 URL 소유 helper의30초/해제 cleanup을 사용하고 실패 시 성공 결과를 지우지 않는다. 이미 브라우저에 제출한 다운로드를 되돌린다고 약속하지 않는다.

## URL과 생명주기

서버와 첫 렌더는 기본 설정이다. 취소 가능한 `restoreInitialImageConversion` 0ms callback이 URL을 읽고, 그 전에 사용자가 설정을 편집하면 **그때 보이던 전체 옵션이 우선**한다. 파일만 먼저 선택하면 pending으로 보관해 복원 전 기본 설정으로 변환하지 않는다. ready 전 출력과 제어 버튼은 동작하지 않으며 파일 입력 자체는 가능하다.

`writeImageConversionSettings` 250ms callback은 model identity/runtime을 확인한 뒤 f/q/bg만 set/delete하고 무관 query 중복값·hash·history.state를 보존한다. 초기 writer/옛 timer가 사용자 편집을 되돌리지 않는다. 소유 query가 바뀐 popstate는 새 설정으로 복원하고 hash/무관 query만 바뀌면 대기열을 건드리지 않는다. URL 쓰기 실패는 별도 안내하며 현재 설정·파일·결과를 유지한다.

Strict effect setup마다 queue/import/ZIP/download controller를 새로 만들고 cleanup은 그 인스턴스만 폐기한다. 이전 controller의 늦은 native 완료는 URL을 해제하며 새 runtime에 영향을 주지 않는다. ‘동시 process1’은 한 mounted controller의 계약이고, 강제 effect replay/새 mount를 가로질러 이전 브라우저 promise까지 전역 직렬화하는 gate는 추가하지 않았다. native API가 중간에 강제 종료된다는 주장도 하지 않는다.

## 작성자 검증

| 검사 | 결과 |
|---|---|
| 준비 순수/포트 `scripts/check-image-conversion-queue.ts` | 기존14그룹 PASS, 이후 util 변경0 |
| root 독립 준비 | 별도7그룹 PASS, 작성자 합계에 포함하지 않음 |
| 실제 부모 `docs56/check-image-converter-parent.mjs` | 9그룹 PASS |
| stable commit callback 의존 정리 후 영향 | 기존 URL/Strict2그룹만 재확인 PASS, 중복 집계하지 않음 |
| 기존 `scripts/check-image-convert.ts` | PASS |
| 제품/준비/검사7파일 scoped ESLint | exit0, 오류0·경고1 |
| 부모 `git diff --check` | 오류0, 플랫폼 CRLF 안내만 |
| KOEN28키 | key/placeholder parity PASS |

실제 부모9그룹은 URL/early intent, pause+locale/settings, previous success/실패/retry, header동시·clear, ZIP snapshot·reset/settings/unmount, ZIP oldcancel/실패/재시도/다운로드 실패,100MiB/0/SVG/HEIC 및 encoder 지원, Strict old runtime/URL해제, 번역/접근성 계약을 확인한다.

실제 React 코드는 메모리 host로 실행하며 `convertImage`, JSZip 생성, DOM 다운로드만 제어한다. header는 실제 readHead를 사용하고 File.slice().arrayBuffer() 응답만 지연시킨다. 이는 실제 이미지 픽셀/native Clipboard·DOM focus/native ZIP 렌더의 증거가 아니다. 준비14의 별도 JSZip 왕복에서는 실제 entry 바이트를 검사했다. 브라우저는 전담 verifier가 별도로 실행한다.

lint 경고1은 로컬 Blob 미리보기를 native `<img>`로 표시하는 `@next/next/no-img-element` 안내다. 변경 전 lint 실행으로 ‘기존 경고’라고 확인한 것은 아니므로 그 표현은 쓰지 않는다. hook dependency 경고는 refs 기반 stable commitSettings로 해결했고 host의 module 변수 명명 오류는 hostModule로 정리했다.

원래 `before-fix.json`/`probe-image-converter-baseline.mjs`는 그대로 보존했다. 원래 source SHA에 대한6개 관측과 현재 고친9개 기대값을 분리하며 baseline 스크립트를 새 부모에 맞춰 약화하지 않았다. 본 담당은 whole tsc/Chrome/build/commit/deploy를 실행하지 않았다.

## 최종 선택자와 native 인계

- `[data-image-converter][data-conversion-ready]`.
- 파일 `[data-conversion-input]`, 포맷 `[data-conversion-format="jpeg|png|webp|avif"]`, 품질 `[data-conversion-quality]`, JPG 배경 `[data-conversion-bg]`.
- `[data-conversion-action="pause|resume|retry|clear|cancelZip|retryZip"]`, `[data-conversion-controls][data-conversion-phase][data-conversion-settling]`.
- 결과 앵커 `#image-converter-result`, 상단 MobileResultLink. 상태/개수는 현재 설정 기준이다.
- `[data-conversion-row="id"][data-conversion-status]`, `[data-conversion-success="current|previous"]`, `[data-conversion-download="id"]`, `[data-conversion-remove="id"]`.
- 전체 반출 `[data-conversion-download-all]`, ZIP `[data-conversion-zip-state="working|failed|canceled"]`.
- `[data-conversion-reading]`, `[data-conversion-import-error]`, `[data-conversion-url-error]`, `[data-conversion-download-error]`.
- 초기 restore named0ms / writer named250ms. queue debounce는 개별 ticket/세대 callback이다. 원래 native `convertImage`/`File.slice(0,64).arrayBuffer`/`JSZip.generateAsync` 경계 그대로다.

## 번역

최종 `translations-image-conversion-queue.json`은 ko/en 각28키다. 준비27에서 downloadPrevious를 downloadResult로 교체해 현재/이전 성공 모두 실제 설정을 읽도록 하고 downloadFailed1개를 추가했다. 기존 description/guide/page/meta는 통합 담당 소유이며, 고정 절감률·JPEG→PNG 투명도 오해·HEIC 브라우저 버전 보장은 실제 범위로 정리한다.
