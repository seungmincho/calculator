# 43차 단위 일괄 변환 core 독립 검토

상태: 독립 7그룹 PASS, 재현 가능한 제품 결함/수정 요청 없음. 제품 TS는 수정하지 않았고 독립 JS/MD만 추가했다. 41 준비 TS freeze를 유지했다. 독립 JS lint는 exit 0, errors/warnings 0으로 확인했다.

## 방법과 범위

`check-unit-batch-independent.mjs`는 실제 `convertUnitBatch`와 `serializeUnitBatch`를 호출하지만 기존 `convert`, `formatNum`, `parseInput`을 기대값으로 재호출하지 않는다. 작성자 `check-unit-batch.ts`의 assertion이나 helper도 재사용하지 않았다.

`UNITS`는 지원 ID의 전수 열거에만 읽었다. 알려진 단위 정의값을 별도 literal로 지정하고 raw 수치의 정·역방향 변환, 독립 물리 행 scanner, 독립 quoted-field CSV/TSV parser로 서로 다른 계약을 확인했다. 출력 문자열 반올림은 일부 작은 기대값을 직접 지정하고 전체 역변환에는 formatted 값이 아닌 numeric output을 사용했다.

| 그룹 | 독립 근거 |
| --- | --- |
| 정의값 anchor | 선형·온도 offset·연비 역수·CSS·전통 단위 등 31개 알려진 관계. 예: 12in=304.8mm, 4lb=1814.36948g, 121평=400㎡, 90km/h=25m/s, 2MiB=2097152B, 25km/L=4L/100km, 2.25rem×18px=40.5px |
| 전 단위쌍 역변환 | 모든 지원 category의 모든 ordered pair, 음수·소수·정수 5값. CSS는 basis 9.5/16/27을 별도로 반복. 총 **8,125** numeric roundtrip, 독립 허용오차 안에서 원래 값 복원 |
| 원문과 행별 상태 | 빈/공백/NBSP, 탭 열 오류, 쉼표·underscore·공백 제거의 기존 숫자 문법, 2/8/16진수·지수·음수0·Infinity/NaN/잘못된 접미사. 원문 그대로·행번호·정상9/오류6/빈3 확인 |
| 물리 행 scanner | 정규식 split과 별개의 문자 scanner. CR/LF/CRLF·마지막 한 줄바꿈 정책과 고정 사례9개 + 결정적 합성400개 대조 |
| 한도와 overflow | 50,000 UTF-16/1,000행 경계와 +1, emoji 2 code units, finite 입력의 결과 overflow, 연비0의 비유한 결과, invalid pair 전체 실패. 잘린 부분 성공 없음 |
| 불변 snapshot | caller의 pair 변경 및 source/pair/row/array 변조 시도에도 snapshot/export 불변. CSS basis와 정밀도 고정, 직접 정한 22.22/1.23457/1e-7 표시값 |
| 전체 반출 parser | quoted-field state machine으로 CSV/TSV 1,001개 records(헤더+1,000행)·8열을 정확 왕복. BOM 차이, 쉼표/따옴표/탭/헤더 개행, 빈 행·오류·원문 텍스트 접두사, 부호 있는 결과 숫자·CSS basis 확인 |

## 보존과 반출 판정

원문 행은 nonempty이면 스프레드시트 텍스트 접두사가 붙고 그 접두사 한 개를 제거하면 원문과 정확히 같다. 기존 apostrophe로 시작하는 원문도 구별된다. 오류·빈 행을 제외하지 않고 200행 preview와 전체1,000행 반출을 분리한다. 결과 숫자의 `-200`은 원문 `'-2`와 다르게 numeric cell로 유지된다.

수식 시작 문자 `= + - @`와 leading 공백/BOM/zero-width/tab 조합, 번역 header/status 안의 구분자/따옴표/개행까지 독립 parser로 검증했다. 이는 serializer의 문자열 안전 처리 확인이며 실제 Excel/Sheets import나 OS clipboard 실행 결과를 대신하지 않는다.

전 단위쌍 역변환만으로 모든 정의값의 정당성을 증명할 수 없으므로 별도 anchor 그룹과 함께 사용했다. 이번 변경은 기존 엔진을 재사용하는 계약이며 최신 측정 표준 전체 재감사나 단일 변환기의 기존 수치 표시 정책 변경을 요구하지 않는다. 매우 작은 값의 floating-point underflow는 기존 숫자 엔진 범위이며 이번 검사의 새로운 계산 공식은 없다.

신규 core에는 URL/localStorage/최근값/네트워크 쓰기가 없다. child·복사 actions는 writing_versions 소유이고 별도 준비 검사 중이므로 이 보고서의 7그룹에 합산하지 않는다. 실제 부모 URL/즐겨찾기/단일 복사 경합, native paste/CSV/Clipboard와 320px 화면, 전체 타입은 후속 지정 담당 검증 범위다.
