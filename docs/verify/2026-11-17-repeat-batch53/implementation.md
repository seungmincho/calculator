# 53차 색상 변환기 부모 구현

상태: 실제 부모 연결과 작성자 실제 이벤트 8그룹을 완료했다. 제품 1개 + MJS 검사/host 2개의 범위 lint exit0, 오류0·경고0 확인 후 TS를 동결했다. 전담 native 브라우저·독립 부모 검토·전체 타입은 별도 체크포인트이며 여기서 완료로 계산하지 않는다.

## 변경 범위

- `src/components/ColorConverter.tsx`: 입력 원문과 마지막 유효 색 분리, root의 `colorConversion.ts` 연결, 동일한 5가지 표기와 RGB/HSL 6축, URL 복원·writer, 복사 실패 복구, 실제 ShareResult, 접근성·모바일 토큰 UI.
- `translations-color-converter.json`: ko/en 각 36 leaf 최종. canonical/generated/page/menu는 통합 담당 소유.
- `color-parent-harness.mjs`, `check-color-parent.mjs`: 실제 부모와 실제 ShareResult를 실행하고 Clipboard·PNG 생성·타이머·주소·언어 포트만 제어한다. 계산 모듈/복사 guard는 실제 코드를 쓴다.
- root의 순수 모듈·작성자 검사와 원래 `before-fix.json`/probe는 변경하지 않았다. 이전 독립 core6의 원래 부모 443색×5표기 및 165슬라이더 parity는 미연결 시점 증거다. 원래 부모 SHA를 검사하는 그 스크립트를 새 부모에서 재실행한 것으로 기록하지 않는다.

## 확정 동작

3/6자리 HEX만 결과에 반영하며 `#` 생략·대소문자·앞뒤 공백은 허용한다. 유효 입력도 원문을 자동 정규화하지 않는다. 빈 문자열, alpha4/8자리, CSS 식, 10,000자 이상 잘못된 원문은 잘라내지 않고 오류와 마지막 색 안내를 표시한다. 명시 복구·picker·preset·slider·random만 입력을 canonical 값으로 바꾼다. 임의색은 `floor(random*0x1000000)`으로 흰색까지 포함한다.

서버/첫 렌더는 #3B82F6이며 초기 `restoreInitialColor` 0ms callback 전 사용자 편집 전체가 우선한다. ready 전 URL 쓰기/공유/복사는 없다. 유효 URL은 canonical로 복원하고 중복/손상 URL은 초기 원본을 남긴다. 사용자 유효 commit은 소유한 color만 갱신하며 무관 query의 중복 값, hash, history.state를 유지한다. hash/무관 query만 바뀌면 입력 원문을 유지한다. writer 실패에서도 현재 색 명시 공유 URL은 별도로 만든다.

5가지 표기 복사는 클릭 시점의 전체 값이며 native 성공/legacy true만 성공이다. 실패 시 읽기 전용 전체 값·전체 선택·재시도·닫기를 제공한다. 부모 copy와 ShareResult의 link/PNG가 양방향으로 이전 요청을 무효화한다. raw draft·유효색·revision·locale·실제 번역·URL 문맥과 요청 token으로 ABA/늦은 거절/타이머/Strict replay/unmount를 구분한다. 이미 제출된 OS Clipboard 쓰기를 취소한다는 보장은 하지 않는다.

입력16px, 버튼/slider/preset44px, 모바일1열 및 preset5열을 사용한다. 큰 화면 preset10열의 gap은 실제 카드 폭 안에 44px 10개가 들어오게 4px로 줄인다. content 색/swatches/RGB축/색조 gradient는 의미 있는 색을 유지하고 장식 pink/glass를 제거했다. CMYK는 계산상의 참고값으로 명시한다.

## 작성자 검사

`node docs/verify/2026-11-17-repeat-batch53/check-color-parent.mjs`: **8그룹 PASS**.

1. 초기 기본/URL·유효 및 invalid early intent·Strict replay·무관 query/hash/history state.
2. alpha4/8 및 긴 원문 무잘림·last-valid preview/picker/5표기/공유·명시 복구.
3. 검정/흰색/빨강의 5가지 정확 표기·6 slider·picker·random0/상한.
4. 중복/손상 URL·owned color pop·hash-only·writer 실패.
5. native 거절+legacy false 전체 복구·선택 실패/재진입·재시도·옛 close.
6. 실제 ShareResult와 직접 복사의 양방향 늦은 거절 및 PNG 요청 소유권.
7. input/locale ABA·옛 안내 timer·ready 전 handler·Strict/unmount.
8. KO/EN 실제 키·label/44px/16px 계약·원문 저장 없음.

실제 브라우저 픽셀/DOM focus·native color picker/Clipboard·PNG raster 렌더를 이 포트 검사로 주장하지 않는다. SSR-style 첫값/Strict effects는 제어 React host 검사이며 실제 hydration 검사는 native 담당 범위다. 기존 pure author5/independent6은 별도이며 여기의8에 합산하지 않는다.

## native/독립 인계

- 입력 `#color-hex` / `[data-color-draft]`, 선택기 `[data-color-picker]`.
- 최종 색 `[data-color-workspace][data-color-last-valid]`, preview `[data-color-preview]`, result `#color-converter-result`.
- 복구 `[data-color-restore]`, 무작위 `[data-color-random]`, preset `[data-color-preset="#..."]` 20개.
- slider `[data-color-channel="r|g|b|h|s|l"]` / `#color-r` 등. RGB0..255, H0..360, S/L0..100.
- 결과 `[data-color-value="hex|rgb|hsl|hsv|cmyk"]`; 복사 `[data-color-copy="..."]`.
- 상태 `[data-color-output="copying|copied|failed"]`; 복구 `[data-color-recovery]`, `#color-copy-manual`, `[data-color-recovery-action="select|retry|close"]`.
- URL 안내 `[data-color-query-error="invalid|writeFailed"]`.
- 실제 공용 공유 `[data-color-share-boundary]` 안 `[data-share-action="copy|save|share"]`.
- 초기 복원: `window.setTimeout(function restoreInitialColor(){...},0)`. 부모/모델 다운로드 없음. named callback만 보류해 early intent를 검증할 수 있다.
- 예시 URL `?foreign=a&color=abc&foreign=b#keep`; invalid `?color=fff&color=000`. 스키마/저장 키 추가 없음.
- PNG 생성만 deferred port이며 다운로드 URL은 기존 ShareResult의 30초 및 mount cleanup 소유권을 그대로 따른다.

