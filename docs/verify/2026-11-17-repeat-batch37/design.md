# 화면 비율 이미지 개선 — 읽기 설계

2026-11-17. `plan.md`와 실제 `AspectRatio.tsx`, `aspectRatio.ts`, 공용 QR header·imageCompress decoder, 28차 직렬 adapter를 읽고 구체화했다. **제품 TS/공용 번역은 수정하지 않았다.** 32차 독립·native 발견 대응이 우선이며, 이 문서는 31/32/38 타입 체크포인트 이후 순수 준비를 위한 계약이다. root는 아래 정확한 16,000,000픽셀 한도·계산용 한 변 상한·0변 반출 거부에 동의했다.

## 지금 코드에서 확인한 것

- `AspectRatio.tsx`의 `posInt`는 `Math.round(parseFloat(...))` 후 양수만 검사한다. `Infinity`도 통과할 수 있다. `parseRatio`는 component와 나눗셈 결과의 유한성을 확인하지 않고, `gcd`는 재귀이므로 NaN 나머지가 종료 조건에 도달하지 않는다.
- `node docs/verify/2026-11-17-repeat-batch37/check-aspect-existing-boundaries.mjs`를 이번 읽기에서도 실행했다. 기존 실제 util에서 `reduceRatio(Infinity, 1080)` → `RangeError`, 400자리 숫자 `:1` → `Infinity`, 그 값의 ladder는 비유한 치수를 포함했다. 의도한 결함 재현이며 UI/브라우저 검증 PASS가 아니다.
- 현재 사진 preview는 CSS `object-fit: cover|contain`, 반출은 별도 `fitImage`/canvas다. 중앙일 때의 의도는 같지만 출력 반올림 뒤 비율과 preview가 별도로 정해진다. 사진 교체 후 `<img>`의 EXIF/animation 처리와 내보내기 시 별도 Image도 같은 snapshot으로 고정되어 있지 않다.
- 현재 긴 변8192 제한만으로 `8192×8192`가 가능하다. `toBlob` 실패 안내/세대 확인/canvas 정리가 없으며, A/B 교체·삭제 후 늦은 onload가 다시 이미지를 붙일 수 있다. 복사 catch/legacy false에서도 성공 표시한다.
- `useState(searchParams)`로 초기값을 읽고 URL replace effect가 즉시 생긴다. 정적 기본 본문과 브라우저 공유값 복원의 순서를 명시하는 가드가 없다. 공용 `useSearchParams` 자체를 수정하지 않고 이 부모의 최초 복원·동기화만 구분한다.

## 숫자 계약

| 구분 | 결정 |
|---|---|
| 계산/리사이즈 입력 한 변 | 반올림 후 안전 정수 `1..16_000_000` |
| 입력 사진 | 실제 byte length `1..8*1024*1024`; 가로×세로 `<=16_000_000` |
| 입력 형식 | byte header로 PNG/JPEG/WebP/GIF; 브라우저가 해석한 한 정지 프레임만 사용 |
| 이미지 출력 | 정수 양 변 `>=1`, 긴 변 `<=8192`, 곱 `<=16_000_000` |
| 크롭 위치 | 유한한 숫자 X/Y `0..100`, 기본 `50/50`, 슬라이더 step 1 |
| 커스텀 비율 | 전체 문자열 최대64자, 기존 `: / x ×`·십진수 문법 유지, component·quotient 유한·양수, 결과 `1/16_000_000..16_000_000` |

계산용 한 변 상한이면 모든 입력 픽셀 한도 내 원본의 한 변을 표현할 수 있고, 두 정수의 최대 곱 `256_000_000_000_000`도 `Number.MAX_SAFE_INTEGER`보다 작다. 이미지 반출 한도와 계산 한도를 혼동하지 않도록 별도 안내한다. 계산 결과가 크다고 무조건 이미지 업로드나 일반 결과 복사를 막지 않는다.

