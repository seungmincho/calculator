# 28차 완료 — 여러 사진 워터마크

2026-11-17 KST. 기존 `/image-watermark/`의 여러 사진 순차 처리와 현재 결과 보호를 로컬 검증까지 완료했다. **작성자 33그룹·독립 14그룹·실제 Chrome 8/8·전체 타입 검사 PASS**이며 배포하지 않았다. [실행 계약](plan.md) · [통합 검사 기록](integration-checks.json).

최대 10장을 추가한 뒤 명시적으로 모두 만들며, 중지·계속·실패만 재시도와 현재 설정의 개별 PNG·선택 ZIP을 제공한다. 원래 해상도, 텍스트/로고 9위치·회전·타일·불투명도 설정을 유지한다. 사진은 파일당 8MiB/합계 40MiB/16,777,216픽셀, 로고는 4MiB/4,194,304픽셀, 완료 Blob은 80MiB 제한이다. 파일·원고는 메모리에서만 다루며 설정 변경·행 삭제·초기화·이탈 뒤 늦은 결과를 반영하지 않는다. ZIP은 클릭 시점의 선택된 완료 Blob과 이름으로 고정한다.

## 구현 및 독립 검토

- [구현 검사](watermark-implementation.md): 순수·큐·어댑터 25 + 실제 workspace 7 + 부모 연결 1 = 33그룹. 준비 8파일과 변경 5파일의 범위 ESLint 오류/경고 0이며 겹치는 파일을 중복 합산하지 않았다.
- [독립 검토](watermark-independent-review.md): 순수/어댑터 8 + 실제 부모 6 = 14그룹, 검사 JS lint 0. 중지 상태에서 실패 재시도가 정상 pending까지 시작하던 경계는 실패 ID만 새 실행에 포함하도록 수정한 뒤 해결 확인했다. 정상 pending은 이후 명시 모두 만들기로 처리한다.
- 실제 브라우저에서 추가 제품 결함은 없었다. 미해결 제품 수정 요청 0이다.

## 실제 브라우저

[최종 리뷰](review-browser.md)와 [실행 합계](browser/final-results.json)는 **8/8 첫 실행 PASS**, 확인 시각 `2026-11-16T20:56:05.128Z`(05:56:05 KST)다. JavaScript 예외·hydration·unhandled rejection·원시 번역 키 0, Chrome 종료를 확인했다.

실제 640×360 투명 PNG 8,817바이트를 독립 파싱했고, 9개 로고 위치의 출력/미리보기 좌표와 alpha를 대조했다. 개별 PNG와 실제 부분/전체 ZIP의 CRC32·픽셀 hash·이름·순서가 일치했다. native encode callback 지연 중 중지/계속/실패만 재시도, 늦은 PNG와 ZIP 다운로드 차단, 유효 로고 보존을 확인했다. 320px 다크 KO/EN에서 16px 입력·44px 주요 조작·넘침 없음과 언어 변경 후 원고/사진/결과 보존도 통과했다.

합성 PNG만 사용했다. 실제 Canvas/Blob/ZIP과 제어한 실패·지연 포트를 구분하며, 모든 EXIF/GIF 디코더·OS별 폰트 픽셀 일치·GPU 고장·실제 휴대폰·최대 예산을 채운 반복 부하까지 보장하지 않는다. 한도 경계 일부는 작성자/독립 검사 근거다.

## 공용 통합 및 타입

작성자 86 + 공용 가이드 7 = ko/en **93 leaf**, 최종 정적 번역 사용 75개·오류 0이다. `messages:check` 1,578파일, namespace apply 0, audit own 538 + child 6 / 미해결 0(기존 동적 알림 60)을 확인했다. 페이지 description/OG/Twitter/JSON-LD와 FAQ를 실제 기능·한도에 맞추고 menu updatedDate를 2026-11-17로 갱신했다. 공용 페이지 2개+menu lint 0, 발견 파일은 redirects 472/RSS 382/llms 315도구·45,632바이트다. 새 경로·OG·패키지는 없다.

Chrome 종료와 모든 TS writer 고정 후 여유 메모리 4.50GiB를 확인하고 **05:58:33 KST 시작한 `node --max-old-space-size=2048 node_modules/typescript/bin/tsc --noEmit` 1회가 exit 0**으로 끝났다(세션 24287, 결과 회수 06:01 KST). [30차 타입 기록](../2026-11-17-repeat-batch30/integration-checks.json)과 같은 실행이며 두 번 검사한 것으로 세지 않는다. 타입에는 31차의 완결된 미검증 부모 연결과 32차의 안정된 준비 파일도 포함됐지만 그 기능 완료·브라우저 근거는 이 보고서에 포함하지 않는다. 해당 canonical 조각은 이 체크포인트까지 병합하지 않았다.

현재 제품/공용 범위 `git diff --check`를 통과했다. 저장소 전체 lint 성공, 운영 정적 export, 빌드·배포·dev 재시작·커밋·푸시는 주장하거나 실행하지 않았다. 35차 SW와 이전 CSV/29차 증거는 별도 보고서로 보존한다.
