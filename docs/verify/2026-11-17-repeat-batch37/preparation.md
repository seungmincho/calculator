# 화면 비율 이미지 — 미연결 준비

2026-11-17. 신규 파일로 준비를 완료했다. **순수 6그룹·브라우저 adapter port 8그룹·실제 자식 UI 2그룹 PASS**. 초기 신규8파일 scoped lint exit0, 마지막 adapter 검사 추가 후 해당 파일 lint도 별도로 exit0을 확인했다. 부모 `AspectRatio.tsx`, 기존 `aspectRatio.ts`, canonical 번역/메타는 아직 변경하지 않았다. 실제 이미지 파일 검증과 실제 부모 상태 연결은 완료된 것으로 간주하지 않는다.

## 파일/API

- `src/utils/aspectRatioImage.ts`: `parseAspectPixels`, 기존 문법을 재사용하는 `parseAspectCustomRatio`, `readAspectQuery`, exact16m input 검증, `aspectOutputSize`, `aspectImageGeometry`, `aspectPreviewSize`, immutable `createAspectImageSettings`, 9위치 상수, 안전한 `aspectImageFilename`.
- `src/utils/aspectRatioActions.ts`: 독립 인스턴스를 사용하는 `createAspectRequestGuard`, 전체 copy 대상이 공유하는 `copyAspectText`. native resolve/legacy true만 성공하고 stale 거부는 fallback을 시작하지 않는다.
- `src/lib/aspectRatioImage/browser.ts`: `createAspectImageAdapter`, `drawAspectImage`. 포트는 `read`, `decode`, `canvas`, `encode`이며 실제 기본 decode는 공용 `decodeImage`를 사용한다. public `loadSource/preview/export`만 gate를 한 번 획득한다. load는 owned source, preview는 owned small canvas, export는 실제크기/MIME/Blob을 반환한다.
- `src/components/AspectCropControls.tsx`: IO 없는 9위치/두 축 range. x/y/canMoveX/canMoveY/onChange/disabled props. 44px 조작·16px range·축별 설명·KO/EN.
- `src/components/AspectCopyRecovery.tsx`: 실패 당시 full text와 busy/onRetry/onClose를 받는 작은 readOnly 복구 UI. 부모가 새 요청별 key를 주고 해당 request를 검증해야 한다.
- `docs37/translations-aspect.json`: cropPosition/imageWork/numberBounds/copyRecovery의 KO/EN 각각45leaf 조각. 준비 단계이므로 canonical에 아직 연결하지 않는다.

계산 치수 한 변은1..16,000,000, input8MiB 및 정확히16,000,000픽셀이다. 공용 header의16,777,216은 바꾸지 않고 37의 추가 검증을 적용한다. output은 긴 변8192와 정확히16,000,000픽셀을 동시에 적용하며 반올림 뒤 초과하면 동일 배율의 floor 후보로 다시 검증한다. 0변을 임의1px로 올리지 않고 `tooThin`으로 거부한다. preview display raster에서만1 device pixel을 확보하며 이 값은 export 계산에 사용하지 않는다.

geometry는 최종 정수 출력 비율로 만들어 preview/export가 동일한 source rect를 사용한다. pad는 중앙/기존 검정·흰색만 지원한다. PNG/JPEG 선택은 실제 byte header를 따르며 PNG는PNG, 나머지 지원 래스터는JPEG이다. safe-zone은 이 draw 함수에 전달되지 않는다.

native Bitmap은 retained source로 소유하며, HTMLImageElement fallback은 load 완료 시 full-size canvas에 한 번 고정한 뒤 decoder를 닫는다. 실패한 새 source는 자신이 생성한 자원만 정리하며 이미 성공한 source를 폐기하지 않는다. 성공 교체의 commit/이전 source.release와50/50 초기화는 **부모 연결 단계에서 구현**해야 한다. 현재 adapter의 실패 B→기존 A export 검사는 자원 보존 경계의 증거다.

취소/abort/dispose는 최신성만 무효화한다. native read/decode/toBlob이 실제로 끝나야 gate의 finally가 슬롯을 해제한다. stale queued work는 입장 시 작업을 시작하지 않는다. active 임시 canvas/decoded 자원은 자기 finally, retained source/preview는 release/dispose가 소유한다. release는 중복 호출해도 한 번만 정리한다. export는 URL을 만들지 않아 stale Blob이 자동 다운로드되지 않으며, 부모에서 current 재검사 후 URL/anchor·회수 timer를 연결해야 한다.

## 실행한 검사