치수 parser는 앞부분만 먹는 `parseFloat('1200px')` 대신 전체 십진 문자열을 검사한다. 기존 소수 픽셀 반올림 관례는 유지하되, 유한·양수·입력 상한 검사 후 Math.round, 다시 안전 정수/1..상한을 확인한다. 입력 원문은 편집 state에 남고 무효 결과만 보류한다. exponent/NaN/Infinity/빈 문자열/음수/잘못된 문자를 수치 결과로 내지 않는다. 소수 반올림을 안내하고 명시 상한 밖 입력을 잘라서 다른 값으로 계산하지 않는다.

`gcd`는 유한한 안전 정수 검증 뒤 반복문으로 처리하고, `reduceRatio`는 유효하지 않으면 기존 sentinel `[0,0]`을 유지한다. `nearestCommon`은 유효하지 않으면 null, `resolutionLadder`는 무효 ratio에 빈 배열을 반환한다. 기존 유효 16:9/9:16/1.91:1·가까운 비율·짝수 반올림 해상도 수치는 유지한다. 극단 ratio의 ladder는 계산상 유한한 값이더라도 적용 치수가 상한을 넘으면 해당 행의 적용/결과 복사를 비활성하고 범위를 설명한다.

잠금 입력에서 사용자가 바꾼 값은 그대로 두고, 반대쪽 계산값이 범위 밖/0이면 그 결과를 정상 치수로 남기지 않는다. 반대쪽 입력은 빈 값과 설명으로 표시하고 현재 결과를 보류한다. 커스텀 비율 적용은 두 새 치수를 모두 검증한 뒤 한 번에 반영한다. 실패하면 기존 유효 치수/잠금은 그대로 두고 입력한 비율의 오류를 보여 준다. 리사이즈 결과도 반올림 후 두 변을 검증한다.

## 실제 출력 크기와 geometry

작은 순수 util `aspectRatioImage.ts`를 제안한다. 기존 `aspectRatio.ts`의 검증 보완은 유효 함수 결과를 바꾸지 않는 최소 범위다. 새 API 이름은 구현 준비 시 확정할 수 있다.

```text
aspectOutputSize(width, height)
  -> { ok:true, width, height, scaled, requestedWidth, requestedHeight }
   | { ok:false, reason:'dimensions'|'tooThin' }
aspectImageGeometry(sourceWidth, sourceHeight, outputWidth, outputHeight, xPercent, yPercent)
  -> { crop:{x,y,w,h}, pad:{x,y,w,h}, cutPct, canMoveX, canMoveY }
aspectPreviewSize(outputWidth, outputHeight, maxWidth=320, maxHeight=320)
  -> bounded preview canvas size + exact CSS aspect ratio
```

출력 배율은 `s = min(1, 8192/max(w,h), sqrt(16_000_000/(w*h)))`. 먼저 두 변에 동일 s를 적용해 반올림한다. 반올림한 정수가 긴 변/픽셀 한도를 넘으면 **원래 비율에서 다시 산출**하며 더 작은 안전 정수 쌍을 고른다. 간단한 결정적 후보는 `floor(w*s), floor(h*s)`이며 이것도 유한/정수/0/한도를 마지막 검사한다. 임의 축만 계속 깎거나 한 변을 임의1px로 올리지 않는다. 반올림으로 두 변 모두 양수인 후보가 한도를 만족하면 그대로 사용한다. 출력의 실제 정수 크기와 자동 축소 여부를 버튼 옆에 표시한다.

`16_000_000×1`처럼 긴 변 제한을 적용한 뒤 짧은 변이0이면 `tooThin`: 비율 계산/치수·CSS 복사는 유지하고 이미지 반출을 막아 치수/비율 조정을 안내한다. 유효한 `1×1`은 출력 가능하다. `8192×8192`는 총픽셀 제한 때문에 `4000×4000`으로 축소된다. 큰 정사각형은 8192를 먼저 보여 준 뒤 실제로 다른 크기로 저장하는 동작을 하지 않는다.

**사진 preview와 export는 반올림을 끝낸 실제 outputWidth/outputHeight의 같은 geometry를 사용한다.** `t=outW/outH`, `s=sourceW/sourceH`일 때:

