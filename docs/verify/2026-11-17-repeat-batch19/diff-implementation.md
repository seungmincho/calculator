# 19A 텍스트 비교 구현 기록

2026-11-17. 현재 상태: 18차 체크포인트 완료 신호 뒤 기존 `DiffViewer.tsx`를 새 `TextDiffWorkspace`에 연결했다. 실제 브라우저·독립 연결 검증 진행 중이다. 빌드·배포·커밋·Chrome·전체 타입 검사는 이 담당이 실행하지 않았다.

## 동작과 범위

- `lineDiff.ts`의 제한 있는 LCS를 `src/lib/diff/lineDiff.worker.ts`에서 실행한다. 문서당 UTF-8 1MiB·10,000줄, 공통 앞뒤를 제외한 sentinel 포함 DP 4,000,000셀을 유지했다. 기존 root 준비 8그룹 검사 뒤 도메인 코드/한도 변경은 없다.
- `client.ts`는 실행마다 별도 Worker를 만들고 완료/실패/취소 시 종료한다. 요청 번호와 활성 Worker identity, 한 번 완료 가드가 있다. 생성·postMessage·error·messageerror·잘못된 응답·30초 시간 초과를 구분하고, Worker 미지원에서 메인 스레드 LCS로 돌아가지 않는다.
- `TextDiffWorkspace.tsx`는 명시 비교 시 두 원문을 확정한다. 편집·좌우 교환·비우기·취소·새 비교·언마운트가 이전 요청을 무효화한다. 편집 후 이전 결과는 고지를 붙여 유지하며, 복사/다운로드 버튼 바로 아래에도 이전 입력 기준임을 명시한다.
- 화면은 200줄씩 전체/변경 줄 필터를 제공한다. 줄 번호는 원문 기준이다. 통계·복사·TXT 다운로드는 필터/페이지와 무관하게 전체 확정 결과를 사용한다. 한글·빈 줄·CRLF/CR/LF 정규화·끝 개행 구분·빈 문서 0줄 정책을 안내한다. 원문은 React 텍스트 노드로만 렌더링한다.
- 복사 성공은 Clipboard 완료 또는 `execCommand('copy') === true`로 확인한다. 거부/불가 시 읽기 전용 전체 결과와 선택 버튼을 제공한다. 이전 복사 완료가 새 입력/새 결과의 성공 안내가 되지 않도록 세대를 검사한다.
- `toolhub-text-comparison.txt`는 추가/삭제/유지 접두사의 읽기용 텍스트다. 표준 patch, 단어 비교, 공백 무시 기능을 주장하지 않는다. 다운로드 버튼은 요청 여부만 알리며 실제 파일 저장 완료를 단정하지 않는다. 원문 자동 저장/URL 노출/서버 전송은 추가하지 않았다.
- 짧은 번역 예제와 결과가 처음 보인다. 입력 수정이나 언어 변화 때문에 사용자 원문을 예제로 자동 교체하지 않는다. 디자인 토큰·16px textarea·44px 제어를 사용한다.

## 검사

- `scripts/check-line-diff-client.ts`: 13그룹 PASS. 최신 요청·취소·생성/전송/오류·30초 정책의 짧은 타이머 경계·잘못된 응답·한도·실제 Worker 모듈 VM 실행·Clipboard 성공/실패/stale를 검사했다. VM은 브라우저 Worker 실행을 대체하지 않는다.
- `scripts/check-line-diff-component.mjs`: 실제 컴포넌트 이벤트 8그룹 PASS. 명시 실행/편집 취소/오래된 완료·오류/교환·비우기·취소·unmount/실패 재시도/필터·페이지와 전체 내보내기/읽기 전용 복구/다운로드 오류/ko·en 빈 문서·변경 없음 구분을 검사했다. 브라우저 렌더러 대신 제어된 I/O와 hook harness를 사용한다.
- 독립 검토자가 순수 비교 4그룹(14,400 짧은 수열 쌍 oracle) 및 실제 별도 Node Worker 스레드 3그룹 PASS를 보고했다. 브라우저 Worker 번들 URL 검사는 별도다.
- 독립 재현 `check-diff-copy-generation.cjs`에서 새 비교 완료 뒤 이전 결과의 복사 성공이 표시되는 결함을 발견했다. 결과 교체 시 복사 세대와 복사/다운로드 안내를 초기화했고 같은 실제 이벤트 검사가 PASS로 전환됐다.
- 범위 ESLint는 새 UI/Worker/client/protocol/clipboard 및 자체 검사 스크립트 7개 파일에서 오류 0·경고 0으로 통과했다. 기존 부모 연결과 사용 방법/활용 사례 Guide 유지 뒤 부모·child lint도 오류 0·경고 0, 영향받은 실제 UI 8그룹도 다시 통과했다. 변경 없는 순수 도메인/Worker 검사는 반복하지 않았다.

## 통합/브라우저에 전달할 내용

- 번역: 같은 폴더 `translations-diff.json`의 ko/en `diffViewer` 심층 병합. 기존 `guide.whatIs`, tips, FAQ의 과장 기능 설명도 실제 줄 비교에 맞췄다.
- 공용 `src/app/diff-viewer/page.tsx`의 metadata/twitter/JSON-LD/FAQ/하단 본문에 있는 ‘붙여넣기만 하면 즉시’, ‘단어 단위 비교’, ‘Git diff와 동일’ 문구는 명시 비교·줄 번호/필터·전체 TXT 내보내기로 정리해야 한다. 계산 엔진은 bounded LCS이며 Myers/Git 동일 구현으로 설명하지 않는다.
- 확인 selector: 원문 `#diff-left`, `#diff-right`; 결과 `#diff-result`; 표의 `tr[data-diff-type]`; 수동 복구 `#diff-copy-fallback`. 한국어 버튼은 ‘비교하기’(기존 번역), ‘새 입력으로 다시 비교’, ‘비교 취소’, ‘전체 줄 보기’, ‘변경된 줄만 보기’, ‘전체 결과 텍스트 복사’, ‘전체 결과 TXT 다운로드’다.
- 실제 브라우저의 Worker 청크 로드/취소/실패·320px 긴 줄 국소 스크롤·다운로드 bytes·Clipboard 거부와 모바일 선택·ko/en/hydration 검증을 기다린다.
