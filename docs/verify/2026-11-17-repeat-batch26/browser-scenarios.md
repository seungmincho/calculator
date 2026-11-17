# 26차 독립 브라우저 계획

25차 체크포인트 뒤 부모 final ready·공용 번역 준비 신호에 맞춰 실행한다. 준비 중 Chrome은 열지 않는다. 기존 localhost:3039·한 Chrome·순차 격리 컨텍스트, 서비스워커/외부 통신 차단을 유지한다. 제품 TS·패키지·서버·전체 tsc·빌드는 변경/실행하지 않는다.

## JSON/CSV (7흐름)

1. quoted CRLF/LF, `""`, 공백·빈셀·끝 레코드, `00123`/큰 정수와 `__proto__`/constructor/hasOwnProperty를 실제 CSV→JSON 파일로 확인한다. 기본 문자열과 명시 숫자 옵션을 비교하고 JSON.parse로 결과를 독립 검사한다.
2. JSON→CSV의 행 전체 키 합집합, flatten/preserve·배열 join/separate·빈 컨테이너, no-header 첫 데이터 행을 확인한다. 내려받은 CSV는 제품 parser를 쓰지 않는 독립 검증 parser로 재읽고 확정 표/통계와 비교한다. CSV BOM은 실제 EF BB BF로 확인하며 JSON 모드에서는 BOM 없이 바로 JSON.parse가 되어야 한다.
3. 중복/빈 헤더, 닫히지 않은 인용·닫는 인용 뒤 문자·열 수 불일치·flatten 충돌을 대표 입력으로 묶어 오류 위치·원문 보존·잘못된 성공 반출 없음 확인. 실제 탭·파이프·세미콜론과 헤더 없는 빈 레코드도 확인한다.
4. 실제 UTF-8/EUC-KR 파일을 고정 바이트로 생성한다. 선두 BOM 1개만 제거, 둘째/셀 안 BOM 보존, 잘린 멀티바이트 fatal 실패. 읽기 지연 A→B 역순·직접 편집·탭/인코딩 변경·취소가 원문을 덮지 않는다.
5. 최대10,000행×20열=200,000셀의 실제 입력을 변환해 전체 다운로드/통계를 확인하고 주기 타이머 지연과 변환 시간을 기록한다. 행/셀 한도 초과와 **긴 공통 flatten 경로로 중간 key/value가8MiB를 넘는 입력**은 헤더 해제 상태에서도 중단·원문 보존. 임의 성능 수치를 약속하지 않고 실제 응답성으로 Worker 필요성을 판단한다.
6. native Clipboard 성공, reject/없음+legacy false 수동 선택·재시도, pending 중 입력/옵션/모드/새 결과의 stale 안내·fallback 차단. 바뀐 옵션을 과거 확정 결과 형식으로 잘못 반출하지 않는다.
7. 320px KO/EN 다크, 긴 셀 전체 보기·내부 표 가로 스크롤·16px 입력/44px 주요 버튼·원시 키/JS/hydration. locale 변경만으로 현재 원문/결과를 바꾸지 않는다.

## Base64 (7흐름)

8. RFC 벡터 일부와 한글/이모지/공백만인 원문을 실제 UI로 인코딩·swap·디코딩한다. 독립 Node Buffer와 비교하고 standard/URL 패딩 포함·생략을 확인한다.
9. 실제 임의 바이트 파일→raw Base64/data URL 구분·재변환 동일성→Base64 텍스트 파일 업로드·디코딩→실제 다운로드 바이트를 원본과 exact 비교한다. 잘못된 UTF-8은 텍스트 성공/안내문 swap으로 취급하지 않는다.
10. UTF-8 .txt/.base64 및 임의 확장자의 유효 Base64 파일 허용, 선두 BOM 제거와 payload BOM 바이트 보존, 잘린 UTF-8 실패·원문 보존. 확장자가 아니라 실제 UTF-8/codec 내용으로 판단한다. 표준/URL 혼합·중간/과잉 패딩·불가능 길이·nonzero pad bits·허용/불허 공백을 대표 경계로 묶는다.
11. 실제 작은 PNG를 브라우저가 decode하여 naturalWidth/Height를 확인해야 미리보기 성공. MIME만 image인 일반 bytes·서명만 맞춘 손상 PNG·SVG/HTML은 실행/inline 표시하지 않는다. 실제 다운로드 bytes와 이전/실패/초기화 object URL 회수를 확인한다.
12. 파일 arrayBuffer 지연 후 다른 선택/직접 입력/모드·형식/초기화/언마운트는 이전 결과를 적용하지 않는다. 파일 오류/취소는 원문 보존. 현재 파일을 다시 변환해 data URL 문자열을 중복 인코딩하지 않는다.
13. 실제 Clipboard raw/dataURL 선택, false 수동 선택·재시도, 오래된 copy 응답이 새 입력/결과/안내/fallback에 영향을 주지 않음. byte/text/file 결과에서 가능한 swap만 제공한다.
14. 실제 초과 크기 파일로4MiB/6MiB 사전 거부·읽기0/원문 보존을 확인한다. 320px KO/EN 다크·긴 출력 줄바꿈·16px/44px·번역·locale 보존·JS/hydration을 묶어 확인한다. 자체 도메인의4MiB 모든 조합을 브라우저에서 중복 반복하지 않는다.

API 실패/지연은 fixture로 제어하고 실제 파일·다운로드·브라우저 이미지 디코더·native Clipboard와 구분한다. 원문은 합성 자료만 사용하며 URL/기기 저장/외부 요청에 새로 저장되지 않는지 확인한다. 제품 결함은 담당자에게 전달하고 영향 사례만 재검사한다. 마지막 Chrome 종료 후 통합 담당에게 전체 타입 검사 가능 신호를 보낸다.
