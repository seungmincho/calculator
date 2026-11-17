# 53차 색상 변환기 — 미연결 순수 준비

2026-11-17. 부모·번역·메타는 아직 변경하지 않았다. `colorConversion.ts`와 작성자 검사만 추가했고 TS를 동결했다.

`parseOpaqueHex`는 앞뒤 공백/생략한 #를 허용하는 3·6자리 HEX 전체 검증과 대문자6자리 canonical 반환이다. 알파/부분 문자열/다른 CSS 구문은 null이다. `convertOpaqueColor`는 기존 부모의 RGB/HSL/HSV/CMYK 계산과 정수 반올림을 그대로 분리하고 중첩 결과를 동결한다. `rgbColorHex`는 유한한 채널만 반올림·clamp하고, `hslColorHex`는 기존 슬라이더 범위 내 유한한 값만 받는다. `readColorQuery`는 없는/손상된/유효한 단일color를 구분한다. `colorQueryUrl`은 소유한 color만 갱신하고 알 수 없는 중복query/hash를 보존하며 실제 history 호출은 하지 않는다.

작성자 `node scripts/check-color-conversion.ts` **5그룹 PASS**: 4,096개 shorthand 전체 byte 대조, invalid/alpha/부분 구문, 기존 primary/neutral/default 변환, 채널 경계·HSL endpoints, URL 소유권. 제품·검사2파일 ESLint 오류·경고0. 준비 단계의 실제 부모 probe도 MJS lint0이며 정상1+현재 불편/실패3의 원본 SHA와 JSON을 보존했다. DOM host 포트 검사이고 브라우저/실제모바일 증거가 아니다.

부모 연결 담당은 draft와 마지막 유효색 분리·label/복구·44px/16px·모바일5열 swatch·복사 및 공유 소유권·URL hydration을 구현하고 KO/EN 조각까지 함께 소유한다. 초기화/URL/복사 공용 패턴을 기존 구현에서 재사용하되 현재 미연결 utility를 부모에 연결하기 전 독립 검토 결과를 확인한다. 새 저장 키·알파 기능·대비검사기 전달·공용 스타일 변경은 없다.
