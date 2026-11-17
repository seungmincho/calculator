# 48차 native 브라우저 검증

최종 **8/8 PASS**, 제품 결함0. 기존3039 서버에서 격리 Chrome·합성5문항/수정본만 사용했고 외부 요청을 차단했다. Chrome 종료 완료, 통합 담당의 최종 전체 타입 검사도 통과했다(2026-11-17 09:43:59 KST).

1. 이름 있는 초기 복원 microtask만 보류했다. 두 문항의 본문/제목/목표/기준·활성 문항을 실제로 편집하고 해제하여 편집 필드와 나머지 저장 필드가 정확히 병합됨을 확인했다. 재방문 복원과 초기 추가 쓰기0도 확인했다.
2. native Clipboard 성공·API 없음+legacy false·API 거부+legacy throw·전체 readOnly 선택·native 재시도가 통과했다. 문항A 대기→B 이동 후 옛 fallback0이며 입력/locale A-B-A에서 이전 성공 안내가 부활하지 않았다.
3. 정리·현재 문항 비우기·수정본 복원 undo, 다음 편집/동일 문자열 왕복 무효화, no-op, 탭 왕복을 확인했다. 수정본 복원 후 undo는 제목/본문/목표/기준4필드를 모두 되돌렸다.
4. 다른 실제 탭이 native WebLock을 보유한 동안 전체초기화→새 편집 또는 SPA 이탈→해제했다. 옛 remove0·최신 원고와 수정본 raw 보존, 새 명시 초기화는 자동초안 key만 삭제했다.
5. 손상 raw와 메모리 편집·quota 실패·명시 재시도·대기 중 최신 저장·외부 탭 CAS를 확인했다. 실패 주입은 제어 포트지만 저장/잠금/다른 탭은 실제 브라우저 API다.
6. 맞춤법 버튼은 Clipboard Promise가 대기 중인 클릭에서 고정 URL과 `_blank`/`noopener,noreferrer`로 `window.open`을 요청했다. popup은 mock만 사용했으며 원문 query/폼/네트워크 전송0, 외부 서비스 접근0이다. null 반환을 실제 차단 판정으로 확대하지 않았다.
7. 기존 수정본 JSON305바이트와 Diff 새 탭의 saved/current 원문·opener null·자동 Worker0·명시 Worker1·실제 TXT70바이트를 확인했다. 전송 시 원본 두 storage raw와 undo 소유권이 그대로였다.
8. 320px 다크 KO/EN 문서·body 폭320px, 필드16px/버튼44px 이상. 실제 키보드 Enter 전체 선택·언어 전환 중 본문 보존, 두 복구 PNG를 직접 열어 줄바꿈과 버튼 배치를 검토했다. 실제 OS 한글 IME 입력은 이번 검증에 포함하지 않았다.

첫7/8의 실패1은 Windows native Clipboard 읽기가 LF를 CRLF로 돌려준 것과 테스트의 문자 단위 기대값 차이였다. API에 제출한 `writeText` 문자열은 정확한 LF 원문임을 따로 확인했고 OS 읽기는 줄바꿈 정규화 후 대조했다. fixture만 수정하고 해당 복사1흐름만 재실행했다. 제품 변경/제품 결함으로 집계하지 않는다.

JS page error·hydration·unhandled rejection·원시 번역 키0. baseline5개와 clear baseline1개는 그대로 보존했다. 실행기 `scripts/check-repeat-batch48-browser.mjs`, 최종 `browser/final-results.json`, 각 evidence·실제 JSON/TXT·KO/EN PNG에 근거가 있다. 빌드·배포·커밋·별도 전체 타입 실행은 하지 않았다.

최종 타입 근거: 통합 담당 `node --max-old-space-size=2048 ... tsc --noEmit`,09:43:59 KST 시작·free3.36GiB·8.74초·exit0·진단0·chunk0f20ce(동기 종료로 session ID 없음). 첫09:40:26/session62674에서 useSpeakingRecorder.ts131 TS2367 한 건이 있었고 `pageHidden()` 최소 보완 뒤 hook hidden1+parent hidden1·lint0을 확인하고 전체 타입만 재검사했다. 이미 통과한 native는 그대로 보존했으며 새 브라우저 반복은 하지 않았다.
