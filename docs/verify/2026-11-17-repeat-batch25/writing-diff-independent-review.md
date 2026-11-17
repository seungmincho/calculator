# 25A 저장 원고 → Diff 독립 검토

2026-11-17 KST. 담당 `/root/taxi_repeat`. 계약·실제 source/target 부모·`writingDiffHandoff.ts`를 읽고 **독립 7그룹 PASS**를 확인했다. 재현 가능한 제품 결함이나 수정 요청은 없다. 제품 파일을 수정하지 않았다.

## 방법과 범위

작성자의 `check-writing-diff-components.mjs`에서 source/target의 제어 포트와 번들 harness를 메모리로 불러왔다. 작성자 테스트/단언은 실행하지 않고 별도 사건 순서와 기대값을 만들었다. 실제 `CharacterCounter`, `WritingVersionsPanel`, `TextDiffWorkspace`, 전달 helper와 기존 Diff 복사 helper를 사용한다. Storage/새 탭/DOM/Worker transport 및 훅 실행은 제어된 fixture다. 따라서 새 탭 브라우저 권한·실제 Worker 번들·native Clipboard·React StrictMode 실제 런타임·모바일 배치는 브라우저 검사와 구분한다. Effect setup/cleanup replay로 StrictMode에 해당하는 ticket 정리를 추가 대조했다.

| 그룹 | 확인 결과 |
| --- | --- |
| 1 | 실제 CharacterCounter의 5탭을 모두 전환하며 빈 글, CRLF/공백, 단독 surrogate, BOM/한글/이모지, 일반 글을 정확히 전달했다. 저장본의 sourceTab은 그대로, 현재 탭 번호는1~5로 전달된다. send는 source storage bytes/쓰기 수를 바꾸지 않는다. 마지막 탭 대문자 변환 뒤 팝업 실패에도 기존 undo로 원래5탭을 복원한다. |
| 2 | 새 탭 opener 제거가 무시되면 실패 탭만 닫고 대상 경로로 이동하지 않는다. 원래 탭의 URL·저장 bytes·복원 상태는 그대로다. |
| 3 | source의 두 번째 raw 재조회에서 저장본이 바뀌면 팝업을 열지 않고 충돌로 표시한다. 바뀐 저장 원문과 현재 입력을 보존하고 source 쓰기는 하지 않는다. |
| 4 | target의 첫 번째/두 번째 Storage 읽기 도중 입력을 편집하는 경합을 실제 입력 이벤트로 만들었다. 새 입력을 보존하고 payload를 소비하지 않는다. effect replay 뒤에도 덮어쓰지 않는다. |
| 5 | target이 이전 pair를 적용한 직후 조건부 삭제를 위한 세 번째 읽기에서 새 raw를 넣었다. 적용된 pair는 정확히 유지하고 새 raw는 삭제하지 않으며 cleanup 안내를 표시한다. locale/effect replay가 새 raw를 재적용하지 않는다. |
| 6 | 예제 결과 복사가 pending인 상태에서 전달 원문이 적용된다. 이전 Clipboard 성공/거부가 늦게 끝나도 성공 안내나 fallback을 실행하지 않는다. 전달 자체는 Worker를 시작하지 않는다. 시스템에 이미 넘긴 Clipboard 쓰기를 되돌린다는 보장은 하지 않는다. |
| 7 | 받은 글의 비교 직후 입력 편집으로 이전 완료를 무효화했다. 다음 명시 비교의 TXT는 old→final snapshot을 반영하며 중간 new 글을 섞지 않는다. 다시 복사 대기 중 입력을 바꿔도 이전 복사 성공을 표시하지 않고 이미 만든 TXT의 내용은 변하지 않는다. |

정적 검토에서도 명시 source marker·50,000자/문서·10분 TTL·v1 schema와 역할을 검증하며, 실패·미지원·미적용 전달을 조용히 삭제하지 않는다. popup 순서는 동기 user gesture 안에서 about:blank → target sessionStorage 쓰기/읽기확인 → opener 제거확인 → 고정 경로 이동이다. URL에는 원문을 넣지 않고 기존 TTS handoff 키와 분리된다.

## 실행 증거

```text
node docs/verify/2026-11-17-repeat-batch25/check-writing-diff-independent.cjs
Writing Diff independent actual-parent review: 7 groups passed; no browser

npx eslint docs/verify/2026-11-17-repeat-batch25/check-writing-diff-independent.cjs
exit 0 — 오류 0 / 경고 0
```

이 검토에서 Chrome/전체 tsc/빌드/배포/git 작업은 실행하지 않았다. 26A 미연결 준비 TS도 고정했다. 독립 fixture의 로컬 변수 이름 lint를 수정한 뒤 exit 0을 확인했고 제품은 바꾸지 않았다.
