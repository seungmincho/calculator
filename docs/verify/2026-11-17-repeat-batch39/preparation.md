# 39 정규식 — 미연결 준비 완료

2026-11-17 KST.33/34 전체 타입 첫 PASS 뒤 승인된 신규 준비다. **RegexExtractor 부모/기존 계산 이력/공용 번역은 수정하지 않았다.** 제품 연결은36/37 전체 체크포인트 뒤 별도 신호를 따른다. 새 TS는 아래 단위까지 안정·편집 중지하며 별도 전체 타입 조율에 응답한다.

## 완성 파일/API

- `src/utils/regexEngine.ts`: `RegexJob`, `captureRegexJob`, `executeRegexJob`, `advanceRegexIndex`, `regexBetweenPattern`, `REGEX_LIMITS`. 제품에서 execute는 Worker만 호출한다. capture는 타입/길이/projection/freeze만 하고 RegExp를 컴파일하지 않는다.
- `src/lib/regex/protocol.ts`: 요청 id/revision,응답·상세preview 한도/카운터 검증,typed error. `client.ts`: `createRegexClient().run(job, revision)`, `cancel()`, `dispose()`. `regex.worker.ts`: 실제 순수 엔진을 실행하는 전용 Worker. 기존 Diff 파일은 수정하지 않았다.
- `src/utils/regexSnapshot.ts`: `createRegexDraft`, `restoreRegexUrl`, `updateRegexUrl`, `regexJobKey`, 소유 key 목록. DOM/history는 직접 쓰지 않는 순수 helper다.
- `scripts/check-regex-engine.ts`, `check-regex-client.ts`, `check-regex-snapshot.ts`.
- `translations-regex.json`: KO/EN `regexExtractor.execution`52leaf,placeholder 대조 일치. 아직 미연결 문구이며 canonical 병합은 integrator 소유다.

## 의미·메모리 경계

입력1M/패턴10k/치환100k/출력4M UTF-16,탐색 일치100k,파일4MiB,기본 timeout5초,출력preview50k,상세5개/총20k/필드2k/캡처20개다. 이모지 코드유닛 길이와 Unicode 빈 일치의 코드포인트 진행을 구분한다.

출력 builder는 append할 원문 구간의 길이를 먼저 확인하고 조립한다. 앞/뒤 문맥 및 캡처가 반복되는 거대한 치환 문자열을 먼저 만들고 나중에 검사하지 않는다. 작은 조각은8k 또는1024조각마다 합쳐 무제한 작은 배열도 피한다. 상세는 잘린 preview와 전체matchLength/groupCount/생략 flag를 갖고,전체output/총matchCount를 변경하지 않는다. grep의 display matchCount는 일치 행 수,scannedMatches는 내부 탐색 개수다.

