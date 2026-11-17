# 화면 비율 계산·이미지 위치 조절 — 부모 연결

2026-11-17. 기존 `AspectRatio`에 준비한 이미지 기하/adapter와 복사 복구를 연결했다. 작성자 신규 검사는 준비16그룹(순수6·adapter8·자식2)과 실제 부모9그룹, 총25그룹 PASS다. 기존 계산기 검사와 Collage19레이아웃 회귀도 통과했다. 최종 제품/검사13파일 scoped lint는 오류0·경고0이며, 중간 fixture의 no-this-alias 1건을 고친 뒤 해당 파일 lint0을 확인했다. 독립 재진입 경합 발견 뒤 adapter8과 해당 재진입 재현, 부모 late-toBlob 영향 그룹을 재확인했다. 이 반복은 신규 그룹 수에 더하지 않는다.

현재 제품 TS 편집을 중지했다. 전체 타입 검사와 실제 브라우저 합성 이미지 검증은 지정 담당이 수행한다. 준비 문서는 미연결 당시 기록이며 최종 연결 상태는 이 문서를 따른다.

전체 타입 첫 실행에서 URL parser의 `zone` 반환값이 `string`으로 넓게 추론된 TS2345 1건이 확인됐다. `readAspectQuery` 반환 타입을 실제 whitelist인 `'none' | 'shorts' | 'reels'`로 명시했으며 강제 단언이나 런타임 변경은 없다. 실제 부모 URL/early-edit 영향1그룹과 해당 util lint0을 확인한 뒤 다시 TS 편집을 중지했다. 전체 타입 재확인은 통합 담당이 실행한다.

선행 전체 타입은07:13 KST 재검사 PASS했다. 이후 native 검증에서 발견한 clear→재선택 DOM 오류는 imperative canvas host를 항상 유지하고 React placeholder를 별도 sibling으로 분리해 보완했다. 실제 부모 source/clear→재선택 영향1그룹에서 host는 모든 상태에서 React 자식을 갖지 않음을 확인했다. 1×8192의 모바일 긴 해상도 행은 복사 버튼을 다음 줄로 배치하고 버튼 텍스트를 감싸도록 변경했으며, native 모바일 영향 재검사에서 viewport/body/document320 PASS를 받았다. 나머지 native 영향은 검증 담당이 이어 확인한다.

같은 후속 단위에서 자체 copy와 공용 ShareResult의 요청 소유권도 연결했다. 자체 copy 시작은 `shareRevision`을 증가시키고, ShareResult의 `resultKey`는 입력/언어 세대와 이 revision을 포함한다. 공용 버튼 capture는 자체 copy의 guard/상태/타이머만 무효화하고 다음 자체 copy에 필요한 입력 context는 유지한다. 자체 copy/ABA 영향1 PASS 및 변경2제품+1검사 파일 lint0을 확인했다. 양방향 실제 컴포넌트·native 복사 검증과 후속 타입 확인은 담당 증거를 따르며 선행 타입 PASS를 후속 코드 검사로 잘못 표기하지 않는다.

## 변경 범위

- 기존 `src/components/AspectRatio.tsx`: 숫자 범위·초기 URL 복원·복사 세대/실패 복구·새 이미지 패널 연결. 기존 플랫폼 preset·safe-zone 수치와 가이드·ShareResult를 보존했다.
- 기존 `src/utils/aspectRatio.ts`: nonfinite/유효하지 않은 직접 호출을 sentinel로 처리하고 gcd를 유한한 반복으로 변경했다. 정상 계산식과 중앙 crop 결과를 보존한다. 공용 `parseRatio`는 Collage도 사용하므로 유한한 양수/비율 검사만 추가했다. 이 도구만의 64자·비율 범위는 `parseAspectCustomRatio`가 담당한다.
- 새 `src/components/AspectRatioImagePanel.tsx`: 사진·preview·export와 객체 URL의 소유 수명, 실패 교체 보존, crop/pad/clear/retry 연결.
- 준비한 `src/components/AspectCropControls.tsx`, `AspectCopyRecovery.tsx`, `src/utils/aspectRatioImage.ts`, `aspectRatioActions.ts`, `src/lib/aspectRatioImage/browser.ts`를 사용한다.
- KO/EN 조각 `translations-aspect.json`은 각47leaf다. canonical·가이드·메타·생성물은 공용 담당이 통합했다. URL 공유는 기존 w/h/lock/zone이며 사진·파일명·crop 위치를 포함하지 않는다.

## 결과·수명 계약

계산 치수는 전체 문자열을 검사해 반올림한 정수1..16,000,000만 결과로 사용한다. 명시 invalid/빈 URL 값은 예시로 대체하지 않는다. hydration 준비 후 최초 복원하고 초기 사용자 편집이 먼저 발생하면 공유값이 덮지 않는다. 이후 유효한 사용자 변경만 URL에 동기화하며 다른 query·hash·history state를 유지한다.

이미지 입력은8MiB와 정확16,000,000픽셀이다. 공용 header 검사 뒤 정확한 추가 상한을 decode 전에 확인하고 실제 decode 치수도 다시 검사한다. 출력은 긴 변8192와 정확16,000,000픽셀을 동시에 지키며 반올림 후 초과도 다시 검증한다. 축소 후0변은 임의1픽셀로 올리지 않고 반출을 막는다. 1×8192처럼 허용되는 극단 비율은 정사각형 max320px preview bounds 안에 실제 비율로 표시해 무한히 긴 layout을 만들지 않는다.

