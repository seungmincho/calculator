# 21A 텍스트 변환 단계 이력 — 구현·자체 검증

2026-11-17 KST. 20차 전체 체크포인트 뒤 root 승인으로 기존 `/text-converter/` 부모에 준비된 도메인과 UI를 연결했다. 제품 준비 완료 상태이며 독립 검토·실제 브라우저·전체 타입 검사는 각 담당자가 별도로 수행한다.

## 동작과 범위

- `TextConverter.tsx`는 원문과 작성 중인 find/repl/regex/flags/prefix/suffix를 기존처럼 개별 상태로 유지한다. 단계 상태만 `TextPipelineHistory`의 `present`를 사용한다. 이전의 마지막 단계 제거 버튼은 실제 단계 변경 undo/redo로 교체했다.
- 추가·위/아래 이동·개별 삭제·전체 초기화는 과거+미래 최대 **30개 전이**를 보존한다. 현재 단계 목록은 별도다. 경계 이동·빈 reset·불가능한 undo/redo·동일 단계 교환은 no-op이고, undo 뒤 새 편집은 redo를 버린다.
- 기존 flat `Step` 객체의 모든 props를 복제한다. 정규식 flags·치환 문자열·접두/접미 문자열·shuffle seed를 같은 페이지의 undo/redo에서 유지한다. `textConvert.ts` 계산 규칙·실패 단계 건너뛰기·`REGEX_MAX`는 변경하지 않았다.
- 단계 UI는 위치별 이동/삭제와 단계별 오류를 제공한다. 버튼은 44px 이상, 원문/작성 폼은 16px이다. 단계 패널의 Ctrl/⌘+Z·Shift+Z/Ctrl+Y와 행의 Alt+↑/↓만 처리한다. 입력·선택·contenteditable·IME 이벤트는 가로채지 않는다. 이동/삭제 뒤 남아 있는 행 또는 활성 이력 버튼으로 초점을 옮긴다.
- 새 저장소/네트워크/서버/경로/의존성은 추가하지 않았다. 기존 복사/전체 케이스 미리보기·가이드·관련 도구를 유지했다. 기존 복사 성공 판정은 이번 단계 이력 범위에서 변경하지 않았다.

## URL 계약

첫 정적 HTML/클라이언트 렌더는 빈 단계 목록으로 일치하고, 마운트 effect에서 `ops`를 복원한다. 자기 `replaceState`는 `observedQuery`를 갱신해 검색 훅 통지가 다시 도착해도 이력을 초기화하지 않는다. 실제 query가 달라진 외부 탐색만 `restore`로 새 기준을 만든다. 동일 query의 popstate·hash-only 앵커 이동은 private 단계·seed·undo/redo를 그대로 보존한다. 원문과 작성 중인 폼은 외부 query를 복원할 때도 바꾸지 않는다.

URL에는 기존 `encodeSteps`의 단순 변환과 `list-*` 형식만 포함한다. 원문·replace·affix·shuffle seed·undo 이력을 새로 직렬화하지 않는다. 따라서 공유 링크에서 섞기 순서는 달라질 수 있으며 문자열이 필요한 단계는 복원하지 않는다. 안내/가이드 ko·en에 이 한계를 명시했다. 관련 없는 query/hash와 `history.state`는 자기 갱신에서 보존한다.

## 파일·API

- `src/utils/textPipelineHistory.ts`: `createTextPipelineHistory`, `reduceTextPipelineHistory`, `cloneTextPipelineSteps`, 최대 30 상수.
- `src/components/TextPipelineHistoryControls.tsx`: `history`, `errors`, `onChange(nextHistory)` controlled UI. 원문·폼·URL에 직접 접근하지 않는다.
- `src/components/TextConverter.tsx`: 부모 이력/URL 연결, 기존 단계 추가 버튼과 옵션 폼 유지.
- `translations-text-history.json`: ko/en `textConverter.history` 19키, `pipeline.hint`, `guide.howToUse.items`. 통합 담당자가 공용 원본과 생성물을 병합했다.

브라우저 selector는 `#tc-input`, 출력 `textarea[readonly]`, `[data-text-pipeline-history]`, `[data-text-step-index]`, `[data-step-action="up|down|remove"]`, `[data-history-action="undo|redo|reset"]`다.

## 자체 검사 결과

| 검사 | 결과·핵심 경계 |
| --- | --- |
| `node scripts/check-text-pipeline-history.ts` | 준비 단계 **14그룹 PASS** 유지. helper 변경이 없어 연결 시 반복하지 않았다. 원본 분리/30개/no-op/분기/외부 기준/옵션·seed/정규식 정책. |
| `node scripts/check-text-pipeline-controls.mjs` | 연결 시 **8그룹 PASS**. 실제 ko/en 문구, 중복 op 위치별 이동, 삭제/초기화 undo·redo, 초점 대상, scoped keyboard/editable·IME 제외, 외부 교체 stale focus. |
| `node scripts/check-text-pipeline-parent.mjs` | **7그룹 PASS**. 실제 부모와 child 이벤트로 첫 렌더/공유 URL, own sync 이력 유지, trim/dedupe 실제 출력 차이, private props/seed/원문·작성 중 폼, 35번 편집 후 30번 undo/새 분기, 외부 query 복원·동일 query/앵커 popstate 보존, 정규식 flags/실패/길이 제한, ko/en/16px 확인. |
| `node scripts/check-text-convert.ts` | 기존 계산 회귀 **PASS (`text-convert OK`)**. |
| 범위 ESLint | 부모/child/helper와 세 검사 파일 **exit 0, 오류·경고 0**. 마지막 검사 문구 보정 파일도 별도 **exit 0** 확인했다. |

Node의 기존 package module type 경고는 실행 실패가 아니다. child 검사에 있던 `history.` 부분 문자열 금지 단정은 정상 영어 문장 끝의 `history.`를 키 누락으로 오인해 실제 번역값 일치 검사로 보정했다.

부모 검사에서는 기존 독립 hook harness를 메모리로 로드해 `useDeferredValue`만 즉시 값을 반환하도록 추가했다. 실제 제품 부모/child와 변환 함수는 실행하며 소유가 다른 원본 harness 파일은 수정하지 않았다. 실제 deferred 렌더링·DOM 초점·모바일 배치·주소 탐색의 브라우저 동작을 대신하는 검사는 아니다.

빌드·배포·커밋·전체 tsc·Chrome을 실행하지 않았다. final ready를 root·독립 검토·브라우저·통합 담당에게 전달했고 발견 대응 외 제품 편집을 멈춘다.

브라우저 담당 최초 통지: 21A **6/6 PASS, JS/hydration 오류 0**. 실제 순서·private/flags/seed·35작업/30이력·URL 첫 방문/외부·100,001자 정규식 제한·320px 영어/키보드 초점을 확인했다. 이후 독립 검토에서 같은 query의 앵커 뒤로가기도 private 단계/이력을 초기화하는 경계를 찾아 root가 **동일 query 보존**으로 계약을 명확히 했다. popstate 분기를 최소 수정하고 부모 7그룹을 재통과했으며, 별도 앵커 브라우저 영향 재검사를 요청했다. 최초의 same-query reset 기대는 최종 정책의 근거로 사용하지 않는다.

수정 후 독립 담당 `team_rotation`의 실제 부모/child fixture **6그룹 PASS**를 수신했다. same-query 앵커 popstate 뒤 private replace/affix·shuffle seed·past/future·출력 보존과 실제 query 변경의 새 기준을 대조했으며 추가 결함은 없었다. 변경한 부모/검사 2파일 lint도 **exit 0**이다.
