# 56차 후보 — 이미지 변환 작업 제어와 마지막 성공 보존

상태: 부모 연결·공용 통합 완료, 작성자23/독립14 PASS. native와 전체 타입 대기.

## 현재 기능과 실행 근거

`ImageConverter.tsx`는 업로드/드롭/붙여넣기 → `readHead` → 형식 판별 → 한 파일씩 `convertImage`를 호출한다. JPG/PNG/WebP/조건부 AVIF, 품질, JPG 배경색, HEIC 지원 안내, 개별 결과/ZIP, 비교 표와 안내가 이미 있다. URL은 f/q/bg 설정을 쓰며 파일 원문은 저장하지 않는다. 일시정지·계속·실패만 재시도 버튼은 없다.

`imageConvert.ts`의 기존 정책은 파일당 **100 MiB 이하**, 0바이트/SVG 제외, 헤더→MIME→확장자 순 형식 판별이다. 브라우저의 EXIF 처리 decoder를 재사용하고, 인코딩 실패 때만 큰 이미지 면적을 기존 16,777,216 기준으로 줄여 재시도한다. 이 수학·HEIC/native 판정·EXIF·format detection·파일 한도를 바꾸지 않는다. 새 codec·패키지·모델·서버/계정·파일 저장소를 추가하지 않는다.

실행 근거는 `probe-image-converter-baseline.mjs`와 `before-fix.json`이다. 원래 제품 source SHA를 JSON에 기록했다. 실제 부모를 실행하되 readHead/convertImage/JSZip/DOM 다운로드를 제어 포트로 바꾸며 실제 native 디코딩·픽셀/ZIP 바이트 확인으로 주장하지 않는다. dynamic import의 VM 실행을 위해 **메모리 내 로더식 1개만** require 포트로 치환했고 제품 파일은 그대로다.

| 관측 | 실행 결과와 판정 |
|---|---|
| 정상 변환 | 파일2개가 최대 동시1로 완료되고 `a.jpg`, `a (2).jpg` ZIP entry를 만든다. 정상 경로 |
| 헤더 읽기 → 초기화 | 먼저 존재하던 행을 초기화해 빈 목록을 만든 뒤, 아직 읽던 파일이 늦게 추가되고 새 변환이 시작된다. 재현 결함 |
| 새 설정 실패 | 기존 성공 JPG가 있고 PNG 변환이 실패하면 이전 JPG의 URL이 revoke되고 결과가 사라진다. 보존 개선의 실제 근거 |
| 250ms 설정 대기 | PNG 버튼은 선택됐지만 기존 JPG를 완료 결과로 세고 일괄 다운로드 버튼도 활성이다. 설정/결과 문맥 불일치 재현 |
| ZIP 대기 후 화면 변화 | reset/settings/unmount 세 경우 모두 늦은 다운로드가 발생한다. unmount는 생명주기 결함이며 reset/settings는 아래 제안 정책으로 명시 확정할 대상 |
| URL writer | 무관 query의 중복값·hash와 history.state가 모두 사라진다. 재현 결함 |

probe 초기 실행의 두 오류는 fixture 선택자 문제였다. HEIC 안내의 li까지 결과 행으로 셌고, 업로드 안내 안의 PNG 글자를 포맷 버튼으로 골랐다. 실제 행 class/aria-pressed 포맷 버튼으로 좁힌 뒤 위6그룹을 확인했으며 제품 결함 수에 포함하지 않는다. Node의 TS 모듈 방식 감지 경고는 실행 환경 안내이고 package.json을 변경하지 않았다.

## 확정한 최소 사용자 흐름

