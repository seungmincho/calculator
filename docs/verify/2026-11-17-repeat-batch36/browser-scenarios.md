# 36차 DutchPay 실제 브라우저 검증 준비

부모 연결 중인 준비 문서다. 제품 final ready·canonical 통합 전 Chrome을 시작하지 않으며 PASS를 선기록하지 않는다. 기존3039·한 Chrome·격리 context·외부 요청/service worker 차단을 유지한다. 계좌는 합성 식별자만 사용하고 원문을 로그·증거 JSON·캡처에 남기지 않는다. 전체 타입은 통합 담당 소유다.

1. **정상 legacy10·URL 우선:** 기존 v1 tuple을 독립 생성해 최근10개와 계좌 JSON 문자열을 seed한다. 초기 읽기0쓰기·URL/과거 total/people 입력 우선·최근 목록 자동 적용0. 명시 load/save/delete·동일 d 갱신/최근10 제한과 재방문, 삭제가 현재폼을 바꾸지 않는지 확인한다.
2. **손상/손실 원본 보호:** recent null JSON/미래 d/101항목 encoded record와 account 잘못된 타입을 별도 context로 확인한다. 해당 key raw bytes 보존·쓰기에만 제한·반대 key/현재 계산/복사는 유지. 실제 UI로100항목 정상 정산에1개 추가한101개 폼은 저장을 거부하고 현재101개를 유지한다. 관대한 기존 URL decoder의100개 제한을 새 손실 없는 저장 지원으로 오인하지 않는다.
3. **Storage 실패/확인 불가:** native Storage setItem만 quota로 거부하거나 첫 읽기/쓰기 후 readback만 차단한다. 확정 목록/현재폼·메모리 계좌를 유지하고 성공 표시0. readback unknown은 실제 native 저장이 일어났을 수 있으므로 rollback0·명시 재조회/재시도로 수렴하는지 확인한다.
4. **두 탭 native Web Locks/CAS:** 같은 context 두 실제 탭으로 storage event와 대기 lock을 확인한다. 한 탭 외부 변경 후 다른 탭 저장/삭제가 원본을 덮지 않고 재조회가 폼을 자동 교체하지 않음. 실제 native lock 대기 중 계좌 A→B/현재폼 편집·취소·이탈을 제어해 옛 쓰기/안내0, 최신 입력만 반영한다. WebLocks 미지원 모델의 한계는 별도 명시한다.
5. **ro·계좌 개인정보 경계:** 합성 계좌는 편집 공지/명시 공유 text에는 포함되지만 d·recent·ro 공지/DOM에는 없다. ro 링크 새 탭에서 저장/계좌 입력 숨김, 명시 복사해서 수정 뒤만 편집 UI 노출. 저장 실패 때도 메모리 공지에 사용할 수 있다는 실제 상태를 확인하며 계좌 원문을 증거 파일에 쓰지 않는다.
6. **native 복사·복구:** 금액은 구분자 없는 정수, 공지/보기 전용 링크는 현재내용. native Clipboard 실제 성공, reject/부재+legacy false/throw·true 모델, 전체선택/선택 실패/재시도/닫기 focus. 복사 성공과 기록 저장 성공을 구분한다.
7. **교차 copy·A→B→A:** 금액/공지/링크/ShareResult 교차 요청 뒤 옛 거부 fallback0, 정산·계좌·locale 왕복에서 옛 성공/복구가 부활하지 않음. 과거2초 timer·실제 SPA unmount 후 callback도 확인한다.
8. **320px 다크 KO/EN:** 저장·재조회·복구 안내, 입력16px·조작44px·overflow0, 언어 변경 현재폼 유지. 민감 필드를 비운 합성 상태로 캡처하고 JS/hydration/unhandled/raw key를 수집한다.

실제 localStorage·두 탭 Web Locks·Clipboard와 실패 주입 포트를 분리한다. 제어 포트 자체를 실제 quota/브라우저 설정의 전수 보장으로 표현하지 않는다. 원래 정산의 자동 d URL 반영을 비저장·비공유라고 설명하지 않는다.
