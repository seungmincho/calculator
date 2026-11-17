# 26차 독립 브라우저 검증

2026-11-17 04:41:56 KST 최종 집계: **Base64 7 + JSON/CSV 7 = 14/14 기능 흐름 첫 실행 PASS**. Chrome은 정상 종료했고 통합 담당에게 전체 타입 검사 가능 신호를 보냈다. JS 예외·미처리 Promise·hydration 오류·검사 범위의 원시 번역 키는 0건이다. 최대 CSV 입력에서 약 2초의 메인 스레드 지연이 관찰되어 성능 한계는 별도로 남긴다.

실행기는 [check-repeat-batch26-browser.mjs](../../../scripts/check-repeat-batch26-browser.mjs), 전체 기계 결과는 [final-results.json](browser/final-results.json), 사례 계획은 [browser-scenarios.md](browser-scenarios.md)이다. 기존 localhost:3039와 Chrome 한 인스턴스를 사용하고 격리 컨텍스트를 순차 실행했다. 서비스워커와 외부 요청은 차단했다. 모든 원문·파일은 합성 fixture이며 제품 파일, 개발 서버, 빌드 및 전체 타입 검사는 검증 담당이 변경하거나 실행하지 않았다.

## JSON/CSV 7개

| 흐름 | 실제 확인 |
| --- | --- |
| quoted CRLF·식별자·특수 키 | CRLF/LF·쉼표·이스케이프 인용·공백·빈 문자열을 실제 CSV 파일로 업로드했다. `00123`, 큰 정수, `__proto__`, `constructor`, `hasOwnProperty`의 내용이 JSON 다운로드에 보존됐다. 명시 숫자 옵션도 안전한 숫자와 식별자를 구분했다. |
| 합집합·중첩·헤더·BOM | 뒤 행의 키, flatten/preserve, 배열 join/separate와 빈 컨테이너를 검사했다. 제품 parser를 쓰지 않는 독립 CSV reader로 다운로드를 재파싱했다. 헤더 없는 첫 행과 CSV의 EF BB BF를 확인했고, JSON 출력에는 CSV BOM 설정이 남아 있어도 BOM이 추가되지 않았다. |
| 오류·구분자·빈 레코드 | 중복/빈 헤더, 닫히지 않은 인용, 닫힌 인용 뒤 문자, 열 수 불일치, flatten 충돌은 위치 안내·원문 보존·반출 비활성화로 처리됐다. 탭/파이프/세미콜론과 헤더 없는 빈 레코드도 확인했다. |
| 실제 파일·비동기 읽기 | UTF-8/EUC-KR 바이트를 실제 FileReader로 읽었다. 선두 BOM 1개만 제거하고 두 번째/셀 안 BOM을 보존했다. 잘린 UTF-8, 읽기 실패, EUC-KR→UTF-8 변환 후 2MiB 초과는 이전 원문을 보존했다. 지연된 읽기 뒤 새 파일·편집·모드·인코딩·취소·이탈은 새 원문을 덮지 않았다. |
| 최대 입력·전체 다운로드 | 10,000×20 및 1,000×200의 200,000셀을 실제 변환했다. JSON 전체 행 수와 첫/마지막 행, 통계, 표의 2,000/5,000셀 한도를 확인했다. 행/셀 한도, 헤더를 끈 8MiB 중간 flatten 확장, 2MiB 초과 파일을 거부했다. |
| 복사·확정 형식 | 실제 Clipboard 쓰기/읽기를 확인했다. API 거부/없음과 legacy false는 읽기 전용 수동 선택 및 재시도로 복구했다. 입력·옵션·모드 변경 후 늦은 거부는 추가 fallback/안내를 만들지 않았고 과거 결과 복사·다운로드를 막았다. |
| 320px KO/EN·접근성 | 다크 모드에서 문서/본문 폭 320px, 검사한 입력 16px 이상·주요 버튼 44px 이상. 업로드 키보드 포커스 링, 서로 다른 행·열·내용 접근 이름, Enter로 긴 셀 전체 보기, locale 변경 후 원문/확정 결과 보존을 확인했다. |

주요 실제 산출물: [CRLF·특수 키 JSON](browser/csv-quoted-strings.json), [EUC-KR→UTF-8 JSON](browser/csv-euckr-to-utf8.json), [헤더 없는 BOM CSV](browser/csv-headerless-union-bom.csv), [10,000행 전체 JSON](browser/csv-200000-cells-full.json), [200열 전체 JSON](browser/csv-wide-200000-cells-full.json).

## Base64 7개

