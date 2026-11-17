# 44차 native 검증 준비

현재 준비 단계이며 통과 결과가 아니다. `scripts/check-repeat-batch44-browser.mjs --list`만 실행할 수 있도록 Chrome 시작 가드를 닫았다. 작성자 부모와 canonical 최종 신호 뒤 기존3039 서버에서 단일 Chrome로 실행한다. 41/42/43/45 완료 검사는 반복하지 않는다.

| 흐름 | 실제 검증과 독립 기대값 |
| --- | --- |
| 목표 입력 | 현재 결과 추가·빈 목표·중복 포함3개·삭제, 잘못된 값은 순위 제외, 거리/모드 변경 뒤 목표 시각 원문 보존 |
| 반올림 | 100km/29초의50km=15초, 100km/28,803초의50km=14,402초, 하프/마라톤 마지막 소수 거리. 제품 유틸을 기대값으로 쓰지 않고 정수 유리수 반올림으로 계산 |
| 전체 산출물 | 500km·1km 구간·3목표의 화면50행/전체500행, 실제 BOM CSV와 native Clipboard TSV를 별도 quoted-field parser로 독립 해석. 순서·열18개·마지막 종료 시각·페이지 이동 중 전체 바이트 동일 |
| 인쇄 | 클릭 시점 전체500행 인쇄 DOM→실제 Chrome PDF. 페이지 수/텍스트 내용과 첫·마지막 페이지 PNG 렌더를 확인. `window.print` 포트만 제어해 OS 인쇄창/종이 출력을 호출하지 않는다. afterprint 정리·늦은 편집/이탈 뒤 호출0 구분 |
| URL | 새 방문 최초 복원/수정/초기 편집 우선·hash/비소유 query/history.state 보존, 잘못된 버전·중복/불완전 query·invalid 초안의 옛 owned 값 제거, URL 실패 안내 |
| 복사/공유 | native 성공, API 거부·없음/legacy false, 전체 수동선택·명시 재시도, 본문/locale A-B-A·기본/TSV/ShareResult 교차 소유권과 지연 native toBlob의 옛 다운로드0 |
| 기존 계산 | 기본10km50분·pace/time 전환·preset, 단일 계산은 유효하나 목표 추가는 범위를 넘는 사례를 구분 |
| 모바일/언어 | 320px 다크 KO/EN, 필드16px/동작44px·복사 복구·결과 스크롤과 문서 가로폭, 실제 캡처·JS/hydration/raw key 수집 |

합성 입력만 사용하고 외부 요청은 차단한다. 클립보드 거부/읽기·print/toBlob 지연 주입은 제어 포트, 실제 Chromium Clipboard/다운로드/PDF 생성·렌더는 native 근거로 분리한다. PDF 검사는 `pdf` 스킬을 적용하며 사용자가 인쇄물을 새로 디자인해 달라는 요청이 아니므로 제품 출력의 읽기/검증 범위다. 검증 아티팩트는 이 배치 browser 폴더에만 둔다. 제품 TS와 전체 타입 검사는 이 담당이 수정·실행하지 않는다.
