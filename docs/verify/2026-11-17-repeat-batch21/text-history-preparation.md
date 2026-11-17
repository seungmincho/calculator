# 21A 단계 이력 순수 도메인 준비

후속 상태: 20차 체크포인트 뒤 부모 연결을 완료했다. 최종 연결 정책과 자체 검사 결과는 [text-history-implementation.md](text-history-implementation.md)를 따른다. 아래 내용은 미연결 준비 시점의 기록이다.

2026-11-17. **미연결 준비 상태**다. 19차 실제 브라우저 발견 대응을 우선하고 20차 체크포인트 뒤 root 신호가 있기 전에는 `TextConverter.tsx`를 수정하지 않는다. 현재 제품 부모/공용 번역/기존 계산 유틸은 변경하지 않았다.

- 새 파일: `src/utils/textPipelineHistory.ts`, `scripts/check-text-pipeline-history.ts`.
- API: `createTextPipelineHistory(steps = [])`, `reduceTextPipelineHistory(state, action)`, `cloneTextPipelineSteps(steps)`.
- 상태는 `past/present/future`의 Step 목록뿐이다. 과거+미래 최대 30개 전이이며 현재 목록은 별도다. action은 add/remove(index)/move(index, up|down)/reset/undo/redo/restore(steps)다.
- 경계 이동·없는 index·동일 단계의 교환·빈 reset·불가능한 undo/redo는 같은 상태를 반환한다. no-op은 redo를 버리지 않으며, 유효한 새 편집만 redo를 버린다. reset으로 비워진 뒤 다시 reset을 해도 기존 undo 이력은 남는다.
- `Step`의 현재 flat union 모든 props를 복제한다. flags/치환문/affix/shuffle seed를 보존하며 명시적 undefined seed도 JSON 왕복으로 잃지 않는다. 전달했던 원본 배열/단계 객체와 이전 present를 나중에 바꿔도 새로 캡처한 목록과 이력은 영향을 받지 않는다. 반환 상태는 reducer 상태로서 불변 취급한다.
- restore는 현재 값과 같아도 기존 과거/미래가 있다면 지워 외부 URL의 새 기준으로 삼는다. **부모 연결 때 자기 `replaceState`의 query 변화는 restore로 보내면 안 된다.** 초기/외부 URL과 자기 sync를 분리하는 UI 검증은 아직 수행하지 않았다.
- 원문·찾기/치환 작성 중 폼·URL I/O·seed 생성은 API 밖에 있다. 기존 `textConvert.ts`의 runPipeline/REGEX_MAX/실패 단계 정책/민감 문자열 URL 제외 규칙을 그대로 사용한다.

검사: 신규 14그룹 PASS, `scripts/check-text-convert.ts` 기존 회귀 PASS, 신규 2파일 범위 ESLint 오류 0·경고 0. 실제 trim/dedupe 순서별 출력 차이, 중복 단계 위치, 삭제/초기화 왕복, 45회 편집 후 30회 undo/redo, seed/props 분리, 외부 restore와 no-op, 기존 정규식 실패 처리를 확인했다. UI·언어·모바일·브라우저·전체 타입 검사 완료를 뜻하지 않는다. 검사 후 19차 타입 검사와 충돌하지 않도록 TS 편집을 멈춘 상태다.

## 20차 진행 중 미연결 UI 준비

19차 완료 뒤 root 신호로 `TextPipelineHistoryControls.tsx`를 별도 작성했다. 현재도 기존 `TextConverter.tsx`에는 연결하지 않았으며 부모/URL 동기화는 20차 전체 체크포인트 뒤 신호를 기다린다.

- controlled props: `history`, 현재 단계별 `errors`, `onChange(nextHistory)`. 자식이 기존 reducer로 다음 상태를 계산해 전달하며 원문·찾기/치환 입력·URL·저장소에 접근하지 않는다.
- 위/아래 이동·개별 삭제·진짜 undo/redo·전체 초기화 버튼은 44px 이상이다. 현재 과거/미래 횟수, 이력 30개 범위, 단계별 계산 오류를 표시한다. 중복 단계는 위치로 식별하고 options/seed를 유지한다.
- 단축키는 해당 section의 이벤트에만 등록한다. 행에서 Alt+↑/↓, 패널에서 Ctrl/⌘+Z·Shift+Z 또는 Ctrl+Y를 사용한다. input/textarea/select/contenteditable와 IME composing·keyCode 229는 가로채지 않는다. 전역 리스너는 추가하지 않았다.
- 이동 후 해당 행, 삭제 후 남은 인접 행, 모두 삭제 후 활성 undo 버튼으로 초점을 옮긴다. undo/redo가 비활성화되면 반대쪽 활성 버튼으로 초점을 옮긴다. 예상 history와 다른 외부 목록으로 바뀌면 오래된 초점 요청을 폐기한다. aria-label에 단계 위치와 이름을 포함하고 변경은 aria-live로 알린다.
- ko/en 조각: 같은 폴더 `translations-text-history.json`의 `textConverter.history`. 공용 원본/생성본은 수정하지 않았으며 연결 시 통합 담당이 병합한다.
- `scripts/check-text-pipeline-controls.mjs` 실제 child/event 8그룹 PASS, child/검사 파일 lint 오류 0·경고 0. 실제 ko/en 패치 사용, 같은 op 다른 props의 위치 이동, 제거된 행/비활성 버튼에 초점 금지, reset undo/redo, no-op, 범위 단축키·editable/IME 제외, 외부 교체의 stale focus, 30개 이력을 확인했다. focus는 제어된 DOM 포트이며 실제 모바일 layout/키보드/초점과 부모 연결 검증을 대체하지 않는다.

UI 준비와 검사 뒤 20차 최종 타입 검사를 위해 TS 편집을 다시 멈춘다. 기존 14개 순수 검사는 helper 변경이 없어 반복하지 않았다.
