# 49차 미연결 순수 준비

상태: 이 문서는 **부모 연결 전 순수 준비8그룹 PASS·2파일 scoped lint0**의 기록이다. 이후 root 신호로 부모/child 연결까지 완료했으며 최신 author15그룹·회귀10·lint6파일0 및 TS freeze는 `implementation.md`를 따른다. 아래 순수 API는 부모 연결 중 변경하지 않았다.

API: `createMenuRoundExclusions(source, unavailable?)`, `updateMenuRoundContext(state, source, unavailable?, forceReset?)`, `excludeMenuRoundName/restoreMenuRoundName/restoreAllMenuRoundNames`는 expected revision을 받는다. immutable source/eligible/items는 원본 index와 정확한 value를 보존한다. 이름은 trim 동등성만 사용하며 같은 메뉴의 모든 줄을 제외·복구한다. 남은 회전 항목 2개 미만은 minimum 오류, 오래된 revision은 stale, 반복/no-op는 상태 참조까지 유지한다.

`eligible`는 기존 식사 필터만 적용한 후보로서 주간 계획의 기존 의미를 보존하는 연결 지점이다. `items`만 이번 룰렛에 사용한다. 후보 원본/실효 식사 후보의 값·순서가 바뀌면 임시 제외를 해제한다. 명시 프리셋은 forceReset으로 같은 값도 새 revision으로 만든다. 관계없는 식사 필터 변경은 현재 제외를 초기화하지 않는다.

기존 식사 필터는 `item.trim()`을 **저장된 식사 이름 원문**과 비교한다. 유효 legacy 기록에는 앞뒤 공백도 가능하므로 unavailable 이름을 새로 trim하지 않는다. 이 정확한 호환 경계도 검사했다. 임시 제외 이름끼리는 제안대로 trim 동등성만 사용한다.

`createMenuSpinGuard`는 callback 권한만 소유하며 타이머/난수/캔버스를 만들지 않는다. begin은 1개 active run만 허용하고 finish는 1번만 소비한다. 객체 identity+context로 과거/복제 token을 차단한다. 부모 연결 시 후보 문맥 변경·이탈에서 invalidate/dispose하고 실제 RAF는 기존 취소 포트를 함께 사용한다. Strict 재설정 activate는 옛 token을 되살리지 않는다.

`node scripts/check-menu-round-exclusions.ts`의 8개 의미 그룹이 통과했다: 중복/원본index·불변성, 2개하한, trim/Unicode/긴 원문, stale/no-op, 후보 문맥 초기화, 식사 필터/계획 의미, spin 경합/ABA, dispose/Strict. 마지막 legacy 공백 호환 보완 뒤 8그룹과 2파일 lint를 다시 확인했다. 실제 부모/URL/키보드·모바일·RAF/Clipboard 검증은 연결 후 별도이며 아직 실행 완료로 주장하지 않는다. UI child와 번역 조각은 이번 빠른 pure 준비에 포함하지 않았다.
