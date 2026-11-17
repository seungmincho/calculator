# 공용 공유 버튼 — 수정 전 재현

2026-11-17 KST. root가 실제 `ShareResult.tsx`를 번들해 hooks/DOM·renderer·Clipboard/native share I/O만 제어했다. 제품을 수정하지 않았으며 실제 PNG나 OS 공유창 검증이 아니다.

소스 SHA-256: `3EEBE2C8ABB2226208C25F9087AD5F1343D7DE15ACB1135162FB465DEC2B782F`.

`node docs/verify/2026-11-17-repeat-batch38/check-share-result-baseline.mjs`로 아래4개 결함을 재현했다. 이 명령의 성공은 결함 재현 성공이며 제품 PASS가 아니다.

| 실제 부모 이벤트 | 현재 결과 | 수정 후 기대 |
| --- | --- | --- |
| 이미지 저장 클릭 → 결과100→200 편집 → 이전 render resolve | 이전 파일 click1회 | click0·URL0 |
| 이미지 저장 클릭 → cleanup → 이전 render resolve | 언마운트 후 click1회 | click0·URL0 |
| 공유 클릭 → 결과/URL100→200 변경 → 이전 render resolve | 이전 문구 `처음 결과` + 새 링크 `value=200` 공유1회 | 오래된 요청 공유0 |
| 링크 복사 클릭 → 결과 변경 → 이전 Clipboard reject | 이전 링크의 자동 legacy fallback1회 | fallback0 |

같은 원문·버튼·이벤트와 `--after` 모드의 반대 기대값을 준비했다. 실제 수정 뒤 이 동일 흐름으로 회귀를 확인하고, 새로 들어갈 수동 복구·실패 안내·같은 의미 props·Strict replay 등은 별도 검사한다. 테스트가 대신 제품을 수정하거나 이후 구현에 맞춰 재현 절차를 바꾸지 않는다.
