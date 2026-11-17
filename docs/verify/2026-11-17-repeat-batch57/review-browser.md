# 57 실제 브라우저 검증

최종 **8/8 PASS**, Chrome 종료.58 출력 연결을 포함한 동일 최종 부모에서57 큐/원고 흐름을 별도 집계했다. 전체 타입도 최종 통과했다.

실제 설치 Tesseract createWorker→canvas.toBlob/FileReader→recognize 메시지 경로와 실제 이미지 preview/DOM/TXT를 사용하되 **Worker 메시지 응답만 통제**했다. 실제 OCR 모델·인식 정확도·실행 성능 검사가 아니며 모델 다운로드0·개인 이미지0이다. recognize에 text/blocks 옵션과 job ID·이미지 바이트가 전달됐고 단일 Worker 재사용을 확인했다. 실패 응답 후 제품 errorHandler가 처리해 fixture 배송 예외0이었다.

1. 실제160×96 preview 픽셀/90도 회전96×160, v6 blocks의 낮은 신뢰도 표시, 원고 편집과 실제 TXT 전체 바이트 일치를 확인했다.
2. pause는 현재 작업만 마친 뒤 다음 작업을 멈췄다. paused 추가/실패 retry는 정지를 유지하고 정상 항목을 재인식하지 않았다.
3. 재인식 확인 취소·승인, pending/실패의 이전 원고·TXT 보존, 실행 중 새 편집 보호, 승인된 빈 OCR의 정상 새 결과를 확인했다.
4. 정리 옵션 확인 취소와 확인 중 새 편집에 대한 이전 승인 무효, 확인 후 raw 재정리, 전체 reset 취소/승인을 확인했다.
5. create/reinitialize 지연 중 reset/remove/이탈에서 옛 Worker를 정리하고 늦은 recognize0을 확인했다. 아직 반환하지 않은 create가 새 create와 겹치지 않았다.
6. terminate 후 옛 recognize Promise가 남아도 새 파일은 진행했다. 늦은 progress/result·실제 preview decode 실패/toBlob 완료가 새 원고/preview를 덮지 않았다.
7. 처리 당시 설정과 다음 파일 새 설정을 구분하고 mismatch 안내를 확인했다. 실제 TTS 이동에서 최신 원고를 일회 소비했으며 모델 요청0이었다.
8. 320px dark KO/EN에서 원고16px·주요 동작44px·Enter 확인/취소와 원고 유지, 가로 overflow0을 확인했다. 실제 캡처를 직접 검토했다.

최초6/8의 두 실패는 fixture 오류였다. 확인형 checkbox는 승인 전 값이 변하지 않으므로 Playwright.check 대신 click을 사용했다. 전처리off에서는 원본/준비 PNG 치수가 같으므로 실제 non-File preview URL까지 기다리도록 수정했다. 해당2흐름만 재실행했고 제품 수정 요청0이다. 최초 JSON은 browser의 `initial-confirmation-checkbox-fixture.json`과 `initial-preview-source-fixture.json`에 보존했다.

최종 JS/hydration/unhandled/React caught 오류0·원시 번역 키0. 예상 외부 차단 console 오류와 개발 Issue 배지 내부 원인을 분리했다. 실기기 OCR/카메라/모델 정확도는 검증하지 않았다.

근거: [최종 결과](browser/final-results.json), [실제 원고 TXT](browser/ocr-visible-text.txt), [KO 원고](browser/ocr-320-ko-draft.png), [EN 확인](browser/ocr-320-en-confirmation.png), [실행기](../../../scripts/check-repeat-batch57-browser.mjs).

검증기/fixture 최종 범위 lint 오류0·경고0. 사용하지 않는 screenshot helper만 제거했고 제품/검사 동작은 변경하지 않았다.


최종 공통 타입: 2026-11-17 10:51:00 KST preflight, 여유2.87GiB, heap2GB, chunk f3e9de,9.349초, exit0·진단0(기록10:51:25).58 JSX 보완 뒤 기존부모6/모바일native1/범위lint0·Chrome 종료와 writer freeze를 확인한 후 통합 담당이 실행했다. 첫 session86108 PASS도 별도 first-result로 보존했다.
