# 45차 글꼴 조합 백업 — 부모 연결 독립 검토

2026-11-17 KST. **실제 부모·자식 신규 독립6그룹 PASS, 추가 제품 수정 요청 없음.** 앞선 독립 core8과 분리하여 기록한다. 작성자22와 기존 profiles/pairing 회귀를 재실행하거나 합산하지 않았다. 제품 파일은 수정하지 않았다.

## 범위

`FontPairProfiles.tsx`와 `FontPairBackupPanel.tsx`의 실제 코드/효과/이벤트를 각각 번들링하여 props를 실제 부모 출력으로 연결했다. 범용29 hook host만 재사용하고 fixture·저장소/잠금/파일/다운로드 포트·기대값은 `independent-parent-check.mjs`에 새로 작성했다. 작성자 부모 assertion을 재사용하지 않았다.

외부 `FontPairPreview` 전체는 이 검사의 실행 대상이 아니다. 부모의 현재 styles props와 명시 onLoad 호출 수/내용을 관찰했다. 실제 원고 렌더·공유 URL/두 웹폰트 로딩·브라우저 layout은 native 담당의 후속 범위다. 개인 자료·실제 localStorage·Chrome·전체 tsc는 사용하지 않았다.

## 신규6그룹

1. URL 복원 ready가 false일 때 파일 진입이 막히고 자동 쓰기/불러오기0. 정상 준비 후 fullwidth 이름 충돌을 직접 수정하고 둘째 행 선택을 해제하여 한 항목만 추가했다. 기존 목록을 유지하고 onLoad0·현재 styles props 불변·부모에 입력하던 이름 불변을 확인했다. 이후 기존 불러오기 버튼에서만 onLoad1이 된다.
2. 대기 중 가져오기 뒤 같은 raw의 명시 새로고침, 부모 저장, 취소 뒤 새 파일 선택을 각각 실행했다. 오래된 lock callback은 쓰기0이며, 새 부모 저장/새 파일 확정은 각자 새 owner로 성공한다. 이전 완료가 새 preview나 결과를 지우지 않는다.
3. 기존 save/delete의 잠금 대기 중 hidden/pagehide/unmount/Strict effect replay를 각각 실행했다. 이전 작업은 bytes 불변·쓰기0이다. replay 뒤 새 저장을 시작한 다음 옛 callback을 먼저 완료해도 새 작업의 busy/이름/owner가 살아 있고, 새 callback만 현재 목록을 저장한다.
4. setItem 뒤 readback 차단은 child unknownWrite·parent actions 차단이며 저장된 항목을 rollback하지 않는다. 명시 새로고침은 실제 저장된 목록을 읽고 미저장 이름은 유지한다. 외부 storage event와 새 basis는 옛 preview 확정을 막는다. quota는 원본 bytes·파일 preview/이름을 보존한다.
5. 새 파일 뒤 오래된 거절, ready false→true ABA, KO→EN→KO ABA, 명시 취소 뒤 오래된 완료가 예전 row를 보여주지 않는다. 취소 뒤 선택 버튼 focus를 확인했고 저장/적용0이다.
6. 실제 child가 만든 JSON Blob을 독립 JSON.parse로 읽어 wrapper와 전체 저장 profile을 literal 기대값과 비교했다. 부모에 입력 중인 이름은 백업하지 않고 요청 굵기900은 유지한다. 미래 version 파일은 전체 거부·쓰기/적용0이며 Blob URL은 unmount에서 정확1회 회수한다.

## 실행 근거

```text
node docs/verify/2026-11-17-repeat-batch45/independent-parent-check.mjs
Font backup independent actual parent: 6 groups passed
```

첫 검사 스크립트 작성의 객체 닫기 문법1건을 실행 전에 확인·보정했다. 실제 제품 실행 뒤6그룹은 모두 통과했으며 이 검사기 문법을 제품 결함으로 세지 않는다. 앞서 core 검토에서 발견한 onConfirmed 확정 결과 오분류는 core 보고서에 원본/수정 영향 근거를 별도로 보존한다.

최종 독립 JS1파일 scoped ESLint **exit0·오류0·경고0**. native Web Locks/파일 선택 UI/실제 JSON 다운로드와 웹폰트 로딩을 이 제어 포트 결과로 보장하지 않는다.
