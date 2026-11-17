# 52차 퍼센트 비교 — 실제 부모 연결

2026-11-17. `PercentCalculator.tsx` 연결 완료. 준비12(순수9+실제 자식3) + 실제 부모8 = **자체20그룹 PASS**, 기존 `scripts/check-percent.ts` PASS. 원래 `percent.ts` 수식·입력 해석·반올림 정책과 root의 `before-fix.json`/probe는 변경하지 않았다.

## 구현

- 기존8카드 각각에 명시 `비교에 담기`가 있다. 관련 raw 입력만 복제한 불변 snapshot(종류/원문/chain/dec/ko/value/unit/main/formula)을 메모리에 최대6개 유지한다. 입력·표시·한 줄 질문·계산 초기화를 바꿔도 담은 결과는 유지한다. duplicate/limit는 성공으로 표시하지 않고 기존 항목도 밀어내지 않는다. 단건 제거와 비교 목록 비우기는 기존 계산 값을 바꾸지 않는다. local/sessionStorage·서버·URL에 목록을 쓰지 않는다.
- `evaluatePercentCard`가 모든 required-input 분기 및 chain 분기에서 **formatter보다 먼저** 실행된다. finite operand의 Infinity/NaN 출력은 오류로 보이며 copy/add/result 숫자를 만들지 않는다. 실제0은 정상이고 빈값·zero-base·범위 오류는 기존 안내다. pp 상대비율/할인액 등 표시 부결과도 유한성 확인 대상이다. chain cp의 선택적/잘못된 값 무시 정책은 유지한다.
- 전체 비교 복사와 TXT는 클릭 당시 전 항목의 raw/formula/당시 설정을 한 번 직렬화한다. 같은 텍스트를 Clipboard 또는 UTF-8 Blob에 전달한다. TXT 성공은 다운로드 **요청**이며 실제 파일 저장을 보장하지 않는다. Blob URL은 요청 뒤 정리한다.
- 카드 숫자/목록/TXT가 **하나의 출력 owner**를 쓴다. 입력/표시 설정/한 줄 질문/목록/현재 언어·번역 도착/선택/언마운트에서 이전 token을 무효화한다. 늦은 reject는 legacy fallback을 시작하지 않으며 오래된 success/timeout도 최신 안내를 바꾸지 않는다. OS에 이미 요청한 Clipboard 쓰기 자체는 취소할 수 없다.
- API 없음/거부/동기 throw와 legacy false/throw는 성공을 표시하지 않는다. 실패 카드 바로 아래 또는 비교 패널 다음에 실패한 전체 문자열의 readonly16px 필드·선택·명시 retry/close가 나타난다. 입력/목록/언어 변화는 오래된 복구 필드를 비운다. 수동 선택은 Clipboard 성공을 의미하지 않는다.
- URL은 custom `useSearchParams`+`useHydrated` 뒤 active microtask로 최초 복원한다. ready 전 기본값 sync와 copy/add가 차단된다. 사용자 early intent가 생겼으면 늦은 URL은 덮지 않는다. 초기 복원만으로 URL을 다시 쓰지 않으며 첫 명시 입력/표시 변경부터 소유14키+c/d/k만 갱신한다. 외부 반복 query·hash·`history.state`는 그대로 유지한다. 기존 최초 복원1회 정책을 유지해 popstate 재적용 기능은 새로 추가하지 않았다.

UI는 비교 이동 링크와 펼쳐진 보조 패널, 모바일1열/큰 화면2열, 숫자 입력16px와 관련 버튼44px를 사용한다. 구형 copy의 하드코딩 오류 색과 모바일 열 생략을 해당 부모에서 토큰/명시1열로 정리했다. KO/EN 준비32leaf 그대로이며 guide/meta/canonical은 통합 담당 소유다.

## 검증과 관측

실제 부모8그룹:

