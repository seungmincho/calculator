# 팀 편성 이력·반출 독립 검토

2026-11-17 KST. root가 제품 작성자와 별도로 순수 모듈을 읽고 [독립 검사](check-team-history-independent.mjs)를 작성·실행했다. **순수6그룹 PASS·해당 JS lint exit0**, 순수 단계의 재현 결함0. 부모 연결과 실제 브라우저는 아직 별도 검증 전이다.

- 제품의 past/future 구현을 복사하지 않는 단일 선형 timeline+cursor 모델과2,000회 결정적 편집/undo/redo/no-op을 대조했다.20전이 상한·분기·과거/현재/미래 순서가 일치했다.
- 원본 수정과 frozen snapshot 쓰기, 특수 이름의 own-key 능력치, 회전 메타·고정 집합 순서만 다른 no-op과 redo 보존을 확인했다.
- 숫자 timer ID0을 다음 세대에서 재사용하는 상황에서도 이전 callback이 새 공개를 종료하거나 timer를 회수하지 못했다.
- 실제 비동기 Promise의 역순 성공/거절에서 이전 fallback을 실행하지 않았고 새 복사 요청을 유지했다. truthy 값을 true 성공으로 잘못 표시하지 않았다.
- balanced 텍스트는 별도의 고정 기대 문자열과 비교했다. 클릭 이후 원본/능력치를 바꿔도 TXT snapshot이 유지되며 실제 Blob UTF-8 바이트·BOM 없음·고정 파일명이 일치했다.
- 다운로드 전/URL 생성 직후 세대 변경과 dispose/지연 callback에서 오래된 저장0회, URL 회수 정확1회를 확인했다.

Node24의 type-less package ESM 재해석 경고1개가 있었으며 검사 실패나 제품 브라우저 경고를 뜻하지 않는다. 이 경고를 없애려고 프로젝트 package type을 바꾸지 않았다. 부모 이벤트·drag/focus·브라우저 Clipboard/다운로드·모바일 결과는 해당 검증 후 이 문서에 별도로 기록한다.

부모 읽기에서는 mount effect cleanup의 `epochRef.current++`가 StrictMode setup→cleanup→setup 후 state `boardEpoch`와 불일치하는 경계를 작성자에게 전달했다. 작성자는 실제 effect replay에서 첫 편성0명≠6명으로 재현했다. cleanup의 epoch 증가만 제거하고 mounted=false·공개/복사 guard 무효화·URL 정리는 유지한 뒤 초기/공유 결과 동작을 포함한 부모9그룹을 통과했다. 이는 작성자의 수정 및 자체 검사 결과이며, 최종 부모 독립 검토는 taxi 담당에게 인계해 실제 재실행과 unmount 뒤 오래된 handler 거부를 별도로 확인한다. 순수6그룹 결과를 제품 전체 검증으로 대신하지 않는다.
