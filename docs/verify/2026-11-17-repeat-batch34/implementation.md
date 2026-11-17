# 34차 숫자 한글 변환 — 부모 연결 결과

2026-11-17 KST. 31·32·38차 타입 재검사 PASS 뒤 root 승인으로 `NumberToKorean.tsx`와 `NumberToKoreanBatch.tsx`를 연결했다. **제품 TS 안정/freeze, 자체 기능 40그룹 PASS.** 독립 검토·실제 Chrome·최종 전체 타입은 각각 담당자의 별도 단계다.

## 최종 연결

- 기존 `numberToKorean.ts` / `numberToKoreanBatch.ts`의 계산·parser·한도·직렬화는 수정하지 않았다. 준비한 editing/actions 유틸과 copy recovery child도 연결 단계에서는 수정하지 않았다.
- 최초 서버/첫 client 모두 입력 `123,456,789`와 예시 안내·기본 결과를 표시한다. autofocus는 없다. hydration 이후 최초1회 query를 복원하며 `has('n')`의 빈값·잘못된 값도 예시보다 우선한다. 먼저 raw/IME/clear/quick을 조작했다면 늦은 복원은 원문을 덮지 않는다.
- 편집 원문을 state와 동기 ref에 함께 반영한다. onChange에는 쉼표 formatter와 selection 조작이 없다. 숫자형 blur에서만 기존 문자열 계산과 호환되는 정리를 적용하고 한글/미완성 원문은 보존한다.
- IME 시작은 ref를 먼저 갱신해 같은 이벤트 흐름의 quick/clear/copy도 차단한다. 조합 중 blur는 정리를 보류한다. compositionend와 뒤따르는 input 이후 최신 generation의0ms timeout을 예약하며, 여전히 비조합·비초점이고 실제 activeElement도 입력 밖일 때만 적용한다. 새 세대/재초점/언마운트는 이전 예약을 취소·거부한다.
- 최초 query 읽기는 주소를 다시 쓰지 않는다. 사용자 clear는 `n=`을 유지하고 새 방문에서도 빈칸이다. 유효 편집만 canonical n, 무효 편집은 기존 n 삭제다. 관련 없는 query/hash/history.state를 보존하며 같으면 replaceState를 생략한다. 링크 복사는 effect 전의 주소 대신 클릭 순간 입력으로 n을 만든다.
- 부모가 controller1개를 소유해 formal/모바일formal/행5개/link/batch TSV의 최신 요청을 통합한다. raw·prefix·spacing·locale·지연 로딩된 실제 번역/TSV text 변경은 이전 요청과 복구를 무효화한다. 늦은 거부의 fallback0, 늦은 성공/옛2초 timer의 UI 변경0을 확인했다.
- copy 버튼은 같은 DOM button 형태를 유지한다. 함수 안에서 매 렌더 새 React component type을 만들던 기존 CopyButton 패턴을 렌더 함수로 연결해 불필요한 버튼 재마운트를 피했다.
- 실패 recovery는 단일 결과일 때 위쪽 안내, batch일 때 표 앞의 복사/다운로드 조작 아래에 표시한다. 전체 readOnly 원문·선택·현재 token 재시도·닫기를 제공한다. 원문/옵션이 바뀐 후 오래된 retry/close는 새 요청에 영향을 주지 않는다.
- batch textarea와 계산은 그대로이며 복사만 부모에 위임한다. 다운로드 오류는 copy 상태와 분리했다. CSV는 기존7열/BOM/고정 파일명/1초 Blob URL 회수, 전체100물리행·30,000자·행300자 정책을 유지한다. **301자 단일 행은 오류 행으로 남아 반출 가능**, 101물리행/전체30,000자 초과는 전체 출력 차단이라는 기존 차이를 유지한다.

부모에서 입력·옵션 변경 직후 아직 새 렌더 전인 구식 handler도 context ref로 거부한다. 같은 접두사/checkbox 값을 다시 선택한 no-op은 ref를 영구 무효 상태로 남기지 않으며, 단순 focus 이동은 복사를 불필요하게 취소하지 않는다.

## 자체 실행

