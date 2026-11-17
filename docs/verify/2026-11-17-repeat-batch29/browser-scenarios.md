# 29차 팀 이력·반출 브라우저 계획

27차 체크포인트 뒤 부모 final ready·공용 번역 생성 후 아래7흐름을 실행했다. 최종7/7 PASS·Chrome 종료이며 실제 범위와 제어 fixture 구분은 `review-browser.md`에 기록했다. 아래는 최초 계획이므로 세부 항목 전체를 별도 실행했다고 중복 집계하지 않는다.

1. **실제 이동/교환/고정·undo/redo·focus**: 카드 dragTo와 터치식 선택→팀 이동으로 변경한 확정 보드를 캡처한다. 고정·회전 메타를 포함해 undo/redo가 같은 snapshot을 복원하고 재추첨/공개 animation을 하지 않음을 확인한다. Tab/Enter/Space로 이력 버튼을 조작하고 한쪽 이력이 소진되면 가능한 반대 버튼에 초점이 남는지 확인한다.
2. **20이력·no-op·분기·범위 밖 설정**: 의미 있는 lock toggle 등21회 이상으로 실제20전이 한도를 확인한다. undo 후 동일팀 drop/실제 변경 없는 조작은 redo를 유지하고, 다른 보드 변경은 future를 버린다. current skill/다음 편성 방식은 history 밖에 남아 undo/redo 뒤 유지된다. 결과 방식은 다음 선택 모드와 혼동하지 않는다.
3. **초기화·참석·공유·명단**: 참석 변경/팀 수/명단 수정/저장 명단 명시 불러오기가 과거/future를 초기화한다. 저장·백업 자체는 현재 보드를 바꾸지 않는다. 공유 URL 실제 새 방문은 완성 보드 seed라 빈 보드로 undo하지 않는다. 불참자는 편성/반출에서 제외되지만 저장 명단은 전체 인원을 보존한다.
4. **captain·공개 세대·옛 callback**: 주장 진행 중 history 버튼/handler가 차단되고 완료는 새 seed다. 취소/새 시작은 과거/future를 지운다. 실제80ms reveal interval의 이전 callback을 캡처해 새 보드 시작 뒤 재호출하더라도 새 timer/결과를 바꾸지 않는지 확인한다. 공개 완료/skip 뒤 undo/redo는 즉시 모든 카드를 보인다. 제어 callback과 실제 UI 이벤트를 보고서에서 구분한다.
5. **native 복사·실제 TXT·개인정보**: random/balanced의 실제 현재 팀·현재 skill로 독립 문자열 oracle를 만들고 native Clipboard/UTF-8 noBOM TXT bytes를 비교한다. 파일명은 고정 team-divider.txt이고 이름이 새 URL/저장/네트워크/콘솔로 추가되지 않는다. 기존 명시 공유 링크의 이름 포함 정책은 별도다.
6. **복사 false·수동 선택·세대**: API거부/없음+legacyfalse는 성공 표시 없이 현재 전체 text 수동 복구를 제공한다. native/legacytrue 재시도, 선택/닫기, pending 중 보드 변경·undo/redo·skill·locale·명단reset·이탈의 old fallback/성공timer0을 확인한다. 단순 새 이름/명단 제목 초안은 확정 보드가 같으면 복사 snapshot을 무효화하지 않아야 한다.
7. **320px KO/EN·키보드**: 다크320px 실제 이동/이력 버튼/복구/반출/팀 요약·현재 이름 보존·16px 입력/44px 주요 조작·overflow를 확인한다. 이름 input의 native Ctrl+Z와 composition 이벤트를 가로채지 않는지 확인하되 실제 OS IME 검증이라고 주장하지 않는다. 원시 키·JS/hydration·사용자 데이터 외부 전송0.

public RPC/외부 요청은 모두 차단하며 별도 실제 서비스 쓰기를 하지 않는다. 저장 키는 합성 컨텍스트에서만 사용한다. 새 알고리즘·전체 분배 회귀를 반복 구현하지 않고 기존19/26 등의 무관 도구는 재검사하지 않는다. 제품 결함을 작성자에게 전달하고 수정 영향 사례만 재실행한다. 마지막 Chrome 종료 후 통합 담당에게 전체 타입 검사 가능 신호를 보낸다.
