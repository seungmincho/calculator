# 37차 화면 비율·이미지 실제 Chrome 검증

2026-11-17 **07:19:27 KST, 8/8 PASS**. Chrome/context 모두 종료했으며 미해결 native 제품 결함0건이다. 36차8/8은 별도 결과로 보존한다. 실행기는 `scripts/check-repeat-batch37-browser.mjs`, 원시 결과는 [browser/final-results.json](browser/final-results.json), 독립 합성 fixture는 [browser-fixtures.mjs](browser-fixtures.mjs)다.

| 흐름 | 확인한 동작과 실제 산출물 |
|---|---|
| finite·URL·기존 계산 | 1080×1920/lock/zone 초기 복원, 잠금540×960·교환,4:3 적용·400×300 리사이즈,1280×720 프리셋. Infinity/0 URL을 기본값으로 덮지 않으며 과도한 비율 반출 차단 |
|9위치·37%·preview |240×120 합성 PNG의9위치 모두120×120 PNG로 저장하고 독립 cover oracle·작은 preview raster 픽셀과 대조. 가로만 잘리는 원본에서 고유 crop은3개이며9개라고 과장하지 않음. 세로 원본3위치·키보드 슬라이더37%도 대조 |
|alpha·pad·출력 한도 |PNG alpha128 보존, 검정/흰 pad의 색·불투명 합성 확인.8192² 요청은 실제4000²/16,000,000px·**319,513 bytes PNG**. safe-zone은 저장 픽셀에 포함되지 않음.1×16,000,000 축소 뒤0변은 다운로드 거부 |
|입력 한도·실패 교체·EXIF |8MiB 초과는 파일 읽기0,16MP 초과 PNG header는 native decode0. 정확8MiB 파일과 실제4000² 원본 수용. SVG/잘못된 PNG color type decoder 실패는 이전 사진·위치 유지. EXIF6인80×40 JPEG는 실제40×80·위 빨강/아래 초록으로 저장(**830 bytes JPG**) |
|읽기·decode·clear·재진입 |A 읽기 완료 보류 중B 선택은A 실제 종료 전B 읽기0·최신B만 적용. decode 보류→지우기→해제는 Bitmap 회수·숫자 유지. 이후 새 사진 선택 정상. toBlob 보류→Header SPA 이탈→뒤로가기→새 사진은 옛 native 완료 전 새 adapter 읽기0, 해제 후 최신 사진만 반영·옛 다운로드0 |
|native encoder·재시도 |같은 화면의 지연 toBlob 뒤 새 crop/export에서 실제 callback 동시 대기 최대1. 과거 다운로드 차단·null Blob은 실패·native PNG 재시도 성공710bytes. 생성한 다운로드 Blob URL 회수 |
|복사·ABA·공유 교차 |실제 Clipboard 치수·CSS, 수동 원문·전체 선택·native 재시도. size→CSS 및 자체→ShareResult/ShareResult→자체 양방향 과거 거부 fallback0. 입력·언어 A→B→A에서 과거 성공/복구 부활 없음 |
|320px 다크 KO/EN |document/body 모두320px. 확인한 입력16px 이상·새 crop/복구/이미지 조작44px 이상.108×192 frame비율0.5625,1×8192 frame은높이230px 안에 제한됨. 언어 변경 시 사진/위치 유지 |

실제 파일: [왼쪽 위](browser/nine-position-0.png), [오른쪽 아래](browser/nine-position-8.png), [37%](browser/arbitrary-37-percent.png), [alpha](browser/alpha-crop.png), [흰 pad](browser/pad-white.png), [4000²](browser/limited-4000-square.png), [EXIF JPG](browser/exif-oriented.jpg). 원본/산출물은 검증기가 만든 색 블록 이미지로 개인 사진을 사용하지 않았다. geometry oracle는 제품 함수를 import하지 않는다.

해결한 경계와 재검사 범위:

- 실행 전 독립 검토의 remount 물리 작업 중첩은 module 공유 작업 대기열로 수정됐다. 실제 SPA 재진입에서도 이전 toBlob callback 반환 전 새 읽기0을 확인했다.
- 첫 native 실행에서 **clear→늦은 decode 반환→새 사진 선택** 시 React `removeChild`/`<span>` ErrorBoundary를 재현했다. canvas host와 React placeholder의 DOM 재사용이 원인이었고, 항상 빈 canvas 전용 host와 sibling placeholder로 분리한 뒤 해당 흐름 통과.
- EN 극단 비율1×8192에서 긴 해상도 표 행 때문에 문서폭325px를 확인했다. 작성자의 모바일 복사 버튼 다음줄·최대너비/줄바꿈 보완 후 해당 모바일 흐름만 재검사해320px 통과.
- 추가 코드 검토에서 자체 복사와 ShareResult 경계를 연결한 뒤 양방향 native 지연 거부 검사를 같은 복사 흐름 안에 포함했다. 수정 전 native 재현을 했다고 주장하지 않는다.
- 첫 입력 한도 검사에서 잘린48byte PNG는 Chrome이 받아들였으므로 반드시 decode 오류를 기대한 검증 가정이 틀렸다. 원본 byte 크기·치수 header 경계는 유지하고, 실제 native decoder가 거부하는 잘못된 PNG color type으로 교체했다. 제품 결함으로 집계하지 않았다.

첫 실행5PASS/3FAIL에서 모바일 영향1을 먼저 통과시키고, 입력 한도·clear/재진입·교차 복사3흐름만 재실행해 최종8PASS가 됐다. 기존 통과한 대형PNG/9위치 검사는 반복하지 않았다. 초기 `*-failure.*`는 이 경과의 증거이고 최종 미해결 목록이 아니다.

최종 JS pageerror·hydration·unhandled rejection·원시 번역 키·React ErrorBoundary는0. 광고/외부 글꼴/동의 SDK/방문통계/홈 인기 도구 요청은 차단했으며 이에 따른 fetch console 오류는 원시 증거에 보존했다. SW는 차단하고 기존3039 서버를 유지했다. 새 서버·패키지·빌드·배포·제품 파일 수정은 검증 담당이 수행하지 않았다.

시각 검토: [KO 상단](browser/aspect-320-ko-top.png), [EN crop 패널](browser/aspect-320-en-panel.png)을 직접 확인했다. [KO 긴 패널](browser/aspect-320-ko-panel.png)은 element 캡처 안에 sticky Header/하단 내비게이션이 겹치는 촬영 artifact가 있으므로 제품 layout 회귀로 해석하지 않는다. 실제 PNG 양끝 위치와 EXIF 방향도 직접 확인했다.

실제 Canvas/Bitmap/toBlob·Clipboard·SPA 동작과 완료 전달 보류/null Blob 같은 제어 포트를 구분한다. 이 Chrome의16MP 성공을 모든 모바일 메모리·OS 코덱 지원으로 확대하지 않는다. 선행 전체 타입07:13:07 KST 재PASS 뒤 제품 DOM/스타일/복사 변경이 있었으므로 이를 최종 근거로 재사용하지 않았다. **통합 담당이 Chrome 종료 후08:08:20 KST 시작한2GB 전체 타입 검사는 exit0/진단0**으로 끝났다. 최신37/39/40 제품과41/42/43 준비를 포함한 최종 근거이며 검증 담당은 전체 타입을 별도로 실행하지 않았다.
