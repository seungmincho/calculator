# 43차 단위 변환 — 독립 부모 검토

2026-11-17 KST. 작성자의 최종 안정 제품을 대상으로 실제 `UnitConverter`, `UnitBatchConverter`, `ShareResult`, `UnitCopyRecovery` 코드의 효과와 이벤트를 실행했다. **독립 8그룹 PASS, 재현된 제품 결함 없음. 제품 파일 수정 없음.**

검사: `node docs/verify/2026-11-17-repeat-batch43/independent-parent-check.mjs`

범위 lint: `npx eslint docs/verify/2026-11-17-repeat-batch43/independent-parent-check.mjs` — exit 0, 오류·경고 0.

작성자의 assertion과 검사 실행은 재사용하지 않았다. 기존 29차의 범용 hook/event host만 재사용했으며, 독립 입력·기대값·CSV/TSV scanner를 작성했다. root의 core 10그룹, 다른 검토자의 core 7그룹, 작성자의 19그룹은 이 8그룹과 별도로 집계한다.

## 확인한 경계

1. hydration 전 기본 입력·URL 쓰기 0 → 온도 -40°C/-40°F URL 복원, 무관 중복 query·hash·`history.state` 보존. 초기 사용자 편집은 URL의 이전 값에 덮이지 않는다.
2. 일괄 패널을 접고 열어도 실제 자식 인스턴스·원문·결과가 유지된다. 일괄 편집/실행은 단일 URL, 최근 8개, 기존 즐겨찾기 원본 bytes를 바꾸지 않는다.
3. 즐겨찾기 load 및 swap은 기존 단일 입력 동작을 유지한다. m→cm에서 rem→px로 조합을 바꿔도 이전 일괄 결과는 명시 실행 전까지 원래 값을 반출하며, 다시 실행하면 rem 기준 18과 정밀도 6을 실제 자식에서 적용한다.
4. 1,000물리행을 별도 scanner로 CSV/TSV 전체 대조했다. 미리보기는 200행, 전체 파일은 헤더 포함 1,001행·8열이다. 빈 행/잘못된 숫자/탭 입력의 순서와 원문, 음수/0/양수의 m→cm 결과, UTF-8 BOM, 이름을 확인했다. 실행 뒤 원문을 바꿔도 저장된 결과 전체가 유지된다.
5. 단일 복사·단위 행 복사·일괄 복사·실제 ShareResult 링크 복사의 서로 다른 방향 12조합에서, 최신 복사 뒤 오래된 native 거부는 fallback이나 옛 복구 UI를 실행하지 않는다.
6. 실제 ShareResult의 PNG 렌더 대기 중 CSV 다운로드 또는 일괄 원문 편집이 있으면 늦은 PNG 다운로드를 막는다. 이후 새 PNG는 정상 다운로드되고 Object URL은 중복 없이 회수된다.
7. 입력 A→B→A, locale KO→EN→KO, 이전 성공 타이머에서 성공/실패 안내가 부활하지 않는다. 전체 TSV 복구 문자열·선택 실패 안내·명시 재시도와 오래된 닫기 콜백이 최신 복사 상태를 지우지 않는 경계를 확인했다.
8. 전통 단위 요약에서는 쌍이 없어 일괄 실행이 차단되고, 기존 행을 선택하면 복귀한다. Strict 효과 재실행 뒤 언마운트하면 대기 중 native 복사/PNG 완료의 fallback·다운로드가 발생하지 않는다.

## 근거의 한계

Clipboard, DOM anchor, 이미지 renderer는 제어 포트이며 컴포넌트 및 공유 controller는 실제 제품 코드다. wrapper capture는 브라우저 전파를 대신하여 실제 capture 핸들러를 먼저 호출했다. PNG 픽셀/네이티브 Clipboard/실제 다운로드·모바일 레이아웃·브라우저 렌더 배치는 이 검사의 통과 주장에 포함하지 않는다. 해당 실제 브라우저 근거는 전담 verifier 보고서에서 별도로 확인한다.

즐겨찾기 UI 자체 저장 로직은 변경되지 않은 별도 컴포넌트다. 이번 검사는 부모에 전달되는 실제 조합 load 계약과 기존 저장 bytes 보존을 확인했으며, 즐겨찾기의 모든 CRUD를 재검사했다고 주장하지 않는다.

Chrome·전체 tsc·빌드·배포·커밋은 실행하지 않았다. 44차 준비 제품 TS도 계속 고정했다.
