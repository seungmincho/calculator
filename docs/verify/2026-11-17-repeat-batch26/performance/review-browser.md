# CSV Worker·미리보기 성능 후속 브라우저 검증

최종 **8/8 PASS**, 2026-11-17 05:21:11 KST. Chrome 종료 확인. 원래 26차 14개 결과와 파일은 수정하지 않았다. 기존 localhost3039·단일 Chrome에서 외부 요청을 차단하고 합성 원문만 사용했다. 제품 파일/빌드/전체 타입 검사는 실행하지 않았다.

실제 제품 Worker가 생성·계산·종료됐고 Next 개발 번들의 Blob 부트스트랩과 세 Worker 청크 경로를 `browser/actual-worker-bootstrap.txt`에 보존했다. 선언은 module Worker이며 개발 런타임은 importScripts 부트스트랩을 사용한다. 이를 처음부터 options.type=module로 단정한 fixture 1건만 고친 뒤 해당 흐름을 재검사했다. 나머지 7개는 반복하지 않았다. 최초 failure 캡처는 이 테스트 기대값 오류의 이력이다.

| 실제 흐름 | 확인 결과 |
|---|---|
| 10,000행×20열 변환 | 이전 전체 JSON 3,480,002바이트와 SHA-256까지 동일. 실제 Worker·확정 미리보기·전체 다운로드 일치 |
| 전체 미리보기 | 49,999 / 50,001 / 50,000 / 50,000 / 33 UTF-16 구간이 원문으로 정확히 연결됨. CRLF·surrogate 보존. DOM textarea의 LF 정규화는 별도로 반영 |
| 넓은 표 | 1,000행×200열 전체 JSON 3,788,002바이트 동일. 표시 5행×200열=1,000셀. 마지막 행 접근 및 원문 편집 중 표 DOM·자식 변경 0 |
| 취소·늦은 응답 | 실제 계산 응답을 보류한 뒤 취소/입력/옵션/모드/실제 SPA unmount. Worker 종료·옛 callback 무효화·새 변환 성공 |
| 파일 decode | 실제 UTF-8/EUC-KR·CRLF·선행 BOM·식별자 보존. transfer 버퍼 5건 모두 분리. 잘못된 UTF-8/파일 초과/decoded UTF-8 초과 거부, 옛 decode 무효화 |
| Worker 실패 복구 | 미지원은 생성 0. postMessage/error/messageerror/잘못된 응답/30초 timeout 경계 후 이전 결과와 원문 보존·동기 성공 fallback 없음·실제 Worker 재시도 성공 |
| 큰 입력·전체 복구 | 2,097,124바이트 native 붙여넣기→전체 CSV 2,097,119바이트. 수동 복구 전체 선택·native Clipboard 재시도·옛 거부 후 fallback 0 |
| 320px 다크 KO/EN | overflow 0, 입력16px·버튼44px, 키보드 구간 이동. 언어 전환 후 원문/확정 결과/현재 구간 유지·추가 Worker 0 |

## 분리한 성능 측정

16ms heartbeat와 Long Task observer를 사용했다. 아래는 이 Windows Chrome 개발 서버에서의 단일 합성 입력 관찰값이며 평균·모바일 실기기·배포 성능 보장이 아니다. elapsed에는 자동화 클릭/조건 대기/두 rAF가 포함된다.

| 구간 | 관찰값 |
|---|---|
| 10,000×20 Worker 내부 계산 | 210.8ms |
| 요청→실제 응답 왕복 | 240.4ms (시작/직렬화/clone/스케줄 포함) |
| 응답 callback | 3.2ms (검증+settlement 합계, 검증 단독으로 주장하지 않음) |
| callback 완료→확정 프레임 | 26.3ms (React render 단독 수치 아님) |
| 10,000×20 변환+기본 preview heartbeat 최대 간격 | **36.2ms**, Long Task 0. 원26 동일 입력 관찰은1,996ms였음 |
| 1,000×200 변환+기본 preview 최대 간격 | **42.8ms**, Worker196.2ms/왕복229.6ms/callback1.8ms |
| 별도 1,000셀 표 표시 | elapsed221.7ms, 최대 간격132ms,115ms Long Task1 |
| 표 유지 상태에서 원문 수정 | elapsed123ms, 최대 간격25.2ms, 표 mutation0 |
| 약2MiB 원문 native 붙여넣기 | elapsed740.6ms, 최대 간격412.8ms |
| 약2MiB 단일 셀 변환+preview | elapsed1,037.1ms, 최대 간격294.9ms. Worker 계산22.7ms/callback0.2ms이므로 남은 UI 작업과 분리 |
| 명시 실패 뒤 전체 수동 복구 표시 | elapsed684.6ms, 최대 간격480.4ms. 전체 필드를 제공하는 의도된 경로이며 안내 존재 |
| 수동 전체 선택 / native 전체 복사 재시도 | 최대 간격41.7ms / 40.6ms |

큰 controlled 원문 입력과 전체 수동 복구에는 여전히 수백 ms 지연이 있다. 일반 변환을 메인 스레드에서 떼고 기본 결과 DOM을 줄인 효과와 이 제한을 구분한다. 전체 출력 바이트를 줄여서 성능을 높인 것은 아니다.

JS pageerror·hydration·unhandled rejection·원시 번역 키는 모두0. 차단된 광고/폰트/통계 요청의 console 오류는 테스트 네트워크 정책에 따른 항목이다. 실패/지연/timeout은 제어 fixture이며 timeout의30초를100ms로 당겨 실행했다. 실제 OS Clipboard와 파일 다운로드는 권한을 부여한 독립 Chrome 컨텍스트에서 확인했다.

실행기: `scripts/check-json-csv-performance-browser.mjs`. 최종 수치·시각·다운로드·모바일 캡처는 `browser/final-results.json` 및 개별 evidence에 있다. 독립 Node Worker8·부모3 검토는 `independent-review.md`로 분리한다.
