# 18차 언어 전환 호출부 감사

2026-11-17 KST. 담당 `/root/taxi_repeat`. `t`가 실제 언어/해당 카탈로그 변경 시 바뀌는 계약을 전제로 대표 호출부를 조사했다. 제품 전체를 모두 검증했다는 문서는 아니다.

## 결론

데이터 변경으로 이어지는 재현 2건을 찾았고 root 승인으로 두 호출부만 최소 보완했다. Markdown의 번역 예제 기반 저장 제외 판정과 Othello의 마지막 수신 메시지 재처리다. 대표 Csat/Grade/Timer/Notepad/JSON/Speaking에서는 번역 변경만으로 입력·진행 상태를 다시 초기화하는 직접 경로를 찾지 못했다.

감사 시작 시 기존 `useTranslations()`는 KO만 읽으며 매 렌더 새 함수를 반환했다. 따라서 Othello 재처리는 기존에도 가능한 baseline 결함이다. 새 runtime이 평상시 함수 참조를 안정화해도 실제 KO↔EN 전환은 `t`를 바꾸므로 이 호출부를 그대로 두면 언어 전환에서 다시 발생한다. Markdown의 `sample`은 기존 KO 고정 상태에서는 문자열이 변하지 않았으므로 실제 번역 전환으로 드러나는 저장 분류 경계다.

## 확인한 위험과 최소 수정

### 1. Markdown 저장본 삭제 — 수정 전 재현

위치: `src/components/MarkdownEditor.tsx:19`, `:47`, `:262`.

기존 코드는 `sample = t('sample')`, 자동저장 effect `[markdown, sample]`에서 `markdown === sample`이면 `toolhub-markdown-draft`를 삭제했다. 다음 조건에서 사용자가 명시적으로 작성/가져온 원고가 언어 변경만으로 저장 제외 대상으로 바뀐다.

1. KO 화면에서 영어 예제와 같은 문자열을 실제 원고로 입력한다. 한국어 예제와는 다른 문자열이다.
2. 600ms 자동저장 뒤 저장 키에는 그 영어 원고가 있다.
3. 원고를 편집하지 않고 EN으로 전환한다.
4. 새 영어 `sample`과 기존 원고가 같아져 600ms 뒤 저장 키가 삭제된다.

화면의 현재 문자열은 유지된다. 즉시 편집기 원고가 비워지는 결함이 아니라 **재방문에 사용할 저장본이 삭제되는 결함**이다. 일반적인 다른 원고는 양쪽 언어에서 저장이 유지됐다. 반대로 손대지 않은 KO 예제는 EN 전환만으로 사용자 초안처럼 새로 저장되는 분류 변경도 확인했다.

수정: `sampleBaseline`을 최초 예제 값으로 고정하고 자동저장 effect는 `[markdown, sampleBaseline]`에 의존한다. 사용자가 ‘예제 불러오기’를 명시적으로 승인할 때만 현재 언어 예제와 baseline을 함께 바꾼다. 예제 버튼의 현재 언어 반영, 확인 취소, 새 문서 확인/취소 동작을 유지한다. 복사·파일 읽기·렌더러·자동저장 지연은 이번 수정에서 바꾸지 않았다.

### 2. Othello 메시지 재처리 — 기존 baseline이면서 언어 전환에도 재현

위치: `src/components/Othello.tsx:110`, `:267`, `:324`; 수신 경계 `src/hooks/usePeerConnection.ts:35`, `:43`, `:165`.

메시지 effect는 `[lastMessage, myColor, showChat, t, showToast]`에 의존하지만 이미 처리한 메시지를 구분하지 않았다. `usePeerConnection`은 수신한 객체를 state에 그대로 보관하고 disconnect에서 `null`로 바꾼다.

- 같은 마지막 `chat` 객체를 둔 채 `t` 참조만 KO→EN으로 바꿔 effect를 다시 실행하면 채팅/미읽음 개수가 각각 1→2가 된다.
- 마지막 수신이 `restart`이고 그 뒤 첫 차례 플레이어가 로컬에서 한 수 둔 상태라면, `t` 변경으로 같은 restart를 다시 적용해 보드가 초기화된다.
- 기존 runtime의 매 렌더 새 `t`도 같은 조건을 만든다. 새 runtime에서 언어 변경 없이 항상 재현된다고 주장하는 것은 아니며, 실제 locale 변경은 여전히 이 의존성을 바꾼다는 뜻이다.

수정: `processedMessageRef`로 같은 객체를 한 번만 처리한다. `t` 의존은 그대로 두어 새 메시지를 처리할 때 최신 번역을 사용한다. `null` 수신에서는 marker를 비워 새 연결을 허용한다. 내용이 같더라도 새 객체인 새 메시지는 처리하며, StrictMode의 effect setup 재실행은 같은 메시지를 중복 적용하지 않는다.

범위 수치: `src/components`에서 `lastMessage`를 dependency로 둔 effect는 8개, 그중 직접 `t`도 dependency로 둔 동일 패턴은 Othello 1개였다. 이 숫자는 모든 게임의 모든 네트워크 문제를 전수 검증했다는 의미가 아니다.

## 대표 도구의 보존 근거