- 가로가 남으면 `crop.w=sourceH*t, crop.h=sourceH`, 세로가 남으면 `crop.w=sourceW, crop.h=sourceW/t`.
- `crop.x=(sourceW-crop.w)*X/100`, `crop.y=(sourceH-crop.h)*Y/100`. 50/50은 기존 중앙이다. source rect는 소수 좌표를 유지해 preview만 별도 반올림하지 않는다.
- pad는 `scale=min(outW/sourceW,outH/sourceH)`와 기존 중앙 정렬이다. X/Y를 pad에 적용하지 않는다. crop→pad→crop은 현재 위치를 보존한다.
- `drawAspectImage(context, source, geometry, fit, padColor, outputSize, drawingSize)` 하나를 preview/export가 공유한다. crop source rect는 동일하고 destination만 preview 크기로 스케일한다. pad destination도 output 좌표에서 동일한 스케일로 변환한다. CSS object-fit로 두 번째 crop 계산을 하지 않는다.
- 사진이 없을 때 기존 계산용 비율 박스는 유지한다. 사진이 있으면 실제 반출 비율의 preview와 실제 출력 치수를 보여 준다. 극단 ratio로 반출이 불가능하면 계산 정보/사진 소유권은 유지하고 잘못된 0px canvas를 만들지 않는다.
- 기존 Shorts/Reels SAFE_ZONES 값과 적용 조건은 바꾸지 않는다. 오버레이는 DOM 참고 표시만이며 canvas/이미지 파일에는 넣지 않는다. 기존 플랫폼 프리셋의 수치/출처를 새로 검증했다고 주장하거나 새 규격을 추가하지 않는다.

## 위치 UI

crop 모드의 사진 옵션 안에 3×3 버튼(좌상/상/우상/좌/중앙/우/좌하/하/우하)과 X/Y 두 range를 둔다. 버튼 이름은 위치를 읽을 수 있는 번역이고 44px 이상이다. range는 `aria-valuetext` 또는 라벨에 현재 %를 표시하며 키보드 접근 가능하다. X/Y가 프리셋과 정확히 같을 때만 그 버튼을 선택 표시한다.

실제로 남는 crop 여유가 없는 축은 slider를 비활성하고 “이 축은 잘리지 않아 이동할 영역이 없음”을 안내한다. source rect는 해당 축0이므로 위치 숫자가 남아도 결과를 왜곡하지 않는다. 새로운 사진이 **성공적으로 교체될 때만** X/Y를50/50으로 초기화한다. 실패한 교체는 마지막 정상 사진과 위치를 유지한다. 동일 사진의 목표 비율 변경은 선택 위치를 보존한다. 삭제는 사진·작업·오류·위치를 초기화하되 계산 치수/fit/padColor 선택은 보존한다. 새 URL 파라미터로 위치/파일명을 추가하지 않는다.

## 공용 decoder 재사용과 자원 소유권

`qrImageDimensions(ArrayBuffer)`는 이미 PNG/JPEG/WebP/GIF의 byte header를 읽으며 8MiB·16,777,216픽셀 제한이 있다. **공용 상수를 바꾸지 않는다.** 37 adapter가 file.size/실제 byte length를 먼저 검사하고, 공용 header 뒤 정확한 `16_000_000` 추가검사를 수행한 다음에만 `decodeImage`를 부른다. MIME/확장자는 판정 근거가 아니며 실제 header format으로 PNG→PNG, 그 외→JPEG 출력 정책을 정한다. 빈 MIME도 지원 header이면 처리할 수 있다. SVG/HEIC/AVIF는 이번 형식에 없으므로 구체적인 지원 형식 오류를 표시한다.

`imageCompress.decodeImage(file, signal)`의 EXIF `from-image`와 Image fallback을 재사용한다. decode 후에도 실제 oriented 가로/세로·픽셀을 재검사한다. header dimensions와 decoded dimensions의 단순 동일성을 요구하면 EXIF90°를 잘못 거부하므로, 각각 한도만 확인하고 실제 oriented 값을 geometry 기준으로 삼는다. 공용 decoder/encoder는 수정하지 않는다. 기존 `encodeImage`는 전체 원본 resize만 하므로 crop/pad export에는 직접 사용하지 않고, draw 완료 canvas의 `toBlob`을 이 adapter가 소유한다.

