# 52차 퍼센트 결과 비교 — 미연결 준비

후속 부모 연결을 완료했다. 아래는 준비 당시 기록이며 최신 상태/명령은 [implementation.md](implementation.md)에 있다. 자식 검사에 `--connected`를 주면 원래 부모 SHA 비교만 생략하며 기준 관측 JSON은 계속 보호한다.

2026-11-17. **순수9 + 실제 자식3 = 작성자12그룹 PASS**, 기존 `check-percent.ts` PASS, 제품/검사6파일 scoped ESLint exit0/경고0. 제품 TS는 이 준비 단위에서 고정했다. 부모 `PercentCalculator.tsx` SHA는 `before-fix.json`의 원본 SHA와 같고, 기준 JSON bytes와 `percent.ts`를 변경하지 않았다. 실제 부모/네이티브 검증과 연결은 다음 승인 뒤 진행한다.

## 파일과 API

- `src/utils/percentComparison.ts`: `evaluatePercentCard(kind, values, chain)`은 기존 8개 계산 함수를 그대로 호출하고 필수 입력·도메인 오류·주결과와 화면상 부결과의 유한성을 확인한다. `createPercentSnapshot(draft,id)`는 관련 raw input/key, chain인 경우에만 할인 배열, decimals/한글 표시, value/unit/main/formula를 복제·동결한다. 종류/입력 Record는 기존 부모의 TypeScript 내부 계약이며 저장 JSON parser를 추가하지 않았다.
- `addPercentSnapshot`은 동일 snapshot(종류/관련 원문/당시 설정/값·단위·표시·식) 또는 같은 ID를 중복으로 거부한다. 최대6개에서 기존 항목을 밀어내지 않는다. `removePercentSnapshot`은 순서를 유지한다. 전체 비우기는 부모의 독립 목록 상태를 빈 배열로 바꾸며 기존 계산 초기화와 분리한다.
- `percentComparisonText(items,t)`는 전 항목·관련 원문·당시 표시 설정·계산식을 순서대로 plain text로 만든다. 레이블만 현재 언어이고 main/formula/raw는 당시 문자열이다. CSV가 아니므로 수식 이스케이프나 숫자 변환 없이 원문 줄바꿈도 보존한다. 빈 목록은 빈 문자열이며 UI 반출을 막는다.
- `percentStateUrl(currentUrl,values,defaults,chain,defaultChain,decimals,defaultDecimals,korean)`은 기존 소유 키14개와 c/d/k만 교체한다. 외부 중복 query와 hash를 유지한다. `history.state`는 부모 호출부가 기존 객체를 그대로 전달한다.
- `src/utils/percentComparisonActions.ts`: `createPercentOutputOwner()` 한 개를 모든 카드 숫자 복사·전체 비교 복사·TXT에 공유한다. `begin/current/invalidate/mount/dispose` 토큰으로 A→B→A, 입력/선택/언어/목록 변화, StrictMode 재설정, 언마운트 뒤 완료를 무효화한다. `copyPercentText`는 실제 API 성공 또는 legacy true만 성공이다. 오래된 reject는 fallback을 시작하지 않는다. 이미 OS에 보낸 Clipboard 쓰기 취소를 보장하지 않는다.
- `downloadPercentText`는 클릭 당시 전체 문자열을 동기 캡처해 UTF-8 TXT Blob으로 요청하고 객체 URL을 정리한다. 성공 표시는 파일 저장 완료가 아니라 다운로드 요청 전송이며, 실패/빈값/오래된 소유권을 성공이라 하지 않는다. 파일명은 고정 `percent-comparison.txt`다.
- `src/components/PercentComparisonPanel.tsx`: controlled `items/status/notice`, `onRemove/onClear/onCopy/onDownload`. 자식은 전체 TXT를 클릭 시 직렬화해 callback에 전달한다. 메모리6개/새 방문 소실/다른 기준의 자동 우열 계산 없음 안내, 1열→2열 레이아웃과 모든 버튼44px를 제공한다.
- `src/components/PercentCopyRecovery.tsx`: `text/onSelectIntent/onRetry/onClose`. 실패한 대상의 **전체** readonly textarea(16px), 선택·재시도·닫기이며 자동 선택 실패를 정직하게 표시한다. 부모가 새 요청마다 key를 바꿔 수동 선택 상태를 초기화하고 선택 intent에서 기존 출력 소유권을 무효화한다.
- `translations-percent.json`: KO/EN `percentCalculator.comparison`과 `errors.overflow` 조각. canonical/messages/guide/meta는 이번 준비에서 미수정이다.

## 수치·표시 정책

