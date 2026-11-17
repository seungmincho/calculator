# 34차 숫자 한글 변환 독립 검토

2026-11-17. 작성자 final ready 뒤 실제 부모·Batch와 순수 입력 경계를 별도 검사했다. **독립8그룹 PASS, 재현 가능한 제품 결함/수정 요청 없음.** 제품/검사 TS는 수정하지 않았으며 Chrome·전체 tsc·build·배포·git을 실행하지 않았다. 독립 JS scoped lint는 exit0(오류·경고0)이다.

```powershell
node docs/verify/2026-11-17-repeat-batch34/check-number-independent.mjs
npx eslint docs/verify/2026-11-17-repeat-batch34/check-number-independent.mjs
```

작성자의 `check-number-parent.mjs` assertion/fixture는 실행하거나 복제하지 않았다. 기존 범용 `team-parent-harness.mjs`의 hook/effect/host 경계만 사용해 실제 NumberToKorean/NumberToKoreanBatch를 각각 번들하고 실제 props로 연결했다. 자기 microtask/타이머·native Clipboard·legacy DOM·Blob URL 포트, 명시 기대값과 독립 CSV/TSV reader를 만들었다. 새로운 제품 파일은 없다.

## 별도 확인한8그룹

1. **순수20자리/음수 quick**: 알려진20자리 수3개의 한글 읽기 문자열을 직접 명시하고,1~20자리 quick 결과를 BigInt의 산술 결과와 비교했다. 20자리 overflow를 잘라 적용하지 않으며, 기존 음수는0에서 빠른 금액을 더하는 의미와 소수·한글 원문 blur 보존을 확인했다. 기존 parser의 안전 정수 밖 한글 역변환을 새 기능으로 확장했다고 주장하지 않는다.
2. **실제 초기 URL와 early edit**: 없는 n/빈 n=/무효/leading zero/20자리 링크가 첫 render의 고정 예시 뒤 한 번 복원되고 읽기만으로 replace하지 않는다. 첫 복원 microtask 전에 입력한 `-1234.`가 링크의777로 덮이지 않는다. 중복 campaign query·hash·history.state identity와 명시 clear→n=→새 방문 빈값을 확인했다.
3. **실제 raw·IME**: 중간 삽입/삭제 형태 원문, 미완성 음수·소수·긴 소수부가 onChange에서 강제 재서식되지 않는다. composition blur→end→trailing input 순서에서 이전0ms callback은 무효이며 최신 callback만 comma 정리한다. 다음 composition 동안 quick/clear/copy와 URL 변경을 막고 재focus 뒤 과거 normalization도 입력을 바꾸지 않는다.
4. **실제 단일 결과**: `10000000000000000001`의 실제 reading copy는 `천경일`, 20자리 overflow quick은 no-op, 음수 quick은 기존 양수 금액으로 시작한다. hydration 전에 진행 중인 한글 조합과 원문을 유지한다.
5. **아홉 복사 대상의 전역 경합**: formal/mobile/contract/chinese/mixed/reading/english/link/batch 각각을 오래 대기시킨 뒤 다음 대상을 완료했다. 옛 resolve/reject는 최신 성공을 바꾸지 않고, 옛 거부의 legacy fallback은0회다. 이전2초 성공 timer를 강제로 실행해도 새로운 링크 성공을 지우지 않는다. 단일↔batch 양방향을 포함한다.
6. **편집·옵션·언어·복구 token**: raw/prefix/spacing/batch 입력/locale+실제 번역 변경 후 옛 거부가 안내나 복구 텍스트를 되살리지 않는다. 링크 실패의 전체 복구 텍스트는 현재값5678이며, legacy true retry 후 이전 recovery.close는 최신 성공을 닫지 않는다.
7. **실제 CSV/TSV 반출**: 100개 물리행+끝CRLF를 actual Batch에 넣고 실제 copy 문자열과 CSV Blob 바이트를 별도 state-machine reader로 파싱했다. BOM/파일명/7열/빈줄 번호 간격·99개 비어있지 않은 행·20자리 정확 문자열·음수·따옴표·수식 시작 라벨·잘못된 다중탭 오류행 원문을 대조했다. 일괄 입력/반출은 단일 숫자와 URL을 바꾸지 않는다.
8. **StrictMode/실제 cleanup 경계**: 부모/Batch의 setup-cleanup-setup replay 뒤 새 Clipboard controller가 정상 동작한다. 실제 cleanup 뒤의 옛 요청 거부는 fallback을 하지 않는다.

## 범위와 한계

이 결과는 기존 계산식을 새로 인증한 전체 수학 증명이나 실제 기기 IME 검증이 아니다. 실제 부모 로직·입출력 문자열·Blob·작업 소유권을 확인했고, 브라우저의 selectionStart/End, native 포커스/권한,320px 배치는 지정 native 담당이 검증한다. UI 원문이 유지되는 것을 실제 caret 이동이 없다는 증거로 바꾸어 말하지 않는다.

새 복사 controller는 요청을 무효화할 수 있지만 OS에 이미 전달한 Clipboard 쓰기 자체를 되돌릴 수 없다는 한계가 유지된다. URL 무효 원문은 결과를 만들지 않으며, 기존 batch는 행300자 초과 오류행 반출과 전체100행/30,000자 한도 초과 전체 차단을 구분한다. 이번 독립에서는 별도 제품 수정이 필요하지 않았다.