정지 프레임 정책을 preview/export에서 동일하게 유지한다. native ImageBitmap은 로드 완료 snapshot으로 소유하고 교체/삭제 시 close한다. HTMLImageElement fallback이면 로드 완료 시 한 번 canvas에 고정해 애니메이션 진행에 따라 나중 export 내용이 바뀌지 않도록 한다. “애니메이션 첫 프레임 정확 복원”까지 보장하지 않고 브라우저가 해석한 한 정지 프레임을 사용한다고 안내한다. source asset은 `release()`를 가진 소유 객체로 만들고 원본 URL을 UI에 별도로 계속 보관하지 않는다.

한 mount당 adapter 하나와 작은 직렬 gate 하나를 사용한다. watermark 전용 error에 결합된 `createWatermarkWorkGate`를 직접 import하지 않는다. 그 **public entry에서만 한 번 획득하는 패턴**을 작은 37 전용 adapter 안에 적용한다. `loadSource`, `preview`, `export`만 gate를 획득하며 내부 header/decode/draw helper는 gate를 재획득하지 않는다. “취소”가 native decode/toBlob의 실제 완료를 뜻하지 않으므로 generation만 바꾸고 물리 slot은 promise의 실제 finally까지 보유한다.

```text
loadSource(file, current, signal) -> owned still source asset + actual dimensions/header format
preview(asset, immutable geometry/settings snapshot, current) -> owned small canvas
export(asset, immutable geometry/settings snapshot, current) -> Blob + actual dimensions/mime
releaseSource / releasePreview / dispose -> idempotent owner cleanup
```

이전 정상 source는 새 파일의 검증/정지 source 생성이 모두 성공하고 현재 요청인 경우에만 교체한다. 그 시점에 이전 source를 release한다. 실패·미지원·용량/픽셀 초과·stale B는 B가 만든 자원만 정리하고 A를 보존한다. 새 파일 A→B는 read generation으로 A의 늦은 결과를 거부한다. 파일 선택 취소는 현재 사진을 지우지 않고 진행 중인 교체 요청만 무효화한다.

read generation과 preview/export generation을 분리한다. 사진 로드 대기 중 숫자/fit/위치를 바꿔도 새 파일을 잘못 덮어씌우거나 시작 시점 옵션으로 돌아가지 않는다. 현재 read의 성공 source는 최신 설정으로 preview 요청을 만들고 위치는 성공 교체 정책대로50/50이 된다. preview/export는 source identity + 입력/설정 revision을 캡처하고 다시 같은 값으로 돌아와도 revision이 달라 이전 작업이 살아나지 않는다.

preview 연속 range 입력은 최신 요청만 유효하게 만들고 짧은 debounce 또는 rAF 예약 하나로 합친다. stale queued job은 gate 입장 때 바로 취소되어 canvas를 만들지 않는다. 새 source/clear/unmount에서는 모든 이전 preview/export를 무효화한다. export 중 download 버튼은 비활성이고 현재 입력을 편집하면 늦은 자동 다운로드를 하지 않는다. 새 작업은 기존 native 작업의 실제 finally 이후 진행한다.

toBlob의 null/throw/잘못된 MIME/빈 Blob은 현재 요청일 때만 오류를 표시하고 명시 재시도가 가능하다. Canvas의 실제 width/height가 요청과 다르거나 context가 없으면 반출을 막는다. PNG/JPEG MIME을 확인하고 JPEG quality0.92·기존 padColor를 유지한다. PNG의 crop 투명도는 보존한다. JPEG 투명 배경 처리는 현재 canvas 변환 동작을 기준으로 실제 회귀 검증하며 별도 새 색 정책을 몰래 적용하지 않는다.

