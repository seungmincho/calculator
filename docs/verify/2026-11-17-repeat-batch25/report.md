# 25차 완료 — 저장 원고의 줄 비교·같은 지뢰판 연습

2026-11-17 KST. 원고 전달과 클래식 지뢰판 재연습을 완료했다. 브라우저 **12/12 첫 실행 PASS**, 독립 **13그룹(원고7·지뢰판6)**, JavaScript/hydration/unhandled 오류0이다. 마지막 전체 타입 검사에서 오류 union 1건을 최소 수정하고 영향3그룹·lint 후 **2GB 전체 타입 재검사 exit0**까지 확인했다. 미배포 체크포인트다.

## 구현 결과

- 글자수 저장 목록의 명시 버튼에서 선택 저장본과 현재 탭의 원문을 클릭 당시 snapshot으로 새 Diff 탭에 보낸다. 기존 5탭·undo·저장 목록/복원/삭제/백업을 바꾸지 않는다. 클릭 직전 저장 raw를 재확인해 손상·충돌 목록을 현재 저장본처럼 전달하지 않는다.
- 별도 v1 payload는 두 문서 각각 최대50,000자·10분 만료다. 동기 사용자 동작에서 about:blank를 열고 새 탭 sessionStorage에 쓰기/읽기 확인, opener 제거 확인, 고정 경로 이동을 수행한다. 원문/제목을 URL·localStorage·로그·서버에 넣지 않는다. 실패 탭만 정리하고 원래 글과 목록은 유지한다.
- 대상은 marker와 유효 payload를 한 번 확인하며 먼저 편집/비교했다면 적용하지 않는다. 받은 내용을 확인하고 사용자가 비교해야 실제 Worker가 실행된다. 조건부 삭제 중 새 raw가 발견되면 새 값을 보존하고 안내한다. 정상 소비한 전달만 새로고침으로 다시 적용되지 않으며 전달 실패/만료 상태에서도 기본 Diff를 사용할 수 있다.
- 종료한 클래식 지뢰판의 원 배치·크기·first·noGuessFailed를 유지한 새 연습 상태를 만든다. 표식/실패/클릭/시간은 초기화하고 같은 첫 칸을 자동으로 연다. 첫 유효한 후속 행동부터 시계를 시작하며 자동 펼침만으로 끝나는 작은 판은 즉시0ms/0clicks 승리다.
- 연습은 BEST·업적·일일·이름 모달·리더보드에 추가하지 않는다. 반복 연습은 원본 배열을 바꾸지 않고 새 판/같은 난도/같은 classic 모드 선택도 일반 흐름으로 돌아간다. 입력 세대로 늦은 long-press/포인터/이전 제출을 차단한다. 기존 생성/솔버/일일 기록 알고리즘은 유지한다.
- character-counter/diff-viewer/minesweeper의 description/OG/Twitter/JSON-LD를 동일 상수와 실제 범위로 정리하고 menu updatedDate(2026-11-17)·showcase·발견 파일을 갱신했다. 기존 OG 이미지와 경로는 유지했다.

## 검사 근거

| 범위 | 결과 |
| --- | --- |
| 원고 자체 | 순수16·실제 부모10 = **26그룹 PASS**, 기존 Diff8·TTS51 PASS. 제품/검사5파일 lint0, 마지막 storage getter 영향2파일도 lint0. [구현 기록](writing-diff-implementation.md) |
| 지뢰판 자체 | 순수11·실제 부모/Clock11 = **22그룹 PASS**, 기존 생성/솔버/일일 회귀 PASS, 제품/검사4파일 및 마지막 fixture-only lint0. [구현 기록](minesweeper-replay-implementation.md) |
| 독립 | 원고7·지뢰판6 = **13그룹 PASS**, 검사 lint0, 추가 제품 수정 요청 없음. [원고](writing-diff-independent-review.md) · [지뢰판](minesweeper-independent-review.md) |
| 번역 | 최종 ko/en40 leaf/언어·정적 사용176개·오류0. 생성 및 messages:check **1,578개 일치** |
| namespace | apply추가0, audit own531·via child6·미해결0, 기존 동적안내60 |
| 공용 | 세 page/menu lint에서 기존 Minesweeper JSX 작은따옴표6진단을 HTML entity로 보완하고 해당page만 재확인해0. 다른공용진단0. discovery redirects472·RSS382·llms315도구/45,460byte |
| 전체 타입 | 최종 `node --max-old-space-size=2048 node_modules/typescript/bin/tsc --noEmit` **exit0**. 재검사 시작 전 `2026-11-16T19:19:31.172Z`(04:19 KST), 여유5.28GiB,9.2초 |

