# 44차 준비 — root 독립 core 검토

상태: root 독립6그룹 PASS. 부모 미연결 준비를 검토한 결과이며 native·부모 완료를 뜻하지 않는다. 작성자14/BigInt88,664 검사를 재실행하거나 독립 집계에 포함하지 않았다.

`check-running-independent.mjs`는 별도 기대값으로 다음5그룹을 처음 통과했다.

1. 모든 짝수2..500km의 중간 지점과 서로 다른 정수 목표 시간5개에서 반초 반올림을 확인했다. 추가 하프/풀/소수4자리123.4567km의 모든 구간은 BigInt 몫·나머지로 만든 별도 시계와 대조했다. 총1,439개 시계 표본이다.
2. public 비정수 거리/목표초/pace와 큰 시간의 원래 수치 정밀도를 유지한다. 단일계산에서 유효한833시간 또는1초 미만 결과를 비교 목표의1..359999초로 몰래 바꾸지 않는다.
3. 비어 있는 목표는 위치를 유지하고 전체 snapshot을 막는다. 유효 두 목표의 차이·동률0·최단 flags, 저장한 snapshot과 이후 draft 편집의 참조 분리를 확인했다.
4. URL의 외부 중복query/hash 보존·숫자 왕복·invalid owned key 제거·중복/미래version 거부·초기 partial seconds 편집과 untouched 복원 필드를 확인했다.
5. 500구간×목표3개의 TSV 전체18열을 별도 수치와 대조했다. CSV BOM1개·쉼표/따옴표 헤더·formula 시작문자 보호를 확인했다.

여섯째는 실제 `copyRunningText`의 native fallback을 제어 DOM으로 실행했다. input focus가 output 소유권을 무효화한 뒤에도 원래 구현이 legacy execCommand1회와 옛 focus 복원을 실행했다. 결과 문자열만 stale였으며 **native Chrome 재현은 아니다**. `--record-copy-boundary` 최초 증거를 `copy-before-fix.json`에 보존했다.

작성자는 미연결 helper의 중복 legacy 구현을 공용 `copyShareResultLink`로 교체했다. `--copy-only`로 해당 경계만 다시 실행해 stale/exec0 PASS를 확인했다. 독립 기대값은 유지했고 실행 필터만 root가 추가했다. 이미 통과한 첫5그룹은 반복하지 않았다. 작성자 별도 actions2도 통과했으며 중복 집계하지 않는다.

독립 검사 MJS lint 오류0·경고0. 실제 부모/인쇄/Clipboard/320 KOEN은 후속 검증이며 core 결과로 대신하지 않는다.
