# 25A 원고 → Diff 전달 미연결 준비

2026-11-17 KST. 23차 전체 체크포인트 후 root 승인으로 독립 유틸·검사·번역 조각을 준비했다. **준비 TS 안정, 기존 경로에는 아직 연결하지 않음.** `WritingVersionsPanel.tsx`, `TextDiffWorkspace.tsx`, `CharacterCounter.tsx`, 기존 TTS 전달 및 메시지원본은 수정하지 않았다. 부모 연결은 24차 체크포인트 뒤 별도 신호를 기다린다.

후속 상태: 24차 체크포인트 뒤 부모 연결과 자체 검증을 완료했다. 현재 상태는 [writing-diff-implementation.md](writing-diff-implementation.md)를 따른다. 아래는 연결 전 준비 기록이다.

## 준비 파일과 API

- `src/utils/writingDiffHandoff.ts`: 독립 v1 schema, source 클릭 시 재조회, 새 탭 전달, 조건부 소비, 지연 수신 guard.
- `scripts/check-writing-diff-handoff.ts`: 순수 함수와 Storage/window 포트의 16그룹.
- `translations-writing-diff.json`: `characterCounter.versions.diff`, `diffViewer.handoff`의 ko/en 30키. 부모 연결 시 실제 사용 키와 다시 대조한다.

고정 키 `toolhub-writing-diff-v1`, source `writing-versions`, 경로 `/diff-viewer/?from=writing-versions`. 좌측 `role: saved`의 이름·제목·원래 탭과 우측 `role: current`의 제목·현재 탭을 각각 원문과 보낸다. title/name 40자, 탭 1~5, 원문 각 50,000 UTF-16 단위, TTL 10분(정확한 경계 포함)이다. 저장본/현재본의 빈 원문·같은 내용은 프로토콜에서 유효하다. 기존 원고 저장본의 비어 있지 않은 조건은 변경하지 않았다.

`prepareWritingDiffHandoff(storage, expectedRaw, selectedId, current, activeTab, now)`는 저장 목록을 두 번 읽어 raw가 같은지 확인하고 선택한 최신 기록을 찾는다. 쓰기·대기·부모 상태 변경이 없다. 현재 원문을 먼저 길이 검사해 긴 글을 JSON으로 복제한 후 거부하지 않는다.

`openWritingDiffHandoff(payload, openWindow, now)`는 검증 후 새 blank 탭에 쓰기/읽기 확인→opener 제거/확인→고정 주소 이동을 수행한다. 이후 실패는 만든 탭만 닫고 typed 오류를 던진다. 본문·제목은 URL이나 원래 창의 저장소에 쓰지 않는다. 호출은 사용자 클릭 안에서 동기로 유지한다.

`createWritingDiffReceiver()`는 `begin(source) → ticket`, `cancel(ticket)`, `edit()`, `receive(ticket, storage, apply, now)`를 제공한다. 최신 ticket만 유효하며 적용/실패 한 번 시도한 뒤에는 다시 begin하지 않는다. 최초 예약 전 편집도 기억한다. 아직 실행하지 않은 effect의 취소는 새 setup이 재예약할 수 있어 StrictMode cleanup을 지원한다. `receive`는 raw 재검사와 편집 세대 확인 후 동기 apply하고, 그 raw만 소비한다. 적용하지 않은 raw, 새 값으로 바뀐 raw는 보존한다. apply 성공 뒤 정리 실패는 입력 성공과 별도 결과다.

부모 연결 시 `useHydrated` 뒤 최초 marker만 처리하고, 예약 callback 정리에서 ticket을 취소한다. 입력·swap·clear·compare/cancel에서 즉시 `edit()`한다. stale 결과로 React 상태를 갱신하지 않는다. 받은 입력 적용은 일반 사용자 편집과 구분하며, 예제/확정 결과와 copy/download 안내를 초기화하되 Worker는 자동 실행하지 않는다. 저장 목록이 blocked일 때 source 버튼을 막는 UI 검사는 부모 연결 때 추가한다.

## 완료 검사와 남은 경계

| 범위 | 결과 |
| --- | --- |
| `node scripts/check-writing-diff-handoff.ts` | **16그룹 PASS**. 정확 왕복·최악 JSON·UTF-16/빈/동일·TTL·엄격 역할/필드·source bytes·목록 충돌·새 탭 모든 실패 포트·조건부 소비·늦은/역순/편집/취소·다른 TTS 키 보호. |
| `npx eslint src/utils/writingDiffHandoff.ts scripts/check-writing-diff-handoff.ts` | **exit 0, 오류/경고 0**. |
| `node scripts/check-text-handoff.ts` | 기존 OCR/메모→TTS **51검사 PASS**. 제품 파일 변경 없음. |
| 번역 조각 파싱·ko/en 경로/placeholder 대조 | **30키 일치**, 누락/placeholder 차이 없음. |

실제 React 부모 이벤트·StrictMode/hydration·버튼 라벨/반응형·새 창 브라우저 권한·실제 Worker/TXT는 아직 검증하지 않았다. 순수 포트 검사를 실제 브라우저 완료로 주장하지 않는다. 부모 연결 후 source 5탭/undo/raw 불변, 수신 전 사용자 편집/locale, 적용 뒤 swap 출처 표시, 실제 Worker 및 export/복사 복구를 검증 담당과 이어 확인한다.

현재 유틸/검사는 유효한 완료 단위로 고정했다. 새 패키지·서버·경로·전체 tsc·Chrome·빌드·배포·커밋은 수행하지 않았다. 다음 24B 독립 검토 또는 타입 검사 정지 요청에 대응할 수 있다.