| 흐름 | 실제 확인 |
| --- | --- |
| 텍스트·URL·패딩 | 한글/이모지/공백·표준/URL 알파벳·패딩 포함/생략·swap 왕복을 Node Buffer의 독립 바이트 결과와 비교했다. URL 결과를 data URL로 표시할 때 표준 Base64로 표현되는 것도 확인했다. |
| 바이너리 파일 왕복 | 4,096바이트 임의 파일을 인코딩하고 raw/data URL을 구분했다. 임의 확장자의 유효 UTF-8 Base64 파일도 허용됐다. 디코딩 후 실제 bin 다운로드를 원본과 바이트 단위로 비교했다. 잘못된 UTF-8 바이너리는 텍스트 출력·복사·swap 대상이 되지 않았다. |
| BOM·엄격한 오류 | Base64 소스 파일의 BOM은 제거하지만 payload의 BOM은 유지했다. 잘못된 UTF-8 파일, nonzero pad bits, 중간/과잉 패딩, 불가능 길이, 혼합 알파벳과 불허 공백을 거부했다. |
| 실제 이미지·비실행 | 작은 PNG가 실제 브라우저 Image에서 12×8로 로드되고 bytes도 유지됐다. 4,097×4,097 헤더는 Image 생성 전 제한하면서 다운로드 bytes는 보존했다. 헤더만 남긴 PNG는 실제 load 실패로 처리됐다. SVG/HTML은 실행/inline 표시되지 않았고 변경·실패·초기화 후 object URL을 회수했다. |
| 늦은 파일 작업 | 실제 arrayBuffer 읽기 완료를 제어하여 새 파일·편집·모드·형식·초기화·이탈 후 이전 결과가 적용되지 않음을 확인했다. 읽기 실패와 실패 뒤 picker 취소는 현재 원문을 보존했다. |
| 복사·수동 복구 | native Clipboard의 raw/data URL 결과를 읽어 비교했다. reject/없음/legacy false·true, 수동 전체 선택, 재시도, 늦은 거부의 fallback 차단을 확인했다. |
| 한도·320px KO/EN | 4MiB/6MiB 초과 파일은 읽기 전에 차단했고 원문을 보존했다. 다크 320px·16px 입력·44px 주요 버튼, 실제 영어 전환과 원문/출력 보존을 확인했다. |

주요 실제 산출물: [4,096바이트 복원](browser/base64-binary-decoded.bin), [raw Base64](browser/base64-binary-raw.txt), [실제 PNG](browser/base64-real-png.png), [payload BOM 텍스트](browser/base64-payload-bom.txt), [미리보기 제한 후 보존 bytes](browser/base64-large-header-preserved.bin).

## 큰 CSV의 응답성 측정

| 입력 | 변환·화면 확인 경과 | 16ms 타이머 최대 간격 | 기타 |
| --- | ---: | ---: | --- |
| 700,069바이트, 10,000행×20열 | 2,199ms | 1,996ms | 전체 JSON 3,480,002바이트, 다음 직접 편집 133ms |
| 1,000행×200열, 표 5,000셀 | 932ms | 713ms | 전체 JSON 3,788,002바이트 |
| 47,496바이트→중간 flatten 8MiB 초과 | 316ms | 161ms | 한도 오류·원문 보존 |

측정은 개발 모드 Chrome 한 번 실행의 변환 및 렌더를 합친 관찰값이다. 순수 parser 시간이나 모바일 기기의 성능으로 해석하지 않는다. **최대 허용 입력에서 약 2초의 UI 지연이 있으므로 응답성에 문제가 없다고 판정하지 않는다.** Worker 분리/렌더 비용 조사는 후속 판단 대상으로 root와 작성자에게 전달했다. 데이터 정확성·한도·전체 산출물의 PASS와 이 성능 제한을 구분한다.

## 화면 증거와 한계

- [CSV 긴 셀·수동 복구 KO](browser/csv-full-cell-320-dark-ko.png), [CSV 수동 복구 EN](browser/csv-recovery-320-dark-en.png)
- [Base64 수동 복구 KO](browser/base64-recovery-320-dark-ko.png), [Base64 EN 첫 화면](browser/base64-320-dark-en-top.png)

네 캡처를 직접 확인했다. 입력/복구 문구 및 버튼은 가로 잘림 없이 표시된다. CSV 페이지의 서버 FAQ 한국어와 개발 모드 Issue 배지는 이번 클라이언트 번역/기능 오류로 집계하지 않았다. 외부 폰트/광고/도구 방문 통계 차단에 따른 resource 오류와 `Failed to record tool click` 로그는 의도한 네트워크 격리 결과로, JS 예외·hydration 오류와 구분했다.

실제 검증은 브라우저 파일 읽기·다운로드 bytes·PNG 디코더·native Clipboard·DOM/키보드이며, 오류 및 역순 완료는 FileReader/arrayBuffer/Clipboard 제어 fixture다. 운영 빌드 성능, 실제 모바일 OS의 파일 picker/클립보드 권한 조합 전수 검증은 하지 않았다. 자동 검사에서 제품 기능 실패나 테스트 실패는 없었고, 실행 전 root의 접근성 보완은 최신 버전 기준으로 확인했다.
