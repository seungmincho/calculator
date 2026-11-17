# CSV Worker·미리보기 후속 브라우저 계획

27차 타입 체크포인트 뒤 부모 연결 final ready·번역 신호에 맞춰 실행한다. 준비 중 Chrome은 닫힌 상태를 유지한다. Base64는 변경이 없어 26B를 다시 실행하지 않는다. 기존 26차200,000셀 fixture와 실제 산출물 bytes를 재사용하고 새로운 임의 성능 한도를 만들지 않는다.

## 8개 의미 흐름

1. **실제 module Worker·동일 bytes**: 10,000×20셀700,069byte CSV를 업로드/변환한다. Worker 실제 URL·요청/응답/종료를 관찰하고 decode/convert가 별도 실제 Worker에서 수행되는지 확인한다. 전체 JSON은 기존26차3,480,002byte 파일과 exact 비교한다. computeMs·요청→수신·onmessage callback 전후·확정 DOM→다음rAF·16ms heartbeat를 각각 기록한다. 처음 로드와 같은 입력 재요청의 Worker startup/cache 조건을 구분한다.
2. **50k text preview·전체 조합**: 전체 output보다 작은 명시 구간/전체 길이 안내와 모든 페이지 접근을 확인한다. 페이지 전체를 순서대로 합친 문자열은 다운로드 전체와 동일해야 한다. emoji·CRLF 경계가 갈라지지 않는 대표 fixture도 사용한다. raw DOM textarea의 CRLF 정규화와 제품 result의 원본 CRLF는 별도 비교한다. 미리보기 페이지를 바꿔도 전체 복사/파일 결과는 동일하다.
3. **1,000셀 표·렌더 분리**: 이미 확정된20열 결과에서 text→table, 다음/마지막 페이지, 긴 셀 펼침을 각각 계측한다. 200열×1,000행 fixture는 전체3,788,002byte 그대로, 표5행×200열=1,000셀. 새 입력 편집 때 memo 결과 view가 불필요하게 재생성되는지는 DOM node identity/MutationObserver/heartbeat로 관찰한다. 계산시간과 표 렌더시간을 섞지 않는다.
4. **실제 취소·새 입력·늦은 응답**: native Worker 실행 도중 취소 클릭/새 입력/모드·옵션·인코딩 변경/새 파일/이탈은 Worker terminate와 stale 결과·오류 차단으로 이어져야 한다. 실제 응답 전달을 hold하여 취소 후 queued callback을 전달해도 현재 상태가 바뀌지 않아야 한다. 현재 원문·이전 확정결과/dirty 상태를 보존하고 명시 재시도가 동작해야 한다.
5. **decode·오류 보존**: 실제 UTF-8/EUC-KR·BOM·잘린 바이트와 decoded2MiB 상한을 Worker 경로로 확인한다. ArrayBuffer transfer 후 main 원본 buffer detach를 관찰하되 File 원본은 남는다. 기존 quoted CRLF·특수키·오류 위치·CSV 전용BOM·중간 flatten8MiB 한도 대표를 통합하여 수치/파서 정책이 바뀌지 않음을 확인한다.
6. **Worker 실패·복구**: 미지원/constructor 또는 post 실패, error/messageerror·잘못된 응답과 timeout 중 의미 있는 대표 경계를 묶는다. main에서 동기 대체 변환을 시작하지 않고 원문/이전 결과를 보존해야 한다. 안내 후 새 명시 시도로 회복하며 실패는 성공으로 표시하지 않는다. 전체30초 timeout 반복은 피하고 제어된 해당 timer만 앞당길 경우 fixture임을 보고한다.
7. **큰 입력·전체 수동 복구 성능**: 실제 native paste로2MiB 근처 input 편집→DOM/rAF와 heartbeat를 별도 측정한다. 최대 출력의 native Clipboard 읽기 및 API거부/legacyfalse→전체 readOnly 복구 열기/전체 선택/재시도도 별도 측정한다. 미리보기50k만 복구·다운로드에 넣지 않아야 한다. 지연 copy 뒤 새 입력의 fallback0을 유지한다.
8. **320px KO/EN·탐색**: 다크320px에서 preview 범위/이전·다음·표 페이지/취소/복구 안내,16px 입력·44px 주요 버튼·키보드 포커스·가로 overflow를 확인한다. locale 변경은 입력/확정내용/페이지 기준을 임의로 재변환하지 않는다. 원시 키·JS/hydration·원문 URL/저장/외부 전송0을 수집한다.

## 측정 정의

- Worker `computeMs`: 제품 worker가 보낸 core/decode 처리 시간. 브라우저 source wrapper의 관찰은 이 수치의 의미를 바꾸지 않는다.
- 요청→응답 수신: startup/전달/worker 계산/스케줄링을 포함한다. 이 값에서 compute를 뺀 값을 순수 복사 비용이라고 부르지 않는다.
- onmessage callback 전후: 제품의 bounded 검증과 settlement/terminate를 포함한다. 순수 shape 검증만의 시간이라고 부르지 않는다.
- 응답→확정 DOM→다음rAF: React commit·preview DOM·paint 대기 관찰이다. 테스트 자동화 왕복이 일부 포함되므로 직접 프로파일러 수치와 구분한다.
- text→table, preview 페이지, 표 페이지, input2MiB, manual 전체 복구는 각각 독립16ms heartbeat 구간으로 측정한다.

실패/지연은 제어 fixture, 실제 Worker 번들·structured clone/transfer·다운로드 bytes·native Clipboard는 실제 브라우저 근거다. 제품/공용 코드·패키지·서버·빌드·전체 타입 검사는 변경하지 않는다. 부모 ready 뒤 한 Chrome을 순차 사용하고 마지막 종료를 통합 담당에게 알린다.
