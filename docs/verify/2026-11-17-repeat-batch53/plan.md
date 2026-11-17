# 53차 후보 — 색상 변환기 입력과 모바일 결과 개선

상태: 구현·공용 통합·독립14그룹·실제Chrome8/8·전체2GB 타입 첫 실행을 통과했다.10:15:57 KST 사전확인/session68215 exit0이며 최종 근거는 [완료 보고서](report.md)를 따른다. 아래 원래 설계/관측은 당시 계약 근거로 보존한다.

## 확인한 흐름

`ColorConverter.tsx`는 6자리 HEX를 받아 RGB/HSL/HSV/CMYK를 계산하고 RGB/HSL 슬라이더·20색 프리셋·임의 색상을 제공한다. `hexToRgb`는 3자리 HEX를 거부하며, 텍스트 입력이 불완전하면 `colorValues=null`이 되어 결과와 슬라이더가 모두 사라진다. 동시에 미리보기 `backgroundColor`에는 검증 전 원문을 전달한다. 입력/색 선택기에 연결된 label이 없고 모바일 preset10열/색 picker+입력+random 한 줄은 터치 크기가 작다. 제목·버튼에는 페이지별 pink 색과 legacy glass 스타일이 남아 있다. 현재 읽은 코드에는 URL 복원/공유 결과 UI가 없다.

3자리 HEX는 각 자리를 두 번 반복해 같은 불투명 sRGB 색으로 확장할 수 있다. 근거: [W3C CSS Color 4 §5.2](https://www.w3.org/TR/css-color-4/#hex-notation), 2026-11-17 확인. 예를 들어 `#abc`는 `#aabbcc`다. 이 작업의 지원 범위는3/6자리 불투명 HEX로 한정한다. CSS 전체 구문/알파/ICC 인쇄 색 관리는 지원한다고 표현하지 않는다.

## 최소 범위

1. 텍스트 draft와 마지막 유효한 canonical `#RRGGBB`를 분리한다. 앞뒤 공백과 기존처럼 생략한 `#`를 허용하고 정확히3/6자리 ASCII hex만 받는다. 문자를 자동 삭제/부분 parsing하지 않는다. 잘못된/불완전 입력은 원문을 그대로 두고 인라인 오류와 마지막 유효 색 유지 안내를 표시한다. color picker·미리보기·모든 변환값은 항상 검증된 canonical 색을 사용한다.
2. `마지막 색으로 되돌리기`로 draft를 명시적으로 복구한다. 색 선택기/프리셋/슬라이더/임의 색상은 하나의 commit 경로로 draft·유효색·오래된 출력 상태를 함께 갱신한다. 기존RGB/HSL/HSV/CMYK 공식과반올림은 유지한다. 임의 색상에서 흰색까지 포함하는 기존범위 확인은 probe후 최소보완만 한다.
3. 각 변환값 복사를 공용 clipboard guard에 연결하고 false/거부를 성공으로 표시하지 않는다. 실패 시 그때의 정확한 표기 전체를 직접 선택하거나 재시도한다. 색 변경·언어 ABA·다른 복사·공유·해제 뒤 늦은 fallback/체크표시를 막는다. copy 버튼에 구체적인 접근성 label을 붙인다.
4. 현재 유효한 색을 재현하는 `?color=RRGGBB`만 URL에 싣고 ShareResult를 연결한다. query unknown/중복/hash/history state 보존, SSR 기본값·초기화 전 사용자 편집 보호, 손상 URL 안내와 기본색 안전복원을 검사한다. 불완전 draft가 URL에 쓰이거나 이전색을 현재 입력의 성공 결과로 오인하지 않도록 안내한다. 공유 버튼은 마지막 유효색을 공유한다는 명시 문구를 사용한다. 원문·기록 저장은 없다.
5. `ui-card`, `ui-field`, 브랜드 토큰으로 정리한다. 제목 장식 아이콘과 pink 장식색은 제거하고 색 swatch·실제 색 축에만 콘텐츠 색을 사용한다. 모바일1열·입력16px·버튼/스와치44px이상, 프리셋 모바일5열/큰화면10열, 결과 바로가기·명확한 입력 label·가로넘침 없음. 색 값 자체와 색축은 의미 있는 시각정보라 단색 토큰으로 바꾸지 않는다.

## 제외와 검증

대비 검사기는 이미 별도 `/contrast-checker`로 존재하지만 현재 query 복원을 지원하지 않는다. 이 후보에서 두 번째 도구를 수정하거나 전달값을 무시하는 연결을 만들지 않는다. RGB 문자열 파서·alpha·CSS 변수·팔레트 저장·이름검색·새폰트/외부패키지도 제외한다.

구현 전 actual-parent probe로6자리정상/3자리거부/invalid결과소실/복사 false 상태를확인하고읽기관측과실행근거를구분한다. 순수parse는전체4096 shorthand와전채널0/255,대소문자/공백/4·5·8자리/非hex/큰입력을검사한다. 기존변환공식대표값·roundtrip허용오차·색상commit·rawdraft·latecopy·URL초기복원/unknown/state·ShareResult소유권을실제부모에서검사한다. 독립검토와실제Chrome320KOEN·키보드·클립보드·공유URL재현·색상picker정상canonical값,전체type으로완료한다. 실제폰디스플레이/프린터색상일치는보장하지않는다.
