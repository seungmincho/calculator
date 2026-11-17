# 58차 OCR 복사 복구 — 미연결 자식 독립 검토

후속 실제 부모 연결 독립7그룹 결과는 `independent-parent-review.md`에 분리 기록했다. 아래 미연결 부모 해시는 준비 검토 당시 근거이며 현재 부모가 미연결이라는 뜻이 아니다.

상태: **실제 미연결 자식4 + 후속 TXT helper2 = 독립6그룹 첫 실행 PASS, 제품 수정 요청 없음.** 작성자7그룹과 구분한다. 부모 `ImageOcr`는 자식 검토 시점에 baseline SHA 그대로였으며 이 결과를 복사 결함 해결·부모 출력 소유권·native 클립보드 통과로 세지 않는다.

```text
node docs/verify/2026-11-17-repeat-batch58/independent-copy-recovery.mjs
npx eslint docs/verify/2026-11-17-repeat-batch58/independent-copy-recovery.mjs
```

실제 `OcrCopyRecovery.tsx`를 공용29 host로 직접 실행했다. 작성자 fixture/assertion은 사용하지 않았고 focus/select/setSelectionRange 및 부모 `isCurrent` 콜백만 제어했다. 테스트는 부모 발급 실패 객체의 identity와 현재성 계약을 따른다.

| 그룹 | 독립 확인 | 결과 |
| --- | --- | --- |
| 1 | BOM·한글·emoji·CRLF·탭·HTML처럼 보이는 문자·NBSP·결합문자가 포함된216,003 UTF-16단위 전체 원문. 확장 전 textarea0, 명시 확장 뒤 readonly exact value·자동focus0, KO/EN 전환 뒤 exact value 유지. 전체 선택의 끝 offset은 실제 `text.length`, storage/output 호출0 | PASS |
| 2 | text/label이 같아도 새 failure 객체이면 다시 접힌 상태. 이전 expand/select/retry/close는 새 객체에 영향0. 세 번째 동일내용 객체와 부모 lifetime 종료 뒤 old handler도 무효이며 retry/close는 현재 객체만 전달 | PASS |
| 3 | focus/select/range 각 단계에서 부모 현재성이 사라지는 재진입과 예외를 주입. 다음 DOM 단계는 실행하지 않고 오래된 실패 안내도 붙이지 않는다. 이후 새 원고의 정상 전체 선택은 가능 | PASS |
| 4 | ref 없음·selection range 예외는 직접 선택 안내를 노출하고 다음 정상 선택은 해제. 새 빈 원문은 exact empty textarea와 명시 안내, 선택 비활성으로 표시하며 retry는 빈 객체 자체를 부모에 전달 | PASS |

child의 locale 변경 자체는 내용을 바꾸지 않는다는 범위만 확인했다. 실제 부모는 locale·원고·출력 요청 변경에 따라 `isCurrent`와 failure 객체를 무효화해야 하며 그 연결은57 final 뒤 별도 검증한다. 이 자식은 부모의 동의 없이 성공/복사/저장/이동을 수행하지 않는다.

실행 중 제품 결함·fixture 실패는 없었다. 진행 메시지에서 원문 길이를 수기로 잘못 추정했다가216,003으로 정정했으며 실제 assertion은 처음부터 원문 `text.length`와 전체 value를 비교했다. 성능·DOM 메모리 한도·OS 선택 API의 native 성공을 인증한 검사는 아니다.

검토 해시:

- `src/components/OcrCopyRecovery.tsx`: `49c3a5e25579ec910a0199f34b149edf67c93ae8c6fe0b8afd089b36b3d36626`
- 당시 미연결 `src/components/ImageOcr.tsx`: `f5bbcd6a74d8d225a31b950c7fdb5daada39f76c59b7aebf00e412e0328a3b54`

검사 전후 두 해시 동일 assertion 통과. 제품/canonical/공용 host/원본 baseline 수정0, 실제 모델·사진·클립보드·Chrome·전체 타입·빌드 실행0.

scoped lint: 새 독립 MJS 1파일 **exit0, 오류0·경고0**.

## 후속 TXT helper만의 추가 확인

root가 미연결 `downloadOcrText`를 안정화한 뒤 `independent-ocr-download.mjs`로 별도2그룹을 확인했다. 자식4그룹은 다시 실행하지 않았다.

```text
node docs/verify/2026-11-17-repeat-batch58/independent-ocr-download.mjs
npx eslint docs/verify/2026-11-17-repeat-batch58/independent-ocr-download.mjs
```

1. BOM·한글·emoji·CRLF·탭·NBSP·결합문자 원문을 TextEncoder의 독립 UTF-8 byte 배열과 비교했다. 파일명 `ocr-result.txt`·MIME 일치, 두 요청의 이전1000ms callback은 자기URL만 해제한다. append 재진입으로 stale이 되면click0·즉시해제, click 자체에서 stale이 되면 이미 dispatch된1회를 취소했다고 주장하지 않고 delayed cleanup을 유지한다.
2. createElement/createObjectURL/href/download/append/click 각각의 실패와 remove/setTimeout/revoke의 정리 실패를 주입했다. 실제 dispatch 전 실패는 failed(현재성 상실은 stale), dispatch 뒤 정리 실패는 started를 유지한다. 모든 생성 URL은 자기 경로에서 정리하며 최초 stale/빈text는 DOM/URL호출0이다.

실제 부모/TXT 버튼 연결이나 브라우저 저장 완료를 검증한 결과가 아니다. 실제 helper와 합성 DOM/URL/timer만 실행했다. package 변경 없이 Node TS import 재해석 안내 뒤 exit0이었다. helper SHA는 `39597bab2781a6249a37f49cf358b5c3fa9bd87d625a5d9ef2018f5b38ff4583`이다.

후속 helper MJS lint: **exit0, 오류0·경고0**. 준비 독립2개 MJS 모두 scoped lint를 통과했다.