JS token 의미는 [ECMA-262 GetSubstitution](https://tc39.es/ecma262/multipage/text-processing.html#sec-getsubstitution) 및 [MDN replace](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/replace)를 대조했다. 없는/미일치 capture,두 자리/한 자리,명명 capture,달러 및 원본 앞뒤 문맥을 보존한다. 같은 RegExp를 grep행에 재사용해 global의 행별 reset와 nonglobal sticky의 행간 lastIndex를 보존한다. nonglobal extract는 전체 일치+captures join 의미다.

스마트 uppercase는 명시 enum으로 match문자에 대문자화를 적용한다. 여러 글자 구분자는 리터럴 앞/뒤와 첫 종료문자열을 찾는다. dedupe는 원래 첫행 순서를 지키는 별도 job이어서 이전 job을 취소한 client에 이어 실행할 수 있다. 부모의 기존 debounce 취소 연결 자체는 아직 남아 있다.

## 자체 검사 —23그룹

```powershell
node --experimental-strip-types scripts/check-regex-engine.ts
node --experimental-strip-types scripts/check-regex-client.ts
node --experimental-strip-types scripts/check-regex-snapshot.ts
npx eslint src/utils/regexEngine.ts src/utils/regexSnapshot.ts src/lib/regex/client.ts src/lib/regex/protocol.ts src/lib/regex/regex.worker.ts scripts/check-regex-engine.ts scripts/check-regex-client.ts scripts/check-regex-snapshot.ts
```

- engine **10그룹 PASS**, 별도 JS내장 oracle **13,548개**: root정상4회귀,빈일치/끝/서로게이트/u/v,LF/CRLF,grep g/y행간state,치환토큰/캡처,임의 짧은문자열,스마트3종,한도정확/초과,상세preview경계.
- client/protocol **8그룹 PASS**: 불변 요청/id·revision,늦은A→B→A,취소·dispose,생성/post/error/messageerror/프로토콜오류,typed error,실행전길이제한,timeout후재시도. 실제 제품 Worker 모듈을 esbuild 메모리 번들로 만들어 Node worker_threads에 연결했다. **실제8스레드 생성/8종료**. 위험 `(a+)+$`는 별도 스레드에서만 실행하고 진입신호 뒤300ms 테스트 deadline에서 종료했으며 parent heartbeat가 계속 움직였다. 제품 기본 deadline은5초다. 종료 promise까지 기다렸다.
- URL **5그룹 PASS**: 기존 pattern/input의 이중 인코딩,단일 인코딩 replacement,빈flags와absence구분,malformed percent 원문보존+안내,enum/중복값안내,정확16,384/초과,Unicode인코딩확장,unpaired surrogate,모든실패의stale소유key제거와unknown중복query/hash유지,작아진snapshot정상복구,transform왕복.
- 신규8파일 scoped ESLint **exit0·오류/경고0**. 전체 tsc/Chrome/build/배포/커밋은 실행하지 않았다.

처음 CRLF fixture의 제외행을 `none`으로 두었는데 `/one|two/`는none에도일치하므로 예상이 틀렸다. 제외행을skip으로 바꾼 fixture 수정만 있었고 제품결함으로 기록하지 않는다. Node의 MODULE_TYPELESS_PACKAGE_JSON 경고는 기존 npm/package 설정에 따른 것이며 기능/검사 실패는 아니다.

Root 별도 독립 순수 oracle **4그룹 PASS**(치환45,738·추출2,178·grep2,178·Unicode인덱스)는 `independent-core-preparation.md`에 독립 기록되어 있다. 자체13,548과 합쳐 독립 검증 수로 중복 주장하지 않는다.

## URL와 남은 부모 연결

소유 key는operation/pattern/flags/replacement/input/transform이다. updateRegexUrl은 성공이면 완전한shareUrl,실패이면 shareUrl:null과 **모든옛소유key가제거된href**를 돌려준다. unknownquery/hash를 보존하며 history.state는 향후 부모 replaceState가 기존값을 그대로 전달해야 한다. 긴입력/깨진문자를 일부 잘라 공유하지 않는다. flags가명시빈문자면nonglobal로 유지한다. replacement는 옛 writer가 한 번만 인코딩했으므로 URLSearchParams로만 복원하고,pattern/input만 추가decode한다.

부모 연결 시 필요한 항목:

1. hydration1회복원/동기화ready가드,이후자기URLwrite와외부restore분리,300msdebounce와input revision. cancel한동일revision은자동재실행억제.
2. hidden/pagehide에서 debounce/현재Worker취소·성공snapshot보존·복귀시자동재실행금지. 브라우저 background timer throttling 때문에5초를 엄격wall-clock보장으로 설명하지 않는다(번역도중단기준으로표현).
3. 파일입력4MiB/디코딩1M,최신선택/본문편집/abort/onerror/동일파일재선택. 현재준비에는파일reader/action UI가 없다.
4. 이전성공snapshot표시와저장/공유일치,현재실패와이전통계혼합방지,empty성공표시,50k출력preview/전체TXT,clipboard·링크양방향소유권/실패선택복구. 기존이력schema유지·replacement와matchCount우선복원·저장실패안내.
5. 실제원본부모의스마트3재현회귀,KO/EN16px/44px/320px·가이드/메타정합성,실제Chrome Workerbundle/취소/복사/TXT. 그 뒤모든TS고정하고integrator전체타입검사.

이 준비는 신규 helper/Worker만 완료한 상태이며 기존 사용자 화면의 멈춤 문제가 이미 해결됐다고 주장하지 않는다.