1. 8종 기본 numeric copy를7500/25/33.33/62300/89000/44/2/100000과 대조,0/빈칸/기준0 구분.
2. 모든14필드+5단계/dec/ko 공유 복원, 초기/Strict replay URL쓰기0, 이후 외부 중복query/hash/state 보존, prehydration early edit 유지.
3. finite overflow6경로를 오류로 표시하고 copy/add/result가 없는지 확인. 큰 유효1e300 VAT는 임의 상한 없이 유지.
4. raw/dec/ko/unit snapshot·중복/6상한·제거·독립 reset/clear와 객체 불변성.
5. 한 줄 질문·수식 접기·5단계 연속 할인·선택 cp 무시·기존 snapshot 보존.
6. Clipboard 거부/throw/없음·legacytrue·전체 manual/retry·전체 TXT 내용/고정 파일명/객체 URL 정리·download 실패.
7. 카드→목록/목록→카드/목록→TXT의 늦은 reject fallback0, 입력·locale ABA/목록 변경/unmount 무효화.
8. StrictMode setup-cleanup-setup 이후 액션 정상, 옛1500ms timer의 새 성공 안내 침범0, locale ABA 뒤 늦은 성공 무효화.

최초 검사에서 initial restore 뒤 URL 정렬만 다시 쓰는 동작을 발견해 **edited 전 sync 차단**으로 좁혔다. fixture의 `window.location`을 native Location으로 가정한 assertion(URL 객체에는 searchParams가 있음)과 없는 recovery의 undefined/null 표현 두 건은 검사 fixture만 수정했다. root before-fix 관측은 덮어쓰지 않았다. 마지막 번역 namespace 도착 context 추가 뒤 교차복사/locale 영향1을 재확인했고 자체20에 더하지 않는다.

준비 자식 검사는 연결 후 `--connected`일 때만 원본 부모 SHA 비교를 생략한다. before-fix JSON bytes 보호는 항상 유지한다. 부모/출력 실제 연결은 별도8그룹으로 검증하므로 준비 자식 PASS를 부모 PASS로 대체하지 않는다.

```text
node docs/verify/2026-11-17-repeat-batch52/check-percent-parent.mjs
node docs/verify/2026-11-17-repeat-batch52/check-percent-children.mjs --connected
node scripts/check-percent.ts
npx eslint src/components/PercentCalculator.tsx src/utils/percentComparison.ts src/utils/percentComparisonActions.ts src/components/PercentComparisonPanel.tsx src/components/PercentCopyRecovery.tsx scripts/check-percent-comparison.ts docs/verify/2026-11-17-repeat-batch52/percent-parent-harness.mjs docs/verify/2026-11-17-repeat-batch52/check-percent-parent.mjs
```

위 제품/검사8파일 및 변경된 child 검사 MJS1파일, 합계9파일 ESLint exit0/경고0. 순수 준비9는 제품 유틸 변경이 없어 반복하지 않았다. 실제 OS Clipboard/네이티브 Chrome/전체 타입/build는 작성자가 실행하지 않았다. 계산 precision은 기존 JavaScript number의 범위이며 금융 정밀 연산으로 재설계하지 않았다.

## 독립/native API

`percent-parent-harness.mjs`는 generic29 host에 실제 부모와 실제 두 child를 각각 연결하고 Speech/RPC 없이 Clipboard/DOM legacy/Blob/URL/history/timer만 제어한다. 작성자 assertion은 `check-percent-parent.mjs` 별도 파일이다. 입력/목록 전환 함수·copies/fallback/downloads/history/oldTimers가 노출된다. 별도 기대값이나 native 검증에 필요한 포트만 재사용할 수 있다.

- `data-percent-ready` 후 초기 URL 조건을 검사한다. restore는 effect 내부의 이름 없는 active-guard queueMicrotask다.
- `data-percent-card/result/error/copy/add={of|ratio|change|discount|reverse|chain|pp|vat}`.
- 기존 입력 `#pc-a,b,p,w,f,t,dp,dr,rs,rr,cp,x,y,v`; chain `#pc-c0..4`, 한 줄 `#pc-q`.
- `data-percent-decimals=0..4`, `data-percent-korean/formula/reset`, `data-percent-chain-add`, `data-percent-chain-remove=i`.
- `#percent-comparison`, `data-percent-comparison-item/remove=id`, `-copy/download/clear/notice/status`, 상단 `data-percent-comparison-jump`.
- 복구 `data-percent-copy-recovery` 및 `data-percent-recovery-text/select/retry/close`. 전체 text readonly이며 성공 안내는 원래 카드 또는 비교 패널에만 표시한다.

제품 발견 대응을 제외하면 final ready 뒤 TS 편집을 중지한다. 독립/native/최종 타입 결과는 담당자의 후속 보고서에서 분리해 기록한다.
