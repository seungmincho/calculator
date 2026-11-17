# 44차 러닝 페이스 실제 부모 독립 검토

상태: 독립 7그룹 PASS, 재현된 추가 제품 결함 없음. 제품 TS는 수정하지 않았다. 작성자 검사 22그룹과 root core 6그룹을 다시 실행하거나 독립 집계에 넣지 않았다.

## 검사 방법

`independent-parent-check.mjs`가 `running-parent-harness.mjs`의 훅·이벤트·I/O 포트만 재사용한다. 작성자 assertion은 가져오지 않는다. 실제 `RunningPaceCalculator`, `RunningPaceComparison`, `RunningPacePrint`, `ShareResult`와 제품 유틸을 실행한다. 부모의 자식 props를 실제 자식 호스트에 전달하며, Clipboard Promise·RAF·인쇄·다운로드 DOM 포트만 제어한다.

URL fixture는 숫자 JSON을 직접 구성했다. 출력 검증은 제품 직렬화/포맷 함수를 oracle로 호출하지 않고 별도 구분자 parser와 시계 표기를 사용했다. 계산 core의 반올림 표본은 이미 root가 검증했으므로 이 검사는 전체 값이 실제 부모의 반출 경로에 도달하는지에 집중했다.

## 통과한 7그룹

1. **초기 URL과 편집 우선권:** hydration 전 분 입력/목표 추가가 해당 필드만 덮고, 나머지 거리·시·초는 URL에서 복원된다. Strict effect replay 후에도 초기 기본 URL 쓰기 0회, 중복 외부 query·hash·history.state 보존. 불완전 목표를 만든 뒤 hash만 이동하면 행 ID와 빈 입력이 유지되고, 다른 query 이동은 새 상태를 복원한다.
2. **잘못된 주소와 URL 쓰기 실패:** 손상된 `rp` 원문을 그대로 두고 기본 결과를 공유하지 않는다. 명시 편집으로 정상 복귀한다. replaceState가 거부되어도 현재 입력과 계산 복사는 유지하면서 링크만 차단한다. 초기 빈 입력은 손상 URL보다 우선하며 오래된 owned query를 제거한다.
3. **기존 단일 계산과 목표 독립성:** 기본 10km/50분의 복사 값, pace→time의 42분50초 변환, 거리 변경을 확인했다. 동일 시간의 두 목표가 다른 ID를 유지하며 한 행만 수정된다. 이전 목표 배열 참조가 변하지 않는다. 불완전 세 번째 목표는 전체 비교 반출을 막으며, 단일 입력이 불완전해도 남은 유효 비교 CSV는 가능하다.
4. **500행 반출과 스냅샷:** 화면을 마지막 10페이지로 옮긴 뒤 TSV와 실제 UTF-8 BOM Blob CSV의 501행·18열을 전부 대조했다. 500km와 목표 50,000/75,000/100,000초를 사용해 각 행의 100/150/200초 누적값을 별도로 확인했다. 실제 print 자식의 500행과 모든 시계를 대조했고, 이후 목표 편집이 기존 Blob·복사 문자열·인쇄 snapshot을 바꾸지 않았다.
5. **복사·공용 공유의 양방향 경합:** 비교 TSV→공용 링크→단일 결과 복사를 번갈아 시작하고 이전 native 거절을 늦게 전달했다. 오래된 legacy fallback 0회. 실패 복구의 옛 retry/close도 새 공용 공유를 덮지 않는다. 입력 A→B→A 및 EN 선택 중 KO fallback→실제 EN→KO 전환에 이전 안내가 부활하지 않는다.
6. **인쇄 취소·오류 복구:** 목표 편집/원상 복구, 언어 왕복, 공용 링크 복사로 취소한 RAF를 강제로 호출해도 print 0회다. 옛 callback 여러 개는 새 인쇄 작업도 건드리지 않는다. 현재 작업은 25행 인쇄 후 afterprint로 정리된다. print 오류 안내 뒤 재시도도 정상이다.
7. **Strict replay와 이탈:** replay 뒤 정상 CSV 생성·복사가 가능하다. 이탈 후 native 거절, 이미지 완료, print callback, 캡처한 옛 copy/CSV handler를 실행해도 새 복사·다운로드·인쇄가 없다. 보유 Blob URL은 각 1회만 회수된다.

## 실행과 한계

```text
node docs/verify/2026-11-17-repeat-batch44/independent-parent-check.mjs
RunningPace independent actual parent: 7 groups passed
```

첫 실행에서 7그룹 모두 통과했다. 실제 브라우저 Clipboard, OS 인쇄 대화상자, CSS pagination·320px 배치와 lazy EN 네트워크는 이 호스트가 증명하지 않는다. 언어와 출력 문자열 변경은 실제 컴포넌트에 주입했고 네트워크는 실행하지 않았다. 해당 native 범위는 전담 브라우저 검증 결과로 구분한다. 빌드·전체 타입 검사·Chrome·공개 RPC는 실행하지 않았다.

`npx eslint docs/verify/2026-11-17-repeat-batch44/independent-parent-check.mjs`는 exit 0, 오류 0·경고 0이다.