toBlob callback에서 current를 확인한 뒤에만 download URL과 anchor를 만들고 `click()`까지 중간 await를 두지 않는다. URL은 개별 소유권과 회수 timer를 가지며 unmount 시 미회수 URL을 정리한다. stale 결과는 URL을 아예 만들지 않는다. active canvas와 decoder는 자신의 finally에서만 width/height0·close하고, dispose는 retained source/preview만 해제한다. HTML fallback source를 고정하는 동안 기존 source+decode+새 canvas가 일시 공존할 수 있다. 16MP RGBA 하나는 약64MB이므로 **실제 브라우저 heap/codec 오버헤드나 모든 모바일 기기 성공을 보장하지 않는다**. 사진1개·gate1개로 병렬 decode/큰 export canvas 중첩은 막는다. 원본 File/ArrayBuffer를 state마다 복제하거나 base64로 늘리지 않는다.

## 복사와 URL의 최소 보완

치수/약분비율/CSS·ladder 행·리사이즈는 같은 Clipboard latest-request guard를 공유한다. snapshot에 대상 id와 전체 text를 넣고, native resolve 또는 legacy boolean true만 성공이다. API 없음/거부/throw 후 fallback false/throw이면 해당 텍스트를 readOnly로 표시하고 전체 선택·명시 재시도를 제공한다. 입력/결과/언어/다른 copy/unmount가 이전 완료와 성공 timer를 무효화한다. 실제 OS에 맡긴 writeText를 취소할 수 있다고 주장하지 않는다. 32차처럼 도구 간 component를 억지로 공유하지 않고 작은 로컬 recovery/actions가 적절하다.

URL은 기존 `w/h/lock/zone`만 사용한다. SSR·첫 client render는 기존1920×1080 기본값으로 일치시키고 `useHydrated` 후 한 번만 현재 URL을 decode한다. 복원이 state에 반영된 별도 ready 단계 전에는 300ms replace timer를 만들지 않는다. 자체 replace에 반응하여 source를 다시 초기화하지 않는다. 없는 키는 기존 기본값을 쓰고, 명시한 무효 치수는 원문을 유지하며 결과/공유 동기화를 보류한다. lock1은 유효한 두 치수에서만 ratio를 만들고 zone은 기존 whitelist를 따른다. 위치/사진/파일명은 URL/서버/자동 저장에 넣지 않는다. 공용 ShareResult의 자체 이미지/공유 로직은 수정하지 않는다.

## 준비·검증 단위

1. 순수: 기존 aspect-ratio 회귀 + finite/긴 입력/0/음수/범위/ratio parsing, 계산과 출력 한도 분리, 반올림 직후 픽셀 초과·0변, 임의 source/target와9위치의 독립 geometry oracle. 기존 `fitImage` 중앙 기본 호출 결과는 유지한다.
2. adapter: header 검사 전 decode0회, EXIF swap 후 실제치수, static fallback snapshot, 실패 B에서 A 보존, gate 중첩 획득0·취소 후 실제 slot 보유, 늦은 decode/toBlob와 resource close/revoke exactly-once, MIME/null/throw 재시도. 순수/port 검사는 실제 브라우저 pixel 증거와 구별한다.
3. 부모: 잠금/비율/교체 성공·실패·삭제·언어·hydration·URL 초기값, crop/pad 왕복·같은 사진 비율 변경, 최신 위치만 preview/export, 복사 실패/대상 경합/정직한 status·manual text.
4. 지정 native 검증: 색 구역 합성 PNG/JPEG의9위치·임의 % 실제 pixel, oriented EXIF, 동일 snapshot preview/export, 실제치수·8192+16MP 한도·safe-zone 미포함, A/B·clear·late toBlob·copy·320px KO/EN. 임의 실제 개인 사진이나 외부 캘린더/서버 쓰기는 필요 없다.

신규 패키지/새 플랫폼 규격/기존 preset 또는 safe-zone 값 변경/원본 자동 저장은 없다. 아직 구현 검사 수를 예정 PASS로 집계하지 않는다. 현재 증거는 코드 읽기와 기존 util 결함 재현뿐이다.
