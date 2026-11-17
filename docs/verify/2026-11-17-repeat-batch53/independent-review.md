# 53차 색상 변환 순수 준비 독립 검토

상태: **미연결 순수 준비 독립 6그룹 PASS, 새 모듈에서 재현된 결함 없음.** 부모 ColorConverter와 번역은 아직 원래 코드이며 제품/검사 TS를 수정하지 않았다. root의 전체 4096 shorthand 검사를 다시 실행하거나 독립 집계하지 않았다.

## 방법

`independent-core.mjs`는 새 `colorConversion.ts`를 직접 호출한다. 기존 부모는 공용 훅 호스트에서 실제로 렌더하고 원래 copy/slider handler를 실행한다. 작성자 probe/assertion은 가져오지 않았다. 원래 부모 SHA가 `before-fix.json`에 기록된 값과 같은지 먼저 확인해 **기존 화면과 새 모듈의 parity**를 비교한다. 이 old-parent 검사는 부모 연결 전 체크포인트용이며, 연결 후에는 새 실제 부모 검사로 구분해야 한다.

Clipboard는 문자열 수집 포트이고 native 브라우저를 사용하지 않았다. RGB 입력은 정해진 경계 채널 격자와 고정 seed 표본을 사용한다. 반올림 경계의 기존 동작을 보존하는 것이 목표이므로 변환식을 새로 대체하지 않았다.

## 통과한 6그룹

1. **엄격한 HEX와 snapshot:** 앞뒤 공백/NBSP/BOM·생략한 #·혼합 대소문자 3/6자리만 canonical로 처리한다. alpha 길이·CSS 표현식·전체폭 문자·중간 제어문자/zero-width·잘못된 뒤쪽 문자를 부분 파싱하지 않는다. 객체와 RGB/HSL/HSV/CMYK 하위 객체는 frozen이고 이전 결과를 바꿀 수 없다.
2. **실제 기존 부모의 5개 표기:** 채널 경계 343색과 고정 seed 100색, 총 **443색×HEX/RGB/HSL/HSV/CMYK = 2,215개 복사 문자열**이 새 모듈 값과 정확히 일치했다. root authored 4096 shorthand와 별도 표본이다.
3. **기존 슬라이더:** 원래 부모 RGB/HSL handler를 **165건** 실행해 새 RGB clamp/HSL→HEX 결과와 비교했다. 기본 파랑·중립회색·경계 빨강·녹색/보라 표본과 hue 0/360을 포함한다.
4. **별도 수치/범위:** 중립색의 무채색 수치와 순수 hue anchor를 별도 값으로 확인했다. RGB 유한 소수의 clamp/반올림, 비유한 거부, HSL 각 축 경계 밖 거부를 검증했다. 정수 HSL 표시에서 발생하는 양자화 차이를 감안하여 **343색 roundtrip 각 채널 오차 ≤5**를 확인했다. 역변환이 항상 정확히 원래 RGB라고 주장하지 않는다.
5. **URL 소유권:** 중복 color는 같은 값이라도 invalid이며 다른 대소문자 키는 owned key로 취급하지 않는다. read는 params를 바꾸지 않는다. write는 color만 하나의 canonical 6자리 값으로 만들고 무관 query 순서/중복/공백·플러스 의미/빈 flag·경로/hash를 보존한다. invalid draft/잘못된 URL은 null이고 입력 원본을 바꾸지 않는다. history.state는 순수 helper가 쓰지 않으며 후속 부모가 보존해야 한다.
6. **기존 random 관측:** 실제 원래 random handler에 `Math.random() = 1 - Number.EPSILON`을 넣으면 `#FFFFFE`다. `floor(random*16777215)`의 기존 상한 때문에 흰색이 빠진다는 읽기 관측을 확인했다. 새 pure `rgbColorHex(255,255,255)`는 정상 `#FFFFFF`이며 **새 모듈 결함이 아니다.** 계획에 있는 부모 연결 시 최소 범위 수정 대상으로 root에게 전달했다.

## 실행

```text
node docs/verify/2026-11-17-repeat-batch53/independent-core.mjs
{"groups":6,"parityColors":443,"representations":2215,"sliderCases":165,"roundtrips":343,"parentConnected":false,"nativeBrowser":false}
```

첫 실행에서 6그룹이 통과했다. Node의 module-type 안내는 TS 직접 실행 안내이며 제품/검사 실패가 아니다. 기존 before JSON/probe는 보존했다. 제품 부모의 draft/URL 초기 복원/복사 복구/ShareResult/모바일은 아직 연결 전이므로 이 결과로 완료를 주장하지 않는다. Chrome·전체 타입·빌드·canonical 변경은 0이다.

`npx eslint docs/verify/2026-11-17-repeat-batch53/independent-core.mjs`는 exit 0, 오류 0·경고 0이다.