1. 추가하면 기존처럼 자동 순차 변환한다. **일시정지는 현재 파일이 끝나면 다음 파일을 시작하지 않는 방식**으로 확정했다. 현재 파일 중에는 ‘현재 파일을 마친 뒤 정지’로 안내하고, native decode/encode의 즉시 취소를 약속하지 않는다. 재개를 빠르게 눌러도 기존 promise finally 이전에 새 변환을 시작하지 않는다.
2. 같은 설정의 실패는 새 파일 추가로 자동 재시도하지 않는다. retry 대상은 표시/실행 key가 일치하고 attemptKey도 현재 key인 error만이다. 설정 안정화250ms 동안 retry 버튼은 비활성으로 둔다. 이미 새 key의 pending인 항목은 실패 retry 대상으로 세지 않는다. ‘실패한 파일 다시 시도’만 그 실패를 pending으로 바꾼다. 다른 포맷/품질/배경으로 변경하면 이전 실패도 새 설정의 pending이 된다. paused 상태는 파일 추가/설정 변경/재시도 후에도 유지한다.
3. 성공 결과는 설정 변경이나 다음 변환 실패에도 행에 남긴다. `attemptKey/status/error`와 `lastSuccess={key,options,blob,url,width,height,format}`를 분리한다. 최신 성공이 실제로 도착할 때만 이전 URL을 해제/교체한다. 실패 안내와 ‘이전 성공 결과: JPG …’를 함께 표시하고 개별 다운로드는 그 실제 파일명·포맷을 사용한다.
4. 설정 draft key가 바뀐 뒤 진행 중이던 이전 key의 늦은 성공/실패는 lastSuccess·오류·집계를 갱신하지 않는다. A→B→A로 key가 돌아와도 작업 세대가 다르면 폐기하며 active 슬롯은 그 promise의 finally까지 점유한다. 보존 대상은 변경 전에 이미 수용한 lastSuccess이다. 현재 설정에 맞는 성공만 완료 합계·전체 다운로드/ZIP에 포함한다. 이전 성공을 새 설정의 완료처럼 합산하거나 다른 포맷과 섞지 않는다. 250ms debounce 동안 새 작업 시작/현재 결과 일괄 반출은 보류하고 기존 성공 행은 명확하게 이전 결과로 표시한다. 설정의 draft key는 즉시 갱신해 옛 결과를 현재 결과로 취급하지 않는다.
5. 헤더 읽기 시작 시 목록 생명주기 세대를 캡처한다. reset/unmount 이후 완료는 추가하지 않는다. 동시에 정상 추가한 여러 묶음은 서로 취소하지 않으며 같은 세대에서 보존한다. 삭제/초기화 후 old convert callback이 행을 되살리지 않는다.
6. **ZIP 확정 정책:** 클릭 시점의 현재 설정 성공 Blob/이름 snapshot을 고정하되 명시 초기화·설정 변경·이탈은 요청을 취소한다. 오래된 작업이 최신 작업의 busy/오류를 지우지 않는다. 파일 추가/행 삭제만으로 snapshot의 Blob은 훼손되지 않는다. 취소 버튼·실패 안내/재시도를 제공한다. 이 정책은 22차 압축의 설정 변경 후에도 snapshot을 계속 만드는 정책과 구분하며 root가 이 차이를 명시적으로 확정했다.
7. f/q/bg 소유 writer만 current URL에서 set/delete하고 무관 query/hash/history.state는 유지한다. 초기 설정 복원/early intent/Strict lifecycle를 검증한다. URL 쓰기 실패는 화면 설정·결과를 버리지 않고 안내한다. query에 파일명/바이트/출력/대기열/paused 상태를 저장하지 않는다.

## 예상 소유 파일과 API

- `src/components/ImageConverter.tsx`: 현재 파일 추가·작업 effect·reset/remove·집계·다운로드를 controller로 연결. 기존 설정·형식 표/HEIC 안내 유지.
- 새 `src/utils/imageConversionQueue.ts`(가칭): `createImageConversionQueue({options,process,release,onChange})`, `add/remove/clear/pause/resume/retryFailed/setOptions/dispose/getSnapshot`. ConvertOptions/ConvertOutput는 기존 타입을 재사용한다. 실제 동시에 살아 있는 process promise는1개이며 취소/설정 변경도 finally 이전에 슬롯을 해제하지 않는다. 안정적인 item identity와 lifecycle/task generation을 함께 확인한다.
- snapshot은 현재 표시 key·준비된 실행 key·phase·attempt status·lastSuccess를 분리한다. 설정250ms timer는 자기 ID/세대와 최신 key를 검사한다. 초기화/unmount는 진행 중 헤더 read와 result acceptance를 무효화한다.
- 기존 `createImageZipRunner`/`uniqueNames`는 재사용 가능하다. cancellation API 확장을 다른 도구에 강제하지 않고 부모에서 요청별 runner 소유·dispose 후 새 runner로 교체하는 최소안을 우선한다. Blob snapshot은 화면 URL 해제와 독립적이며 URL은 자신이 생성한 것만 정리한다.
- **기존 `imageConvert.ts`/`imageCompress.ts`/resize/PDF의 계산·decoder·encoder API는 현재안에서 미변경.** pause-at-boundary 정책이면 새 optional signal이나 공유 알고리즘 수정이 필요 없다. 재현 중 별도 결함이 나오면 root 승인 후 범위를 조율한다.
- 새 의미 있는 순수/포트 검사와 실제 부모 MJS, 필요할 때만 작은 행/제어 자식. canonical/messages/menu/page는 통합 담당만 수정한다.

