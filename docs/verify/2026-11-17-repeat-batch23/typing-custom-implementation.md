# 23A 내 글 타자 연습 — 부모 연결·자체 검증

2026-11-17 KST. 22차 전체 체크포인트 뒤 root 승인으로 `/typing-test/`에 미연결 준비 파일을 연결했다. **제품 준비 완료**이며 독립·실제 브라우저·전체 타입 검사는 담당자들이 별도로 수행한다. 빌드·배포·커밋은 하지 않았다.

## 결과

기존 오늘의 문장·짧은 글·긴 글·시간제에 ‘내 글 연습’을 추가했다. 기존 `Mode`와 `Entry` 형식은 그대로이고, 별도 `workspace` 상태가 기본 UI와 항상 마운트된 사용자 작업공간을 선택한다. 사용자 지문/결과는 기존 기록의 `finish`나 저장 함수를 호출하지 않는다.

초안은 원문 그대로 보관하고 CRLF/CR/LF·탭→일반 공백, 연속 일반 공백→한 칸, 앞뒤 일반 공백 제거 결과를 미리 보여 준다. 정규화된 10~1,000 코드포인트만 명시 적용할 수 있으며 잘못된 지문을 자동으로 자르지 않는다. 다른 문자·NFC 변환은 추가하지 않았다.

초안·다음 연습의 KO/EN 단위와 확정 지문·현재 시도는 분리된다. 초안/단위/앱 locale 편집은 진행 중 채점 대상을 바꾸지 않는다. 명시 적용만 현재 시도를 교체하며, 재연습/Esc는 확정한 지문을 다시 사용한다. 다른 방식으로 이동하면 현재 타이머와 입력을 종료하지만 초안과 확정 지문은 방문 메모리에 남는다. 결과를 일반 평균/순위나 최고·일일·연속일·최근 기록에 합산하지 않는다.

명시 apply/retry/Esc 뒤에는 새 run ID의 layout 단계에서 실제 타자칸에 focus한다. 첫 방문·초안 편집·locale 변경·비활성 복귀에는 자동 focus하지 않으며, superseded 요청과 비활성/언마운트 요청은 버린다.

## IME·타이머·기본 연습 보호

- 사용자 attempt는 기존 `diffTyped`/타수·WPM·정확도·오타 자모 함수를 사용한다. 명시 composition 상태가 true일 때 마지막 글자가 목표와 같아도 완료하지 않는다. compositionend 후 최종 value를 처리하고 뒤따르는 input이나 옛 textarea callback은 새 결과를 만들지 못한다. 확정된 마지막 자모 prefix 오타도 완료할 수 있다.
- 기본 연습에도 명시 composition 완료 가드를 연결해 조합 중 조기 완료와 중복 기록을 막았다. 기존 점수/평균/지문/타수 엔진은 수정하지 않았다.
- 기본→내 글 전환은 기본 run generation을 즉시 무효화하고 reset한다. interval/finish/input은 활성 작업공간·현재 세대·완료 여부를 확인한다. 내 글의 `active=false`도 자신의 run을 초기화하고 interval을 정리한다. 이미 큐에 들어간 옛 tick/입력/조합 callback은 기록하지 않는다.
- 기본 초기 URL/기록 복원은 취소 가능한 0ms callback에서 수행한다. 초기 정적 트리와 주소를 먼저 유지하며, 언마운트 뒤 복원하지 않는다. live 정확도는 입력 이벤트에서 state로 갱신해 render에서 ref를 읽지 않는다. ESLint 규칙을 끄지 않았다.

## 복사·개인 입력

`TypingSummaryCopy`와 `copyTypingSummary`를 사용자 결과와 기존 기본 결과에 공통으로 연결했다. native Clipboard 성공 또는 `execCommand(true)`만 복사 성공으로 표시한다. 실패하면 readonly 요약, 명시 전체 선택, 재시도를 제공한다. 결과/언어/작업공간/언마운트 뒤 옛 복사의 성공·실패 안내는 현재 결과에 적용하지 않는다.

사용자 요약은 이번 속도·정확도·오타 위치 수·소요시간만 포함하며 지문이나 같은 지문을 여는 링크를 포함하지 않는다. 기본 요약은 기존 기본 연습 URL을 유지한다. 사용자 지문·초안·단위는 URL, localStorage, 최근 기록, 외부 요청에 추가하지 않는다. 새 경로·패키지·서버는 없다.

## 소유 파일·번역