```powershell
node scripts/check-aspect-ratio-image.ts
node scripts/check-aspect-ratio-image-browser.ts
node docs/verify/2026-11-17-repeat-batch37/check-aspect-children.mjs
npx eslint src/utils/aspectRatioImage.ts src/utils/aspectRatioActions.ts src/lib/aspectRatioImage/browser.ts src/components/AspectCropControls.tsx src/components/AspectCopyRecovery.tsx scripts/check-aspect-ratio-image.ts scripts/check-aspect-ratio-image-browser.ts docs/verify/2026-11-17-repeat-batch37/check-aspect-children.mjs
```

순수6: 전체 문자열/finite/소수 반올림·긴/최소최대 ratio, URL defaults vs 명시 invalid/lock/zone, 결정적1200치수 조합의 반올림 초과·0변·정수한도, 독립 cover/contain oracle250조합(5source×5target×10위치)와 기존 중앙값, immutable snapshot/파일명/preview 계약, copy실패/대상경합·dispose 뒤 늦은 완료.

adapter8: decode 전 byte/header exact16m·decode 후 치수, EXIF swap·retained bitmap·HTML 정지화·실패 B 후A 사용, 동일 source crop/normalized pad preview/export, 취소한 decode의 실제 finally 전 다음작업0, 늦은 toBlob의 물리 slot과 canvas정리, null/throw/MIME/빈Blob/context/극단비율 및 재시도, queue 진입 전 snapshot과 active/queued dispose, header우선 GIF→JPEG와 read중AbortSignal. 모든 파일/header/픽셀 포트는 합성이고 실제 브라우저 EXIF·pixel 증거가 아니다.

자식2: 실제 TSX를 번들해 KO/EN9버튼/정확 좌표/축 disabled·설명·44px·잘못된 % 거부·외부props변경 시 자체 reset없음, 복구 fulltext/readOnly/전체선택·선택실패·retrybusy/close를 확인했다. 실제 DOM layout/권한/focus 인증과 구별한다.

## 다음 부모 연결 단위

1. 기존 `aspectRatio.ts`의 gcd/reduceRatio/nearestCommon/parseRatio/resolutionLadder에 유한성·범위 guard를 최소 적용하고 기존 `scripts/check-aspect-ratio.ts`와 읽기 재현의 after 경계를 검사한다. **현재 기존 util 직접 호출의 Infinity 결함은 아직 수정하지 않았다.** 준비 parser가 그 입력을 통과시키지 않는 것과 기존 util 수정 완료를 혼동하지 않는다.
2. 부모 숫자입력/잠금/비율 적용/ladder/리사이즈 결과를 준비 숫자 계약에 연결한다. 모든 원문을 유지하면서 결과만 보류하고, invalid URL을 기본값으로 몰래 바꾸지 않는다. useHydrated→최초복원→ready 이후 sync로 나누어 기본값 timer가 공유값을 덮지 못하게 한다.
3. 이미지 소유 workspace를 작은 자식 또는 부모 내부에 연결한다. read guard와 preview/export guard를 분리하고 최신 read 성공 때만 source commit·이전 release·50/50 초기화한다. 실패 시 기존 사진/위치 유지, crop/pad 왕복과 같은 사진의 비율변경은 위치 유지, clear는 사진/작업/위치만 초기화한다. StrictMode setup-cleanup-setup에서 dispose한 adapter/guard를 다시 쓰지 않도록 effect 수명마다 새 owner를 준비한다.
4. 최신 작은 preview canvas만 DOM에 붙이고 이전 preview.release. 연속 slider는 예약 하나로 합치되 작업이 끝날 때까지 실제 슬롯은 유지한다. safe-zone 기존 DOM overlay/상수는 그대로 둔다. actual output sizes/축소/tooThin/errors/busy를 번역 조각에 연결한다.
5. 다운로드 클릭은 source identity+immutable snapshot+generation을 캡처한다. export 반환 뒤 current를 재확인하고 URL/anchor를 만든 뒤 await 없이 click한다. clear/옵션변경/unmount/다음source가 옛 자동다운로드를 막고 owned URL timer를 정리한다. 명시 재시도만 현재 snapshot으로 실행한다.
6. copy guard와 full recovery를 치수·비율·CSS·ladder·resize에 공유하고 입력/언어/다른copy/unmount가 상태와 타이머를 무효화한다. 성공표시를 DOM clipboard 결과와 혼동하지 않는다.
7. 실제 부모 이벤트와 기존 calculator/preset/중앙·guide/safe-zone 회귀 후 finalready. canonical/메타·native 합성사진·전체 tsc는 지정 담당과 조율한다. 예정 검사 수를 미리 PASS로 적지 않는다.

현재 parent import 없음. 새 패키지·Chrome·전체 tsc·build·배포·git 작업 없음. 33/34 체크포인트까지 이 TS 준비를 안정 상태로 유지한다.
