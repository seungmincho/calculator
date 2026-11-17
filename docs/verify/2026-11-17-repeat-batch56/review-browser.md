# 56 실제 브라우저 검증

최종 **8/8 PASS**, Chrome 종료. 기존3039·격리 context·합성 이미지·외부 요청 차단으로 실행했다. 제품 전체 타입도 최종 통과했다.

- 실제160×96 PNG의 alpha128과 JPG의 파란 배경 합성 픽셀을 확인했다. 원본 크기/확장자/다운로드 바이트를 유지했다.
- native toBlob 대기 중 pause는 현재 파일을 마친 뒤 멈추고, 빠른 pause/resume에도 실제 encoder 최대1이었다. paused 업로드·설정·실패 재시도는 자동 재개하지 않았다.
- 새 포맷 실패에도 이전 JPG 바이트/URL/개별 다운로드가 남고 현재 설정 합계에서는 빠졌다. 새 성공 때만 이전 URL을 해제했다. 설정 ABA의 늦은 완료는 수용하지 않았다.
- 실제 header read를 지연해 clear/이탈 뒤 추가0과 동시 업로드 묶음 보존을 확인했다. 100MiB/초과 경계는 작은 합성 파일의 size getter를 통제한 검사이며 실제100MiB 메모리 성능 검사가 아니다. 0바이트/SVG 거부와 header 읽기 실패의 MIME fallback도 유지됐다.
- 실제 ZIP **2,551bytes**, CRC 검증과3개 PNG의 개별 다운로드 바이트 일치를 확인했다. `a.png`, `a (3).png`, `a (2).png`가 각각 적/녹/청 픽셀을 보존했다. 클릭 후 추가/삭제는 snapshot을 유지하고, 설정/clear/취소/이탈은 늦은 다운로드0이었다. Blob 읽기 실패 후 재시도도 통과했다.
- 실제 새 방문/초기 편집/popstate/무관 반복query/hash/history.state와 URL writer 실패 뒤 설정 보존을 확인했다. 기존 step5 range는 q67에서 native DOM value65로 정규화되지만 실제 품질 라벨/URL은67이다. 최초 fixture가 DOM67을 기대한 오류를 고친 뒤 URL1개만 재확인했다.
- 320px dark KO/EN에서 가로 overflow0·주요 버튼44px·Enter pause와 이전 성공/실패 안내를 확인하고 캡처를 직접 검토했다.

최초 페이지 진입은 새 page의 존재하지 않는 FaqJsonLd import로 HTTP500이었다. 통합 담당이 기존 ToolFaq의 named export로 수정한 뒤 실제8흐름을 실행했다. 이 공용 통합 제품 결함과 range fixture 오류를 분리한다. 최초 근거는 `browser/initial-page-import-failure.json`, `browser/initial-native-range-fixture.json`에 보존했다.

최종 JS pageerror·hydration·unhandled/React caught runtime 오류0·원시 키0. 예상 차단된 폰트/광고/동의/방문통계 오류는 별도 수집했다. Next Issue 배지의 내부 원인은 추정하지 않았으며 고정 Header/하단 메뉴와 실제 가로폭 검사를 구분했다. 새 build/dev/모델/실사용 파일 접근0.

근거: [최종 결과](browser/final-results.json), [실제 ZIP](browser/conversion-fixed-snapshot.zip), [KO](browser/conversion-320-ko-viewport.png), [EN](browser/conversion-320-en-viewport.png), [실행기](../../../scripts/check-repeat-batch56-browser.mjs). 검증기/fixture 범위 lint 오류0·경고0.

실제 픽셀 검증은 PNG/JPEG 범위다. AVIF/HEIC의 개별 기기 codec·실물 EXIF와 실제100MiB 성능을 재검증했다고 확대하지 않는다. 기존 engine은 이 배치에서 변경되지 않았다.


최종 공통 타입: 2026-11-17 10:51:00 KST preflight, 여유2.87GiB, heap2GB, chunk f3e9de,9.349초, exit0·진단0(기록10:51:25).58 JSX 보완 뒤 기존부모6/모바일native1/범위lint0·Chrome 종료와 writer freeze를 확인한 후 통합 담당이 실행했다. 첫 session86108 PASS도 별도 first-result로 보존했다.