비율/증감/연속할인은 `%`, 퍼센트포인트는 `%p`, 나머지는 기존 일반 숫자 표기를 유지한다. 결과의 반올림 문자열은 부모의 기존 결과 렌더에서 전달받으며 선택 당시 dec/ko도 기록한다. 한글·공백·콤마·지수 원문은 정규화해 저장하지 않는다. 계산 방식의 부동소수 정밀도는 기존 그대로이며 임의 금액 상한을 추가하지 않았다.

finite 입력의 multiplication/division/subtraction이 넘친 결과는 `overflow` 오류다. snapshot은 생성되지 않아 비교/복사도 막을 수 있다. 부모 연결 시 이 판정을 기존 formatter보다 먼저 적용해 Infinity가 round 과정에서0으로 바뀌는 기준 관측을 해결한다. `pp`의 상대비율 또는 할인액 같은 표시 대상 부결과도 확인한다. 0과 빈 입력은 다르며 0 기준 상대비율 없음은 기존 의미다. 연속 할인 cp는 기존에 선택적 입력이므로 빈값/해석불가/음수는 주결과 유효율을 막지 않고 금액 부결과만 생략하는 원래 정책을 유지한다.

## 다음 부모 연결 순서

1. `useHydrated`/초기복원 상태를 분리한다. 서버 빈 params로 초기복원을 완료 처리하지 않고 hydrated 이후 실제 주소를 한 번 읽는다. 초기복원 이전 사용자의 입력 intent가 있으면 늦은 URL 복원이 덮지 않는다. URL sync는 복원 결과 commit 뒤에만 시작한다.
2. 원래 v/chain/dec/ko·한 줄 질문·초기화/5단계 편집 흐름을 유지하면서 `evaluatePercentCard` 오류만 결과 formatter 전에 차단한다. 정상8종의 main/copy/formula는 기존 그대로다.
3. 유효 카드에 `비교에 담기`를 추가하고 관련 snapshot만 최대6개 목록에 담는다. 기존 계산 입력·표시를 바꾸거나 reset해도 목록은 유지한다. 목록 비우기는 원래 입력을 건드리지 않는다. 패널은 `#percent-comparison`, 상단 명시 이동 링크를 연결한다.
4. 카드/목록/TXT 모든 출력에 같은 owner를 사용한다. `useOptionalLanguage`의 실제 locale, 입력/표시설정/선택/목록 변경과 unmount는 세대로 무효화한다. UI 성공 timeout도 같은 토큰으로 검사한다. recovery는 `{target,text,request}`의 실패 snapshot을 쓰고 retry는 그 전체 텍스트만 사용한다. 새 입력/locale/목록 intent에서 오래된 recovery를 비운다.
5. URL 업데이트는 helper와 현재 `window.location.href`를 사용해 알 수 없는 query/hash/history state를 유지하고 값이 달라질 때만 replace한다. 비교 목록은 URL/스토리지에 추가하지 않는다.

root의 기존4관측은 그대로 두고 별도 after 검사를 만든다. prepared child가 통과했다는 사실을 아직 연결하지 않은 실제 부모 검증으로 표현하지 않는다.

## 검사

```text
node scripts/check-percent-comparison.ts
node docs/verify/2026-11-17-repeat-batch52/check-percent-children.mjs
node scripts/check-percent.ts
npx eslint src/utils/percentComparison.ts src/utils/percentComparisonActions.ts src/components/PercentComparisonPanel.tsx src/components/PercentCopyRecovery.tsx scripts/check-percent-comparison.ts docs/verify/2026-11-17-repeat-batch52/check-percent-children.mjs
```

순수9: 8종 기대값/unit·기존 오류, finite overflow/선택 cp, 동결·원문, 6개/중복/순서, 전체 TXT/원문 CRLF, query 소유권, 복사 실패/legacy, 교차대상·ABA·unmount, 전체 TXT dispatch/failure. 자식3: KO/EN 각각6개/전체 반출/비우기·제거 callback/빈 목록/44px, 전체 수동 필드/선택·재시도/실패 안내. generic29 host만 재사용하고 실제 자식 번들을 실행한다. 개인 입력·실제 Clipboard·Chrome·전체 타입/build는 실행하지 않았다.

## 안정 선택자

`data-percent-comparison`, `-item=id`, `-remove=id`, `-copy`, `-download`, `-clear`, `-notice=duplicate|limit|added`, `-status`. 복구는 `data-percent-copy-recovery`, `data-percent-recovery-text/select/retry/close`. 부모 카드 입력/복사/추가 선택자는 아직 미연결이므로 연결 시 별도 통지한다.
