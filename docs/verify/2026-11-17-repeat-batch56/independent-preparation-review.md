# 56차 미연결 준비 독립 검토

root가 실제 imageConversionQueue/Imports/Actions를 직접 실행하는 별도 assertion7그룹을 작성했다. 제품 변경 없이7그룹 PASS이며 native codec/브라우저 실행으로 주장하지 않는다. 이 검토는 미연결 helper까지만이다.

1. clear 뒤 동일 ID를 다시 넣어도 옛 process가 끝날 때까지 다음 변환0, old output만 회수하고 새 file/blob를 정확히 수용.
2. 설정 A→B→A와 취소된 debounce callback을 직접 호출해도 old task 결과 폐기, 동시에 process1.
3. paused 유지·새 설정 실패에도 이전 성공 객체/bytes 보존, 실패만재시도·새성공시이전URL1회회수.
4. processing 안내 callback에서 즉시 pause하는 재진입에서도 실제 process0, pending으로 돌아와 재개 가능.
5. header read 병렬추가 역순/failure MIME fallback, clear후old stale/currentreading count 분리.
6. 현재설정 ZIP의 정확한중복이름·고정Blob, 설정변경중현재ZIP0개, 취소된encode→newencode역순 늦은download0, clear뒤이미캡처한Blob보존.
7. URL 소유3키만변경하고 외부중복값/hash보존, PNG에서는비해당품질/배경제거.

명령: `node docs/verify/2026-11-17-repeat-batch56/check-conversion-independent.mjs`. 결과는 `independent-preparation.json`이다. Node의 MODULE_TYPELESS_PACKAGE_JSON 경고는 기존TS직접실행 안내이며 제품/package설정은 바꾸지 않았다. 부모 UI/earlyhydrate/ZIP 취소와화면 연결·모바일·실제픽셀은 연결 후 후속 검사한다.
