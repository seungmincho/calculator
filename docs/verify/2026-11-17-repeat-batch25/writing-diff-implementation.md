# 25A 원고 저장본 → 줄 비교 부모 연결

2026-11-17 KST. 24차 체크포인트 뒤 root 승인으로 기존 부모에 연결했다. **부모 연결·자체 검사 완료, 독립/실제 브라우저 검증 인계 단계다.** 제품 TS를 고정하며 발견 대응을 우선한다. 빌드·배포·커밋·전체 타입·Chrome은 실행하지 않았다.

## 현재 연결

- `WritingVersionsPanel.tsx`: `[data-writing-diff-send]` 명시 버튼, 클릭 직전 저장 raw 재검증, 정확한 현재 탭/선택 저장본 snapshot, 새 탭 전달, 길이·팝업·저장 오류와 수동 복사 대안. 기존 restore/delete/save/backup과 CharacterCounter 5탭·undo 연결은 유지한다.
- `TextDiffWorkspace.tsx`: hydration 뒤 이름 있는 0ms callback `receiveWritingDiffTransfer`에서 최초 marker만 수신한다. 입력/비교를 먼저 시작하면 원문을 덮지 않는다. StrictMode cleanup은 ticket/예약을 무효화한다. 적용 후 예제 결과를 지우고 **수동 비교 전 Worker는 실행하지 않는다**. 편집/swap 후 원래 좌우 출처명은 숨긴다.
- 수신 UI `[data-writing-diff-handoff=loaded|오류코드]`, `#writing-diff-handoff-title`, 기존 `#diff-left`, `#diff-right`. source 결과 `[data-writing-diff-notice=sent|오류코드]`.
- `src/utils/writingDiffHandoff.ts`는 준비 당시 그대로 사용했다. key `toolhub-writing-diff-v1`, source `writing-versions`, 경로 `/diff-viewer/?from=writing-versions`. 두 원문 각 50,000자·TTL10분, 별도 sessionStorage만 사용하고 기존 OCR/메모→TTS v1과 분리한다.
- `translations-writing-diff.json`은 ko/en 30키. 연결 중 기존 3종 문구를 다듬었다: 수동 원문은 ‘위의’ 원문이고, 정상 소비된 전달만 새로고침 재적용되지 않으며, URL에 원문이 담겼다고 주장하지 않는다. 공용 병합은 integrate 담당이다.

## 자체 검증

- `node scripts/check-writing-diff-handoff.ts`: 준비 순수/포트 **16그룹 PASS**. 유틸은 연결 중 변경하지 않았다.
- `node scripts/check-writing-diff-components.mjs`: 실제 부모 **10그룹 PASS**. source 정확 전달·실패 보존·실제 CharacterCounter 5탭/undo, target hydration/StrictMode replay·late/dirty/locale, 새 raw 보존·정리 실패·미지원/만료, 명시 비교/TXT/실제 copy helper 실패, 50,000자·줄수 제한을 포함한다.
- `node scripts/check-writing-diff-components.mjs inaccessible`: sessionStorage getter 차단도 완료한 한 번 시도로 처리하는 마지막 보완 뒤 해당 **1그룹 재통과**. 10그룹에 포함된 영향 검사이며 별도 그룹으로 더하지 않는다.
- `node scripts/check-line-diff-component.mjs`: 기존 실제 Diff 컴포넌트 회귀 **8그룹 PASS**. 예제/입력·취소·오래된 Worker/복사·페이지/필터·TXT·빈 문서·KO/EN을 확인했다.
- `node scripts/check-text-handoff.ts`: 준비 단계 기존 OCR/메모→TTS **51검사 PASS**. 이후 관련 제품 파일은 변경하지 않았다.
- 부모2/유틸1/검사2의 scoped ESLint **exit 0, 오류/경고 0**. 마지막 sessionStorage getter 보완 영향2파일도 **exit 0**으로 재확인했다.
- ko/en 조각 **30키 경로·placeholder 일치**. 실제 source/target 이벤트 fixture도 조각을 원본 번역과 병합해 사용한다. 원본 messages/생성물/메타는 integrate 담당이다.

자체 fixture는 실제 React 컴포넌트와 전달 유틸, 기존 순수 줄 비교·clipboard helper를 실행하고 hook/Storage/window/Worker transport/DOM을 제어한다. Worker 스레드의 실제 번들 로딩, 새 탭 브라우저 권한, native Clipboard·320px은 verify 담당의 별도 실브라우저 검사다. 이름 있는 callback을 지연시켜 먼저 편집하는 흐름, 두 번째 raw 읽기 변경과 소비 직전 새 값 교체도 실제 브라우저에서 확인할 예정이다.

수신 metadata는 받은 snapshot 설명이다. 입력 편집/swap/clear 뒤 원래 좌우 이름을 숨기고 현재 입력 기준 안내를 보여 주므로 다른 글을 원래 저장본이라고 표시하지 않는다. copy/download는 기존 확정 비교 snapshot 정책을 유지한다. 정리 실패는 받은 입력을 폐기하지 않고 별도 안내하며, 미지원/손상/만료/미적용 raw는 보존한다.

## 최종 상태

부모 연결 사실·검사 범위·번역 최종본·selectors를 root, taxi(독립), verify(브라우저), integrate(공용/전체 타입)에게 전달한다. 현재 추가 제품 변경 계획은 없으며 발견 대응 외 TS 편집을 멈춘다. canonical 메시지·메타·공용 master 문서는 수정하지 않았다.

후속 독립 검토: taxi의 [writing-diff-independent-review.md](writing-diff-independent-review.md) **7그룹 PASS·검사 lint 0**, 추가 제품 결함 없음. 5탭/undo·opener 제거 실패·source 두 번째 raw·target 읽기 중 편집·조건부 소비의 새 raw·예제 복사 대기와 handoff·compare/edit/copy/TXT 경합을 확인했다.

후속 실제 브라우저: verify의 **6/6 첫 실행 PASS**, 제품 결함 요청 0. 실제 새 탭/opener/session consume/원본 bytes, 자동 Worker 0→명시 실제 Worker와 TXT 111바이트, popup/storage/50k·빈 원문·충돌, receiver dirty 및 2/3번째 raw 교체, 기존 OCR 키 보호와 320px KO/EN을 확인했다. Chrome 종료 뒤 전체 타입 검사는 integrate 담당이며 현재 제품 TS는 고정 상태다.

전체 타입 검사 보완: integrate가 발견한 `TextDiffWorkspace.tsx`의 TS2345 1건은 `stale` 오류 union을 `setHandoff` 호출 직전의 별도 분기에서 좁히도록 수정했다. 기존 stale 무시/일반 오류 안내 동작은 유지한다. `check-writing-diff-components.mjs StrictMode`, `deferred`, `inaccessible` 영향 **3그룹 재통과**, 해당 제품 파일 scoped ESLint **exit 0**. 다시 TS를 고정하고 전체 타입 재확인을 integrate에게 맡겼다. 27차 새 제품 TS는 아직 없다.