9위치·X/Y0..100은 중앙50/50이 기본이다. 성공한 새 사진만 위치를 초기화한다. 실패한 교체, 비율 변경, crop/pad 왕복은 마지막 정상 사진과 위치를 보존한다. clear는 사진/위치/작업을 비우며 fit/pad와 부모 치수는 보존한다. preview와 export는 최종 정수 출력 비율로 만든 동일 source rectangle을 사용한다. safe-zone은 DOM 참고 표시이며 파일 픽셀에 그리지 않는다. 실제 byte 형식이 PNG면PNG, 나머지 지원 래스터면JPEG 정지 프레임을 반출한다.

read와 preview/export 세대를 구분한다. 취소·교체·입력 변경·clear·unmount는 오래된 완료와 자동 다운로드를 차단하지만 브라우저에 맡긴 native 작업을 이미 끝낸 것으로 취급하지 않는다. **독립 검사에서 adapter-local queue는 dispose/remount 사이 미완료 encode2개를 허용함을 발견했다. 이를 module-level physicalWorkTail로 보완했다.** 같은 문서의 새 adapter도 이전 작업의 실제 finally를 기다린다. owner별 자원/active/pending과 stale 판단은 유지한다. 늦은 decode는 close하고 active canvas는 자신의 finally에서0크기로 정리한다. retained source/preview는 명시 release/dispose, 다운로드 URL은 소유 timer 또는 unmount에서 회수한다. HMR/전체 문서 재생성 사이 OS 작업 취소를 보장하는 계약은 아니다.

복사 대상 전체가 하나의 요청 세대를 공유한다. Clipboard resolve 또는 legacy true만 성공이며 false/throw는 readOnly 전체 텍스트·선택·명시 재시도를 제공한다. 입력과 언어 A→B→A도 이전 성공/복구를 되살리지 않는다. 이미 시스템에 맡긴 Clipboard 쓰기를 취소할 수 있다는 주장은 하지 않는다.

## 실행한 검사

```powershell
node scripts/check-aspect-ratio-image.ts
node scripts/check-aspect-ratio-image-browser.ts
node docs/verify/2026-11-17-repeat-batch37/check-aspect-children.mjs
node docs/verify/2026-11-17-repeat-batch37/check-aspect-parent.mjs
node scripts/check-aspect-ratio.ts
node scripts/check-collage.ts
node docs/verify/2026-11-17-repeat-batch37/check-aspect-remount-independent.mjs
node docs/verify/2026-11-17-repeat-batch37/check-aspect-parent.mjs 'actual late toBlob'
npx eslint src/components/AspectRatio.tsx src/components/AspectRatioImagePanel.tsx src/components/AspectCropControls.tsx src/components/AspectCopyRecovery.tsx src/utils/aspectRatio.ts src/utils/aspectRatioImage.ts src/utils/aspectRatioActions.ts src/lib/aspectRatioImage/browser.ts scripts/check-aspect-ratio-image.ts scripts/check-aspect-ratio-image-browser.ts docs/verify/2026-11-17-repeat-batch37/check-aspect-children.mjs docs/verify/2026-11-17-repeat-batch37/aspect-parent-harness.mjs docs/verify/2026-11-17-repeat-batch37/check-aspect-parent.mjs
```

부모9그룹: 기존 util nonfinite/정상결과, URL/early-edit/query·hash·history, preset/lock/swap/resize, 복사 실패/교차대상/입력·locale ABA, 성공 교체만 초기화/실패 사진 보존, 역순 read/native cancel, 늦은 toBlob/입력·clear·unmount, 4000²·1×8192·8192×1·tooThin/재시도/URL cleanup, Strict replay/overlay 비반출이다. fixture는 실제 제품 TSX와 실제 adapter를 사용하되 read/decode/canvas/encode는 합성 포트로 제어한다. 실제 픽셀/EXIF/DOM layout 증거와 구분한다.

## 브라우저 검증 선택자

- 숫자: `#ar-w`, `#ar-h`, `#ar-tw`, `#ar-th`, `[data-aspect-ready]`, `[data-aspect-lock]`, `[data-aspect-swap]`, `[data-aspect-custom-ratio]`, `[data-aspect-apply-ratio]`, `[data-aspect-zone]`.
- 사진: `[data-aspect-image-file]`, `-pick`, `-clear`, `-download`, `-use-size`, `-fit`, `-pad`, `-status`, `-error`, `-output`, `-retry`. `[data-aspect-image-panel]`에 source/x/y를 노출한다.
- 위치: `[data-aspect-crop-position=topLeft|top|topRight|left|center|right|bottomLeft|bottom|bottomRight]`, `[data-aspect-crop-axis=x|y]`.
- preview: `[data-aspect-preview-bounds]`, `[data-aspect-image-frame]`, `[data-aspect-image-preview]` canvas host.
- 복사: `[data-aspect-copy=size|ratio|css|row480…row4320|resize]`, `[data-aspect-copied]`, `[data-aspect-copy-recovery]`, `-manual`, `-select`, `-retry`, `-close`.

실제 decoder/toBlob 포트는 `src/lib/aspectRatioImage/browser.ts`의 defaults다. 새 라이브러리·개인 사진·Chrome·전체 tsc·build·배포·git 작업을 이 작성자가 실행하지 않았다. 최대 픽셀 제한은 모든 모바일 기기의 메모리/속도를 보장하지 않는다. HTML fallback은 마지막 정상 사진과 새 decode/freeze가 잠시 공존할 수 있다.
