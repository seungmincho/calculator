# 52차 퍼센트 비교 — 미연결 준비 독립 검토

상태: **독립 8그룹 PASS, 재현된 제품 결함/수정 요청 없음.** 작성자 final ready 후 실행했다. 기존 `PercentCalculator.tsx`에는 아직 연결되지 않았다. 작성자 순수 9 + 자식 3그룹 및 기존 percent 회귀는 이 수에 합산하지 않았다. `npx eslint docs/verify/2026-11-17-repeat-batch52/independent-preparation-check.mjs`는 오류·경고 없이 exit 0이다.

## 방법과 실행

`node docs/verify/2026-11-17-repeat-batch52/independent-preparation-check.mjs`

- 순수 제품 모듈은 직접 import했다. 수치 기대값은 작성자 기본 예시 대신 별도 8종 anchor 및 BigInt 정수 기준의 31 × 6 계산 ledger를 사용했다.
- 실제 `PercentComparisonPanel`/`PercentCopyRecovery`는 공용 29차 React 이벤트 호스트에서 실행했다. 작성자 assertion·52차 자식 fixture는 재사용하지 않았다.
- Clipboard Promise/legacy 결과/download port/DOM selection/소비자 callbacks만 제어한다. 실제 브라우저·시스템 clipboard·파일 다운로드·외부 API는 실행하지 않았다.
- Node가 기존 package 설정에 따른 `MODULE_TYPELESS_PACKAGE_JSON` 재해석 경고를 출력한다. 검사 exit 0이며 package 변경 대상은 아니다.

## 결과

| 그룹 | 별도 기대값/실제 경계 | 판정 |
|---|---|---|
| 1 | 8종 다른 입력의 결과·단위: `2160.48`, `43.75%`, `125%`, `63000`, `72000`, `46%`, `3.75%p`, `1100`. 추가 31 × 6 정수 ledger에서 계산 결과 확인 | PASS |
| 2 | typed raw의 빈칸/공백/잘못된 문자열/Infinity/지수 overflow, 6종 비유한 계산 결과 거부. 주 결과는 유한해도 %p 카드의 상대 비율이 비유한이면 거부. 큰 유한 값 허용, optional chain price의 기존 무시 정책, chain 길이·범위, 정수 소수자릿수 0~4 경계 | PASS |
| 3 | 카드별 관련 raw만 복제, 8종 unit/value, decimals/korean 보존. 원본 values/chain 편집 후 snapshot 불변, 내부 배열·raw 항목 freeze, 당시 main/formula 유지 | PASS |
| 4 | 6개 한도와 별도 ID 배열 모델. 7번째 추가 시 eviction 0, 동일 ID/동일 snapshot 중복 거부, 알려진/없는 ID 제거와 순서 유지. 제거 후 새 항목 추가, 숫자는 같아도 raw가 다르면 별도 snapshot | PASS |
| 5 | owned URL helper가 반복된 foreign query/hash를 보존하고 관련 raw의 빈 문자열·공백·한글/단위·음수를 유지. 기본값 복구 시 owned keys만 제거. 비교 목록은 URL에 추가되지 않음 | PASS |
| 6 | 10개 출력 target의 100개 ordered pair에서 이전 native reject 뒤 legacy fallback 0. false/throw fallback은 실패, 명시 invalidate 및 dispose→mount 뒤 늦은 결과는 stale. 빈 TXT 요청 0, 전체 문자열 download port 전달 | PASS |
| 7 | 실제 패널의 6개 snapshot·KO/EN 현재 라벨·당시 main/formula/raw를 검사. 복사와 TXT callback에 같은 전체 6항목 전달. 개별 제거/clear는 소비자 intent이며 전달받은 목록을 변경하지 않음. 빈 목록 3버튼 disabled, copying 중 복사 disabled | PASS |
| 8 | 실제 복구 자식의 긴 Unicode/탭/여러 줄 전체 문자열을 readOnly 필드에서 보존. 선택 실패 경고→다음 선택 성공, 전체 UTF-16 범위 선택. 선택/닫기 intent가 소비자의 pending copy를 무효화하여 늦은 fallback 0, retry callback 각 1회 | PASS |

첫 실행에서 증감 입력 `-8e307 → 8e307`을 overflow로 예상한 독립 fixture 오류가 있었다. 차이 `1.6e308`과 결과 `200%`는 유한하므로 제품이 맞았다. 경계 fixture만 `-9e307 → 9e307`로 보정한 뒤 전체 8그룹을 실행했다. 제품 결함·제품 수정으로 집계하지 않는다.

## 보장 범위와 후속 부모 경계

`PercentValues`/`PercentCard`는 typed 내부 호출 계약이며 저장/외부 JSON parser가 아니다. 임의 잘못된 JS 객체를 타입 우회로 주입해 런타임 parser 보호를 요구하지 않았다. 문자열 값의 문법/계산 결과 검증과 표시 설정 범위는 실제로 검사했다. optional chain price의 빈/무효/음수 값 무시 정책은 기존 카드와 같다.

snapshot의 main/formula는 부모가 만든 당시 표시 문자열이다. 자식은 이를 재계산하지 않고 현재 locale로 제목·필드명·설정 라벨만 해석한다. 복구의 output owner도 부모 소비자 계약이며 이번 자식 검사는 별도 callback 포트로 그 연결을 확인했다.

따라서 root baseline의 부모 URL 초기 복원/foreign URL 손실·현재 카드 overflow 표시·카드/목록 실제 출력 경합·입력/locale ABA·전체 초기화와 목록 비우기의 분리는 아직 수정 완료로 판정하지 않는다. 실제 부모 연결 후 독립/브라우저 검사가 필요하다. 기존 baseline 3문제는 그대로 보존했다.

## 변경하지 않은 파일과 해시

검사 전후 같은 SHA-256이며, 부모 SHA는 root `before-fix.json`의 `sourceSha256`과도 같다.

- `src/components/PercentCalculator.tsx`: `ffd60974e14b5de3e58e53a406bbf42f86bfa81c6b4393b9d887ab07040ecf49`
- `src/utils/percent.ts`: `82e13ab72236be7058b1a9b183007c6b740ac7536c6a7abfe9df89db2a6d370b`
- `before-fix.json`: `77c75c2f75d910a96f331e51682180bd54e622f7b95aff09782d2df5b5ab0c30`
- `probe-percent-baseline.mjs`: `0b4c020282b15caa8341c8d35e3e9c2e213718700b4480d6df40b00db058dd4f`

검토한 새 제품 SHA-256:

- `percentComparison.ts`: `ab92983a4cd0734194481057f469ee1ac5dac259097033dd3f81a9b1fa638884`
- `percentComparisonActions.ts`: `49cb9659000720ef91c0f9a8436367407a8bb9cb48989150a55aae0cf2141099`
- `PercentComparisonPanel.tsx`: `bc1652c4e1c41563edad9b7838c714767c51734f8001fc9f9541ff36d2174d76`
- `PercentCopyRecovery.tsx`: `46e3bb5b1ed44a8f3bfea42ac23bb86a8d9ad127497877a694102464d863e36c`

제품 TS/canonical/원본 baseline 변경 0. Chrome·전체 타입 검사·빌드·배포·커밋 실행 0.