| 호출부 | 코드 근거 | 판정/검증 시 볼 지점 |
|---|---|---|
| CsatDday | `useNow`의 effect는 `[ms]`. 이름은 hydrated URL값 변경 때만 복원하고, 체크리스트/답안 복원은 각 1회 가드다. 번역은 렌더/출력 문구에 사용한다. | 언어만 바뀌어 체크/답안/연습 시작시각을 다시 쓰는 경로 없음. 실제 브라우저에서 기존 체크/답안 보존 확인 권장. |
| CsatGrade 및 기록/목표 | `CsatGrade.tsx:65` 부근 URL 복원은 `urlRestored` 1회 가드, URL sync는 scores/sel/minN/minSum에만 의존. 자식들의 context에는 현재 숫자/선택/편집 초안만 있고 `t`가 없다. | 번역 전환으로 점수/목표 초안/기록 선택을 초기화하는 직접 경로 없음. |
| TimerStopwatch / TimerRoutine | 설정 복원은 mount `[]`, 저장은 `[cfg]`, 진행은 countdown 종료시각/실제 실행 state 기준. routine의 tick/refresh는 `t`에 의존하지 않는다. | 예제 단계 이름의 `useState(() => t(...))`는 최초 한 번뿐이며 언어 변경 후 기존 이름이 유지되는 것이 초안 보존이다. 타이머 문서 제목은 번역을 따라 바뀌어도 시간이 초기화되지는 않는다. |
| Notepad | `Notepad.tsx:100` 최초 로드 `[]`; 저장은 `[notes, loaded, persist]`; `persist`는 `useCallback([])`와 현재 notes ref. `untitled`는 표시/파일명용이다. | `[exportTxt]` 단축키 effect 재등록은 메모를 쓰지 않는다. 현재 메모·저장 목록 보존 경로다. |
| JsonFormatter | `JsonFormatter.tsx:353` 원문 state는 빈 문자열 초기값, `:410` parsing effect는 `[input, json5Mode]`. `t` 의존 callback은 명시 import/실행 또는 키보드 handler다. | 번역만 바뀌어 JSON 예제를 다시 넣는 effect 없음. 예제 삽입은 사용자 callback에서만 실행된다. |
| SpeakingPractice / useSpeakingRecorder | `SpeakingPractice.tsx:80` 초기 session effect `[]`; appendTake는 `useCallback([])`. 녹음 hook cleanup은 stable `release`에만 의존하며 번역 hook 자체가 없다. | locale 변경만으로 session/takes를 비우거나 녹음을 종료하는 직접 경로 없음. 컴포넌트를 언어별 key로 재마운트하지 않는 runtime 계약이 필요하다. |
| MarkdownEditor | 위 저장 분류 문제 외에는 `[t]`/번역 예제로 원고를 다시 설정하는 effect가 없다. `useState(sample)`은 재렌더 초기화가 아니다. | 최소 수정 후 현재 원고·저장본·명시 예제/새 문서 동작을 검사했다. 19차 복사/파일 읽기 개선은 아직 연결하지 않았다. |

낮은 위험의 구분: DdayCalculator의 `[searchParams,t]` 복원은 `inited` ref로 차단된다. 다만 번역된 기본 수능 제목과 비교하는 URL 생략 조건은 언어에 따라 달라져 명시 쿼리가 생길 수 있다. 날짜/제목 state를 덮는 동작은 아니므로 이번 두 결함의 수정 범위에 넣지 않았다. 이벤트 listener나 RAF를 재등록하는 effect 역시 그 자체만으로 입력 초기화라고 분류하지 않았다.

## 재현/검사 방법과 결과

`rg`와 TypeScript AST를 읽기 전용으로 사용해 `useEffect`/`useLayoutEffect` dependency 및 `t`에서 유래한 callback/sample을 좁혔다. 단순 문자열 검색에서 나온 클릭 handler나 렌더 배열은 분리했다. 대표 상태 복원/저장/타이머/녹음 경계는 소스를 직접 읽었다.

수정 전에는 실제 effect 본문을 AST로 추출해 VM의 storage/state doubles에 연결했다. Markdown의 저장 키 삭제, Othello의 chat 1→2 및 restart 뒤 moves 1→0을 확인했다. 이는 실제 제품 effect 코드 실행이며 전체 React 트리/실제 WebRTC/브라우저 실행이라고 주장하지 않는다.

수정 후 재현 스크립트:

```text
node docs/verify/2026-11-17-repeat-batch18/check-locale-effects.mjs
```

11개 그룹 PASS. Markdown 저장본 보존·초기 예제·일반 원고·현재 언어 예제 명시 적용·취소·새 문서 6개, Othello 동일 객체/새 객체/locale restart/StrictMode setup/null 연결/새 move 경계 5개다.

독립 검토 담당의 `check-locale-effects-react.cjs`도 2개 그룹 PASS했다. 실제 제품 effect 전체(의존성 배열 포함)와 state/ref 선언을 AST로 추출해 실제 React에서 실행했다. KO→EN에서도 영어 예제와 같은 원고/저장 키가 유지되고 불필요한 autosave 재예약은 0이었다. Othello는 StrictMode·locale 변경에서 chat 1회, 최근 restart 뒤 로컬 수 유지, 새 동일 내용 객체의 정상 처리를 확인했다. 추가 수정 요청은 없다.

새 검사 스크립트 scoped ESLint는 오류·경고 0이다. 두 제품 파일에는 변경 전후 같은 baseline이 남는다: Markdown mount 복원의 `set-state-in-effect` 오류 1개, Othello 미사용/기존 effect deps 등 경고 8개. 수정 전 소스를 메모리에서 복원해 ESLint stdin으로 비교했고 새 진단은 없었다. lint 전체 통과라고 표현하지 않는다.

브라우저·전체 타입 검사·제품의 공용 번역/runtime 변경은 이 감사 담당이 실행하지 않았다. 실제 컴포넌트 독립 검토와 언어 전환 브라우저 확인은 담당자에게 전달했다.
