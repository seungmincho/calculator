# 54차 native 검증 계획

Chrome 한 개·기존 localhost3039·격리 저장소·합성 원고를 사용한다. 외부 요청·Service Worker는 차단한다. 실제 키보드/DOM 포커스/클립보드와 합성 composition·clock/timer 포트를 구분하며 실제 모바일 한글 입력기 시험을 주장하지 않는다.

1. 실제 영어 오타→고침→완료 뒤 후보·명시 복습·정확한 구간 완료. 원 결과·초안·기록 bytes와 URL 보존.
2. 공백 오류 문맥·반복 단어의 다른 위치·21개 이상 후보 페이지·1자 구간·선택과 시작 분리.
3. 기본 daily/short/long/time의 기존 완료1회·복습 저장0·원 결과 유지. 시간제는 제어 clock 사용.
4. 시간제에서 미입력 suffix·아직 조합 중 문자열 제외, 확정된 오류만 후보.
5. 합성 한글 IME 끝/중복/자모 prefix·Enter/Escape229·native paste/drop 차단.
6. 원고 적용/모드 이탈/새 origin/옛 interval·입력·focus callback 무효화, 동시200ms 타이머 최대1, locale·초안 보존.
7. 320px 다크 KO/EN 입력16px·44px·선택/시작/재시도 DOM focus, 원 결과 요약 복사에 원고/복습 내용 없음.

제품 계산/통계 함수는 기대값 oracle로 가져오지 않는다. 부모/공용 ready 뒤에만 실행하며 실패를 제품 또는 fixture 문제로 재현·분리한다.
