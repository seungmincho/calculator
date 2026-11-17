# 39차 정규식 추출기 부모 독립 검토

상태: 실제 부모/실제 hook/실제 client·protocol을 유지한 독립 9그룹 PASS. 초기 재현 3건은 작성자의 최소 보완 뒤 해결을 확인했다. 제품 TS 수정은 하지 않았고 41차 준비 TS도 계속 고정했다. 독립 JS 범위 lint는 exit 0, errors/warnings 0으로 확인했다.

## 검사 방법

`check-regex-parent-independent.mjs`는 작성자의 `regex-parent-harness.mjs`에서 제어 host/Worker·FileReader·clipboard 포트만 재사용한다. 작성자의 검사 파일과 assertion은 import하거나 실행하지 않는다. 실제 `RegexExtractor`, `useRegexWorkspace`, `createRegexClient`, protocol과 실제 `RegexResultPanel`을 실행하고 직접 정한 문자열·이벤트 순서·저장 필드·Blob bytes를 기대값으로 비교했다.

Worker 포트의 정상 응답 생성에는 실제 engine이 사용되지만 출력 기대값은 독립 literal이다. root의 이미 완료된 순수 oracle 4그룹을 다시 실행하거나 독립 결과에 합산하지 않았다. Node event fixture이며 Chrome Worker bundle, 실제 브라우저 렌더/hydration, OS clipboard, 스피커/서버 동작 검증을 주장하지 않는다. 위험한 역추적 정규식을 main thread에 실행하지 않았다.

## 발견과 수정 확인

`independent-parent-before-fix.json`에 실제 실행 관측을 보존했다. 기존 root의 before-fix 파일/원본 SHA 기록은 변경하지 않았다.

| 경계 | 수정 전 관측 | 수정 후 확인 |
| --- | --- | --- |
| 초기 URL 복원 전 편집 | 활성 `#regex-input`에 `typed-before-restore` 입력 후 0ms restore가 `url-old`로 교체 | early partial patch를 URL 복원 위에 반영. 해당 입력 보존·foreign 중복 query/hash/history.state 유지 |
| 공백 정규식 | pattern=`' '`은 `trim()` 검사 때문에 idle·Worker 0 | 빈 문자열만 실행 제외. extract/replace/grep 세 모드의 리터럴 공백 출력 일치 |
| 파일 대기 중 취소 | 메인 취소 뒤 reader.abort 없음. 늦은 onload가 원문을 교체하고 Worker 1개를 새로 실행 | 메인 취소/hidden/pagehide 모두 reader abort와 세대 취소. 늦은 onload 뒤 원문·마지막 성공·canceled 상태 보존, 재실행 0 |

추가 읽기에서 오래된 300ms debounce callback의 request/revision 선검사가 없는 점을 전달했다. 작성자가 독립 실행 전에 보완했으므로 이를 **수정 전 실제 재현 결함 수에 넣지 않는다**. 수정된 코드에서 캡처한 오래된 callback을 5회 강제 실행해 최신 Worker를 종료하거나 이전 작업을 시작하지 않음을 확인했다. 정상 native clearTimeout이 실패한다는 주장도 하지 않는다.

## 통과한 9그룹

1. 초기 사용자 입력 우선, 일반 URL 복원·Strict effect replay, unknown 중복 query/hash/history.state 보존.
2. 공백 한 글자 정규식의 extract/replace/grep과 정확한 결과 문자열.
3. 과거 debounce 소유권, 새 Worker 보존, 취소/숨김 후 자동 재개 없음, 명시 retry만 재개.
4. pending FileReader의 메인 cancel/hidden/pagehide 세 경로와 late onload 무효화.
5. invalidRegex 이후 마지막 성공 snapshot 유지, 현재 실패 입력 저장/링크 차단, 전체 Unicode 출력 복사·실제 UTF-8 Blob TXT·언마운트 URL 해제.
6. 구형 이력의 result.inputText fallback·비전역 flags·replacement 복원, 기존 inputs/result 필드와 전체 matchCount 보존, save 실패 안내.
7. dedupe가 이전 Worker를 대체하고 늦은 오류를 무시, 첫 등장 순서·uppercase·여러 글자 리터럴 구분자, 일반 편집의 transform 초기화.
8. output→link와 link→output 양방향 늦은 거절에서 fallback 금지, 오래된 성공 timer의 새 안내 삭제 금지, 입력 A→B→A와 KO→EN→KO 안내 부활 없음, unmount 뒤 거절 무효.
9. 실제 결과 child의 50k 미리보기와 60,001자 전체 수동 복구 구분, 명시 펼침, KO/EN 문구, 파일 대기 중 취소 버튼 활성.

부분 실행 selector가 중복으로 선택한 그룹은 다시 집계하지 않는다. 최초 4개 안정 그룹 뒤 나머지 5개를 실행해 총 고유 9그룹을 확인했다.

## 범위와 남은 검증

기존 화면과 최신 화면은 공용 `ShareResult`를 사용하지 않는다고 작성자와 코드에서 확인했다. 따라서 존재하지 않는 교차 ShareResult 경로를 추가하거나 통과했다고 기록하지 않는다. 실제 출력/링크/TXT가 같은 action guard를 사용하는 경로를 검증했다.

Worker transport를 제어한 것이므로 실제 브라우저의 5초 제한·CPU 응답성·숨김 정책·FileReader abort 이벤트 순서·native clipboard·320px 화면은 verify 담당의 별도 native 검증 범위다. 현재 독립 검사에서 남은 제품 수정 요청은 없다. 전체 타입·Chrome·build·canonical 변경은 하지 않았다.

## Native 통합 발견 이후 범위 정정

native 첫 진입에서 실제 i18n 모듈에 없는 `useLocale` import가 compile 500을 일으켰다. 작성자/독립이 공유한 host는 가상 useLocale를 제공했으므로 이 export 통합 오류를 잡지 못했다. 위 9그룹은 실제 모듈 export와 Next bundle 검증을 대신하지 않는다. 작성자가 부모를 실제 LanguageContext `useOptionalLanguage`로 수정하고 host도 그 실제 경로만 제어하도록 보완한 뒤, 독립 `--only=bidirectional`의 locale/copy 양방향·ABA 영향 1그룹을 재실행해 PASS했다. 이 영향 재실행을 총 그룹 수에 추가하지 않는다.
