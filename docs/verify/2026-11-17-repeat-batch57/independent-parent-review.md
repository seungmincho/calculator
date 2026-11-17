# 57차 OCR 실제 부모 독립 검토

2026-11-17. 최신 57 큐+58 출력이 연결된 `ImageOcr.tsx`에서 **실제 부모 독립 7그룹 첫 실행 PASS**, 제품 결함·추가 수정 요청 없음. 이전 helper 독립12와 분리하며 총 **19 고유 그룹**이다. 작성자 검사나58 복사 복구 검사를 합산하지 않는다.

명령: `node docs/verify/2026-11-17-repeat-batch57/check-ocr-parent-independent.mjs`. 최신 locale/output 포트가 있는58 `ocr-output-parent-harness.mjs`의 I/O fixture만 재사용했다. assertion과 기대값은 독립 파일에서 별도로 작성했다. 실제 부모/helper/출력 함수를 실행하고 worker·Canvas·decode·Clipboard·sessionStorage만 제어했다. 복구 자식은 포트로 분리했으며 실제 OCR 모델/Chrome/OS 클립보드 검증으로 주장하지 않는다.

## 7그룹 결과

1. 재인식 확인 취소는 원고/인식 횟수 불변. 승인 후 진행 중에도 이전 원고가 textarea·현재/전체 copy·TXT Blob·기존 OCR→TTS key에 정확히 전달됨을 확인했다. 인식 중 새 편집의 A→B→A와 빈 편집은 각각 유지된다. 빈 새 인식+편집 유지 안내도 확인했다.
2. cleanup 취소는 checkbox/원고 모두 이전 값 유지. 오래된 cleanup 확인은 편집 왕복 후 적용되지 않는다. 최신 확인만 raw 기반 정리로 바꾼다. reset 취소는 원고 보존, 확인 대기 중 새 파일 추가 후 오래된 확인도 목록/원고를 지우지 않는다.
3. 일시정지는 현재만 완료하고 다음 파일을 시작하지 않는다. paused 중 새 업로드와 실패 retry는 자동 재개하지 않는다. 계속 뒤 오류 파일만 재시도하고 정상 완료 항목을 다시 인식하지 않는다.
4. 실제 부모 adapter의 create 미완료 reset→새 업로드는 기존 생성/terminate 완료까지 새 create를 보류하고 정리 대기 안내를 표시한다. 늦은 logger는 새 작업에 붙지 않는다. 새 recognize의 explicit jobId와 `{text:true,blocks:true}`·create errorHandler를 확인했다.
5. 실제 언어 변경 adapter는 `reinitialize(langs,undefined,undefined,jobId)`를 사용한다. 진행 중 해당 항목을 제거하고 새 파일을 추가한 뒤 옛 reinitialize/logger가 새 recognize나 원고를 바꾸지 않는다.
6. active source B→A 선택에서 old toBlob과 old decode reject를 뒤늦게 완료해도 현재 prepared preview를 대체/삭제하지 않는다. prep 변경은 이전 OCR 원고를 유지하며 설정 차이를 안내한다. reset 후 preview와 소유 URL을 정리한다.
7. 승인된 빈 페이지는 이전 edited/raw를 재사용하지 않는 새 정상 성공이다. 그 이후 재인식 실패는 빈 성공 snapshot을 보존하며 이전 결과 안내와 error 작업 상태를 함께 유지한다.

## 범위와 한계

합성2px 이미지와 제어 Promise 사용, 모델 다운로드/사용자 사진/실제 브라우저0. 현재 copy/TXT/TTS로 넘기는 내용의 일치만57 증거다. 복구 자식·native clipboard/selection 실패·58 출력 소유권의 전체 경계는58 별도 검사에 남긴다. helper12를 재실행하지 않았으며 실제 설치 API의 terminate 후 미해결 recognize 근거는 이전 독립 준비 보고서에 보존한다.

제품/공유 host/canonical/TS 수정 없음. 전체 타입·빌드·배포·커밋·Chrome 실행 없음. 부모 독립 MJS scoped ESLint **exit0·오류0·경고0**이다. 제품 파일은 안정된 상태로 유지하며 통합 전체 타입을 막는 독립 작업은 없다.
