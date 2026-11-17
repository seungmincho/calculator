# 57 실제 브라우저 검증 계획

상태: 준비 중. 부모와 canonical final 신호 전 Chrome 실행 없음. 모델 다운로드0·개인 이미지0. 설치된 Tesseract v6의 실제 브라우저 createWorker/recognize 호출까지 실행하되 Worker 메시지 결과는 명시적으로 통제한다. 이는 OCR 인식 정확도/모델 성능 검증이 아니다.

1. 합성 이미지2개 자동 순차 처리, 실제 preview PNG·회전/원본 치수, v6 blocks words 및 editable 원고. 화면과 TXT/TTS 원고 일치.
2. 현재 recognize 대기에서 pause → 현재만 완료 → 다음 시작0, paused 추가/실패 retry 후에도 pause 유지, resume 원래 순서.
3. 편집본 재인식 확인 취소/승인, pending·실패 동안 원고 유지, 승인 뒤 새 편집을 늦은 성공이 덮지 않음. 새 빈 OCR 결과는 별도 정상 성공으로 처리.
4. 정리 옵션/전체 초기화 확인, 확인 중 편집/대상 변화 시 오래된 승인 무효. 실패 retry는 정상 항목을 다시 처리하지 않음.
5. create/reinitialize/recognize 각각 지연 중 reset/remove/이탈 → 늦은 발화·진행·원고 적용0, 해당 Worker 정리. terminate 후 recognize Promise가 남아도 새 큐 진행 가능.
6. 처리 당시 언어/전처리 snapshot 안내, 다음 파일 새 설정, preview decode/toBlob 역순과 오래된 실패가 새 preview를 지우지 않음.
7. 전체 TXT의 실제 UTF-8 바이트와 handoff 원고, source/list/edit URL/storage 유출 없음. 복사 실패 정책은58과 분리하며58 최종 연결 시 같은 source 기준으로 별도 기록.
8. 320px dark KO/EN·44px 동작·16px 원고·키보드·JS/hydration/원시 키. 실제 스크린샷과 통제 Worker/API 경계를 구분한다.

공개 모델/외부 요청은 차단하며 요청 목록에서0을 확인한다. 제품이 설치 라이브러리의 errorHandler를 연결했으므로 Worker reject 뒤 별도 throw가 없어야 한다. fixture는 배송 중 예외를 기록하고0을 assert하며 숨겨서 성공 처리하지 않는다. 실제 canvas/FileReader/DOM과 통제 인식 텍스트를 혼동하지 않는다.