첫 전체 타입은 04:16:16 KST·여유5.12GiB에서 실행했고 `TextDiffWorkspace.tsx:90`의 `stale` 오류 union이 HandoffState와 맞지 않아 TS2345 한 건으로 실패했다. 담당자가 alive 검사와 outcome 분기를 분리해 명시적인 non-stale 오류만 전달하도록 좁혔다. StrictMode/late·deferred dirty·inaccessible/일반오류 영향3그룹과 해당파일 lint0 후 전체 타입만 재실행했다. 새 동작/번역이 없어 Chrome 검사를 반복하지 않았고 기존 전체10그룹을 중복 집계하지 않았다. 안정된26차 미연결 준비 TS도 전체 타입에 포함되지만26차 제품 완료 증거는 아니다.

지뢰판의 기존 Clock render Date.now purity는 interval의 state 갱신으로 최소 보완했으며 47ms 주기와 시간 정책을 유지했다. 부모 fixture의 mock/export 및 훅 포트 오류는 검사 조건으로 구분했다. 전체 저장소 lint 통과를 주장하지 않는다.

## 실제 브라우저

[브라우저 보고서](review-browser.md) · [원본 결과](browser/final-results.json): `checkedAt=2026-11-16T19:11:07.009Z`(04:11 KST), 원고6·지뢰판6 **12/12 첫 실행 PASS**, 오류0·Chrome종료. 마지막 타입 분기 보완 이전의 실제 브라우저 실행이며 그 후 영향은 위3그룹 검사로 구분한다.

- 실제 새 탭에서 양쪽 원문·opener=null·별도 sessionStorage 소비·원래5탭/목록/주소 bytes 불변을 확인했다. 원래 열려 있던 Diff 입력도 바꾸지 않았다. 자동 Worker0·명시 비교 Worker1이며 한글/CRLF/빈 줄/끝 개행을 담은 **111byte TXT**를 내려받고 두 원문으로 역해석했다. native Clipboard 읽기와도 Windows 개행 정규화 후 일치했다.
- 팝업/새 탭 저장소 차단·50,001자 거부·빈 현재 글·놓친 저장 이벤트, 미존재/만료/미지원/역할 역전 payload를 확인했다. 먼저 편집한 입력과 2차 읽기/3차 삭제의 raw 경합도 보존했다. 수신 후 swap·locale 전환은 재적용하지 않고 편집 뒤 TXT는 이전 확정 snapshot을 사용한다. 변경하지 않은 OCR→TTS 키도 최소 회귀로 한 번 소비·자동 발화 0을 확인했다.
- 실제 보드 UI 클릭으로 일반 패배→같은 배치 연습→반복 승패를 만들고 first/지뢰/count/크기/noGuessFailed를 비교했다. BEST·업적·일일·이름 raw bytes는 불변이며 다음 일반 승리는 기존 기록/모달을 유지했다. 작은 5×5/지뢰 1개 판의 자동 완료는 0ms/0clicks다.
- 이전 제출 callback과 늦은 포인터/350ms long-press는 새 판에 영향을 주지 않았다. 이미 시작된 일반 제출의 지연 응답도 연습의 이름/판/기록을 바꾸지 않았다. 실제 공개 서버 요청은0이며 메모리/로컬 route mock으로 차단했다.
- 320px 다크 KO source/EN target와 KO/EN 게임 화면에서 16px 입력·44px 새 조작·가로 넘침 없음·제목 HTML의 문자 표시를 확인했다. 검증 담당이 모바일 캡처 4개를 직접 검토했다.

## 범위와 다음 단계

새 탭·sessionStorage·번들 Worker·TXT·Clipboard·보드 클릭/키보드는 Chrome 실행이다. 차단/시간/지연 콜백/Storage 교체/터치/RPC는 제어 fixture이며 개인 원고나 공개 점수를 사용하지 않았다. 지뢰 배치는 React 상태를 읽어 안전 칸을 찾았고 게임 상태·생성/솔버를 바꾸지 않았다. 합성 터치를 실제 모바일 기기 검증으로 확대하지 않으며 서버 부정행위 방지·운영 정적 export도 범위 밖이다. 이미 시스템에 제출한 Clipboard 쓰기나 시작한 일반 점수 RPC를 취소/되돌린다고 보장하지 않는다.

범위 diff와 인계는 [통합 검사 기록](integration-checks.json)에 남긴다. 빌드·배포·커밋·푸시는 실행하지 않았다. 다음은 [26차 CSV·Base64](../2026-11-17-repeat-batch26/plan.md)이며 새 부모 연결에는 별도 검사가 필요하다. 이번 중간에 사용자가 추가 무료 쿠폰1개를 직접 사용했고 root가0%/100%/쿠폰1개를 조회해 담당을 재개했다. 에이전트의 초기화 실행이 아니며 계정 전체 스냅샷은 [root 사용량 기록](../../handoff/2026-11-17-usage-continuation.md)을 따른다.