| 검사 | 결과 |
|---|---|
| 준비 editing 순수 | 14그룹 PASS 유지, 연결 중 파일 불변 |
| 준비 copy 순수/제어 DOM | 14그룹 PASS 유지, 앞선 TS2774 보완 뒤 재통과 |
| 실제 recovery child | 4그룹 PASS 유지 |
| `node docs/verify/2026-11-17-repeat-batch34/check-number-parent.mjs` | 신규8그룹 PASS |
| `node scripts/check-number-to-korean.ts` | 기존 계산 회귀 PASS |
| `node scripts/check-number-to-korean-batch.ts` | 기존18그룹 PASS |
| 변경 제품5 + TS 검사2 + JS 검사2 scoped ESLint | 최종 오류0/경고0 |

새 기능 검사는 **준비32 + 부모8 = 40그룹**이며 기존 계산/일괄 회귀18을 새 기능 개수에 합치지 않았다. 새 부모 검사는 실제 React SSR 전체 트리, 실제 부모+Batch의 hook/event 연결, 실제 Blob 바이트, 별도 CSV/TSV reader를 사용한다. native Clipboard/DOM/history/타이머는 제어 포트며 Chrome을 실행하지 않았다.

부모8그룹은 다음을 확인한다.

1. 실제 React SSR과 첫 client 조건의 예시 HTML 동일: query 없음/빈값/무효/20자리/한글, autofocus0.
2. 실제 초기 복원·읽기0쓰기·편집/IME/clear 선행 우선.
3. raw 중간 편집, 미완성·한글·긴 소수, 조합 blur/end/최종 input 재배열, 옛0ms callback/재초점 차단.
4. 명시 clear→n=→새 방문 빈값, 관련 없는 query/hash/history.state, 현재 화면과 주소가 다른 순간의 링크 복사.
5. 2^53 초과 quick, 음수 quick의 기존0기준,20자리 overflow no-op, 한글 역변환, 같은 prefix 재선택 뒤 복사.
6. 단일→batch와 batch→link의 공유 요청 소유권, 옛 성공 timer, raw/prefix/spacing/batch/locale/번역 ready 뒤 늦은 거부 fallback0.
7. native 거부+legacy false/true, 현재 retry/close, 옛 recovery callback, 언마운트 후 늦은 거부.
8. 실제100행 TSV/CSV7열/BOM/고정명,20자리·음수·오류행·따옴표·수식 보호·원문 물리행 보존, 한도별 기존 동작.

첫 새 CSV fixture에는 모든 라벨에 붙는 기존 텍스트 보호 apostrophe와 오류행 raw가 전체 물리행인 점을 빠뜨린 기대값이 있었다. 제품은 그대로 두고 독립 reader의 기대값만 바로잡았다. 행300자 초과와 전체 한도의 정책도 구분했다. 연결 초안의 불필요한 requestCopy useCallback은 React Compiler lint 요구에 따라 일반 함수로 정리했고, 새 JS 검사 변수명 module lint1건을 수정했다. 해당 파일 재검사를 포함해 최종 scope 오류·경고는0이다.

## 번역·소유권

자기 조각 `translations-number.json`은 준비 당시14leaf 그대로 최종 확정했다(`editing`7, `copyRecovery`7). 통합 담당이 canonical/messages 생성과 기존 guide/FAQ/메타의 기능 설명을 맡았으며 자체적으로 canonical을 수정하지 않았다. 새 의존성·저장소·route는 없다. 빌드·배포·커밋·전체 tsc는 실행하지 않았다.

## 브라우저 전달 경계와 선택자

- 단일 입력 `#ntk-input`, wrapper `data-number-composing`, `data-number-restored`, 예시 `data-number-example`, 결과 `data-number-result`.
- `data-number-quick="1000|10000|100000|1000000|10000000|100000000"`, `data-number-prefix="geum|ilgeum|none"`, `data-number-spacing`, `data-number-clear`.
- 모든 복사 `data-number-copy="formal|formal-mobile|contract|chinese|mixed|reading|english|link|batch"`, 성공 `data-number-copied="true|false"`.
- batch `#number-batch-input`, `data-number-download="csv"`.
- 복구 `data-number-copy-recovery="target"`, `data-number-copy-select`, `data-number-copy-retry`, `data-number-copy-close`, 전체 readOnly textarea.

verify는 실제 input.selectionStart/End 중간 삽입·삭제·범위 치환, 실제 IME event 순서/blur 예약, 자동 키보드 focus0, n= 재방문, native Clipboard 거부/선택/복구, 단일↔batch 전역 경합, 실제100행 CSV bytes,320px KO/EN을 확인한다. 제어 host 검사로 실제 DOM caret나 기기별 IME를 보장하지 않는다. 제품 변경이 필요하면 해당 영향 사례를 먼저 검증하고 안정/freeze를 다시 전달한다.