## 화면·KOEN 계획

기존 `imageConverter` 아래 `queue` 묶음으로 pause/resume/finishingCurrent/paused/retryFailed/previousSuccess/currentSettingsPending/currentOnly/zipCancel/zipCanceled/zipFailed/zipRetry/urlWriteFailed를 준비한다. 실제 구현 시 필요 키만 확정하고 ko/en을 제품 담당자가 함께 작성한다. 기존 성공/실패/HEIC 문구·format labels·안내 배열의 구조는 유지한다.

제어 버튼과 행 동작은 44px 이상, 텍스트 입력이 있으면16px, 320px에서 행 버튼을 다음 줄로 배치해 파일명 때문에 넘치지 않게 한다. 현재/이전 성공을 색만으로 구분하지 않고 문구와 실제 포맷/설정을 표시한다. 상태 안내는 polite live region, 새 애니메이션은 불필요하며 기존 로더는 reduced-motion을 존중한다. 입력 카드 위에 결과 바로가기를 넣는 경우 결과 앵커를 함께 제공한다.

## 구현 후 검증 경계

- 순수/포트: 실제 promise 최대1, pause/resume 연타·설정 ABA/250ms stale timer·빠른 clear/add/remove·동일 ID·finally throw/release·Strict dispose. 같은 설정 실패 retry 선택성, 새 설정 실패의 새 pending, pause 유지.
- 보존: 이전 성공의 Blob bytes/URL 유지, 새 실패 시 유지, 새 성공 시 정확1회 교체 release, 행 제거/clear/unmount 해제, 옛 작업이 만든 불필요 URL 회수.
- 파일:100MiB 경계/0/SVG 기존 정책, 헤더 read 역순/실패 fallback/동시 추가/clear/unmount·늦은 paste.
- 반출: 현재 key만 집계·개별 이전 성공의 실제 포맷, 이름 중복/대소문자/예약 충돌, ZIP snapshot byte identity·취소/실패/재시도·이탈·다운로드 URL 정리. reset/settings 정책은 확정안에 맞춘다.
- 실제 부모: 정상 preset/품질/배경, unsupported format·HEIC 안내, 원본 파일 입력/메모리 보존, URL unknown/hash/state/early intent, KOEN전환과 키보드/초점.
- native 전담: synthetic raster를 실제 decode/encode하여 MIME·픽셀/투명배경·크기 확인, 실제 JSZip entry/바이트, 최대 동시1,320 KO/EN. 사람 사진/무단 모델 다운로드 없음. 별도 전체 타입·기존 image-convert 회귀 뒤 완료한다.

root 승인 범위는 새 pure/controller·검사·번역 조각 준비까지다. 부모 연결은 다음 체크포인트 뒤 별도 신호를 기다린다. 실제 준비 파일/API는 preparation.md를 따른다.

검사 상태: baseline actual-parent6그룹 관측 완료, 해당 MJS1파일 ESLint exit0/오류0/경고0. 현재 제품 SHA는 before-fix.json의 SHA와 일치한다. baseline 채집 당시 제품·검사 TS 작성0, native/전체 타입 실행0. 이후 승인받은 새 준비 TS4파일과14그룹/lint0는 preparation.md의 별도 미연결 단계다.





부모 연결 최종 상태·실제9그룹/선택자/검증 한계는 implementation.md에 기록했다. 준비 보고서의 ‘부모 미연결’은 그 시점의 상태이며 현재 완료 상태를 뜻하지 않는다.