- `src/components/TypingTest.tsx`: 최소 부모 연결, 기본 timer/finish/IME 가드와 공통 복사.
- `src/components/CustomTypingWorkspace.tsx`, `TypingSummaryCopy.tsx`: 사용자 작업공간과 요약 복구.
- `src/utils/customTyping.ts`, `typingClipboard.ts`: 순수 attempt/정규화 및 복사 결과 판정.
- `scripts/check-custom-typing.ts`, `check-custom-typing-component.mjs`, `check-custom-typing-parent.mjs`.
- `translations-typing-custom.json`: `typingTest.custom`/`copyRecovery`의 ko/en. 부모 연결 때 `custom.switchNotice`를 추가한 최종본을 통합 담당에게 전달했다. 기존 가이드의 ‘자동 저장/같은 글 공유’ 설명은 통합 담당이 기본 연습과 사용자 연습을 구분해 정리한다.

## 자체 검사

| 명령/범위 | 결과 |
| --- | --- |
| `node scripts/check-custom-typing.ts` | **9그룹 PASS**. 코드포인트 경계·정규화·불변 attempt·IME 확정/prefix 오타·KO/EN 기존 산식·오타 수정 이력·복사 true/false/throw/stale. |
| `node scripts/check-custom-typing-component.mjs` | 준비 단계 **8그룹 PASS**. 실제 child의 초안/확정본·locale·타이머 1개/이탈0·옛 composition·paste/drop·요약 원문 제외·복사 실패/재시도·수동 선택. |
| `node scripts/check-custom-typing-component.mjs Explicit` | 초점 보완 영향 **1그룹 PASS**. apply/retry/Esc focus와 초기/초안/locale/복귀/옛 요청 제외. 기존 8그룹은 무관한 부분이므로 반복하지 않았다. |
| `node scripts/check-custom-typing-parent.mjs` | **6그룹 PASS**. 실제 부모+child의 기존 URL/4모드, 기본↔내 글 timer와 late callback, 사용자 완료 후 기록 bytes 불변, 기본 daily 완료 정확히1회/기존 tries, short/long/time 기록 shape, locale/초안 보존, 기본 결과의 공통 복구. |
| `node scripts/check-typing-test.ts` | 기존 계산 회귀 **PASS**. 기존 엔진 파일은 변경하지 않았다. |
| 제품/검사 8파일 scoped ESLint | **exit 0, 오류/경고 0**. |

총 **24개 자체 그룹**이며 실제 OS IME/브라우저 완료를 뜻하지 않는다. 부모/child 검사는 실제 제품 코드를 hook/event harness로 실행하고 시간·Storage·Clipboard·차트 포트를 제어한다. 브라우저 담당은 실제 입력/네이티브 복사/320px/초점과 합성 composition 이벤트를 별도로 확인한다. 모바일 OS의 실제 한글 입력기는 합성 이벤트와 구분해야 한다.

selector: `[data-typing-mode="daily|short|long|time|custom"]`, `[data-standard-input]`, `[data-standard-result]`, `[data-custom-draft]`, `[data-custom-preview]`, `[data-custom-apply]`, `[data-custom-target]`, `[data-custom-input]`, `[data-custom-retry]`, `[data-custom-result]`, `[data-typing-copy]`.

final ready와 범위·검사/초점 정책을 root·team_rotation(독립)·batch5_verify(브라우저)·batch5_integrate(공용/타입)에게 전달했다. 발견 대응 외 TS 편집을 멈춘다.

후속 독립 결과: `team_rotation`의 [typing-independent-review.md](typing-independent-review.md) **8그룹 PASS**, 추가 제품 결함 없음. 별도 수치 oracle, 기존 4모드/100개 기록/일일 중복 방지, native false IME·중복 확정, render 전 옛 handler, 모드 왕복 타이머, locale/단위/명시 초점, paste/IME 키, 옛 복사 거부/현재 false 복구를 확인했다. 자체 검사와 구분한 증거다.

후속 실제 브라우저 결과: `batch5_verify`가 **5묶음 PASS·제품 결함 0**을 보고했다. 실제 영어 타이핑, 합성 KO composition 확정/중복/prefix 오타, 경계·정규화, 모드 왕복의 단일 타이머·기존 기록 bytes/URL 보존, native 복사·실패 선택·stale 처리, 기본 daily 통계 회귀, 320px EN 및 apply/retry/Esc 실제 DOM 초점을 확인했다. 실제 OS 한글 IME 검증과는 구분한다. 검증 Chrome 종료 후 전체 타입 검사를 통합 담당에게 넘겼으며 제품 TS는 고정했다.
