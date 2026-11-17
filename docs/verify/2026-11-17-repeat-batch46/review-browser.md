# 46차 읽기 목록 native 검증

**8/8 PASS**, Chrome 종료. 격리 Chrome에서 실제 DOM/Storage/Web Locks와 합성 SpeechSynthesis를 사용했다. 실제 OS 음성 합성·사람 원고·마이크·모델·외부 요청은 사용하지 않았다. 통합 담당의 최종 전체 타입 검사도 통과했다(2026-11-17 09:43:59 KST).

- 두 번째 문장을 읽다가 멈춘 위치/index·offset·raw 원문·속도를 저장했다. 반복 pass는 저장하지 않으며 새 방문 URL 원고가 우선하고 목록 초기쓰기0/자동 발화0이었다.
- 명시 확인으로 열면 반복 해제·stopped·저장 문장 위치가 반영되며 Play만 해당 문장을 읽었다. 이전 utterance end/error는 무효, 삭제/재조회는 현재 원고·읽기를 바꾸지 않았다.
- remote만 있고 local-only면 재생 비활성/발화0, local 도착만으로 자동 재생0. 실제 부모에 voiceschanged([])를 전달한 뒤 버튼과 다음 문장 모두 차단됐다. 이 항목은 독립 P2 수정 영향이다. 직접 음성 선택은 늦은 목록 갱신에도 유지했다.
- 두 실제 탭 Web Lock으로 queued load 중 편집/이탈을 확인했다. 최신 원고 보존·새 확인 load 성공·다른 탭 저장 event 충돌·목록 재조회 시 원고 불변이었다.
- 손상/future 원본을 보존하면서 일반 읽기는 가능했다. quota 실패는 이름/원문을 유지, readback 실패는 이미 저장된2개를 되돌리지 않고 쓰기를 막았다. 명시 재조회로 복구했다.
- 저장 위치 불일치 시 첫 문장 안내/무자동재생,139 ASCII+emoji 경계의 surrogate pair·offset 보존,30,001자 저장 거부/원문 보존,8개 상한/40자 이름 제한을 확인했다.
- 이전 clipboard.readText 완료가 열린 원고를 덮지 않았고 이전 링크 거부도 안내를 되살리지 않았다. 오류 난 두 번째 문장 저장/명시 재시도와 옛 end 무효, native 링크 payload를 확인했다.
- 320px 다크 KO/EN에서 body/문서320px, 입력16px/동작44px 이상, 실제 Enter로 열기 확인을 검증했다. 두 목록 캡처를 직접 열어 문구/버튼 줄바꿈을 확인했다.

신규 native 제품 결함0, 첫 실행8/8. Speech callback/음성 목록·Clipboard 지연·Storage quota/readback은 제어 포트이고 실제 발음/OS 권한을 검증한 결과가 아니다. JS page error/hydration/unhandled rejection/원시 번역 키0. 외부 분석/광고 차단 로그는 보존했다. 근거는 browser/final-results.json·각 evidence·KO/EN 캡처, 실행기는 scripts/check-repeat-batch46-browser.mjs와 browser-fixtures.mjs다.

Native 이후 한도/긴 원문/저장 크기 안내3키와 FAQ를 일부 이모지2자 계산·초과 시 원문 유지로 정밀화했다. 제한값/키/placeholder/제품TS 변경0, 통합 담당 정적102사용·생성1578 PASS로 확인했으며 native8개에 추가 집계하지 않았다.

검증 소유4개 runner/4개 fixture의 scoped ESLint를 완료했다. 재사용 header의 미사용 helper 경고4개는 해당 함수/참조를 제거해 해결했고 최종 오류0·경고0이다. 제품 파일은 수정하지 않았다.

최종 타입 근거: 통합 담당 `node --max-old-space-size=2048 ... tsc --noEmit`,09:43:59 KST 시작·free3.36GiB·8.74초·exit0·진단0·chunk0f20ce(동기 종료로 session ID 없음). 첫09:40:26/session62674에서 useSpeakingRecorder.ts131 TS2367 한 건이 있었고 `pageHidden()` 최소 보완 뒤 hook hidden1+parent hidden1·lint0을 확인하고 전체 타입만 재검사했다. 이미 통과한 native는 그대로 보존했으며 새 브라우저 반복은 하지 않았다.
