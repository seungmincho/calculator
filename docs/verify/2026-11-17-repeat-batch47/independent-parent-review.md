# 47차 실제 부모 독립 검토

2026-11-17. 실제 `TextDiffWorkspace`와 실제 `createLineDiffClient`, 병합/반출 helper를 연결하고 Worker/Clipboard/DOM 다운로드만 제어했다. 작성자 `line-merge-parent-harness.mjs`의 host/포트를 재사용했으며 작성자 assertion/검사 실행을 독립 근거로 합산하지 않았다. `LineMergePanel`과 `DiffCopyRecovery`도 부모가 제공하는 실제 props를 별도 hook host에 전달해 실행했다. 제품 파일은 root만 수정했다.

## 발견·해결

**P2: 원고 전달 대기 중 병합 선택/반출이 늦은 수신으로 사라짐.** `?from=writing-versions`의 0ms 수신 예약 뒤 병합 선택, 병합 복사/TXT, 비교 복사/TXT를 각각 실행했다. 원고가 뒤늦게 적용되면서 현재 결과·선택이 제거되고 raw가 consume됐다. 5동선 모두 `retained/rawPreserved/resultPreserved=false`였으며 자동 Worker는 0이었다. 계약은 이 동작도 사용자 작업으로 기록하여 pending 수신을 취소하도록 명시한다.

- 수정 전 근거: `independent-parent-handoff-before-fix.json`.
- 재현: `node docs/verify/2026-11-17-repeat-batch47/check-line-merge-parent-independent.mjs --handoff-only`.
- root 최소 수정: `choose`/`emitMerged`/`emitComparison`의 최신 객체·context 검사 통과 뒤 기존 `userAction()` 호출.
- 수정 후 5동선 모두 현재 결과/선택 및 raw 보존, edited 안내, Worker0 PASS. storage getter의 두 번째 읽기 중 병합 선택을 수행한 경계도 raw/현재 선택을 보존한다.

## 독립 검사 8그룹 PASS

1. 전달 대기 중 선택·양쪽 복사/TXT 5동선의 dirty 보호.
2. 마지막 성공의 부분 선택은 초안 편집·새 비교 중 추가 선택·실패·취소 뒤 유지. 새 비교 성공만 모두 원본으로 초기화. 같은 원문을 다시 비교해도 새 문서 객체/ID이며 이전 선택·copy·download callback은 영향을 주지 않음.
3. 실제 client가 content만 틀린 정상 형태, 잘못된 summary, 순차 번호, 비어 있지 않은 원문의 빈 응답을 거부. 마지막 선택 결과/초안 보존 및 Worker terminate. 빈 문서 0줄과 `CRLF/LF` 2줄을 구분.
4. 각 입력 정확1MiB에서 두 변경 구간을 조합한 전체2MiB 결과를 실제 Clipboard 요청/Blob에 그대로 전달. 실제 자식의 긴 줄 미리보기는 제한. 603줄 미리보기 페이지200행과 전체 TXT 분리, 빈 문서 복사와0바이트 TXT도 확인.
5. 비교/병합 copy→비교/병합 copy 또는 TXT 총8방향: 오래된 native 거부가 fallback/복구/성공 안내를 덮지 않음. 비교 기호 포함 문자열과 병합 완성 문서 및 파일명 구분.
6. 입력·선택·KO→EN→KO 왕복 뒤 pending fallback/성공 안내 부활 없음. 오래된 문서/locale callback 반출 차단, 옛2초 타이머 영향 없음.
7. 한글·surrogate pair가 포함된 전체80,005 UTF-16 복구 문자열은 명시 열기 전 textarea 미생성, 열린 필드는 readonly·전체값 유지. focus 예외 안내, 최신 재시도 성공, 옛 retry/close가 새 반출을 건드리지 않음.
8. Strict effect replay 후 정상 원고 전달 정확1회 소비·자동 Worker0. CRLF 원문 입력 유지 후 명시 비교. getter 중 선택 취소와 언마운트 후 옛 clipboard/출력 callback 무효화.

처음 두 그룹은 독립 수정 전 실행에서 PASS, 나머지 여섯 그룹은 수정 후 영향 실행에서 PASS했다. 고유 그룹8이며 반복 실행을 합산하지 않는다. 기존 독립 core/output9와 합계17그룹이다. 첫 실제 자식 결합 때 테스트 포트가 `WeakSet` brand를 가진 helper를 별도 번들로 이중 생성해 `invalidDocument`가 났으며, 동일 실제 모듈 포트를 전달하여 해결했다. 제품 결함으로 집계하지 않는다. Node의 기존 `MODULE_TYPELESS_PACKAGE_JSON` 경고도 실행 환경 경고이며 package를 변경하지 않았다.

범위 ESLint: `npx eslint docs/verify/2026-11-17-repeat-batch47/check-line-merge-parent-independent.mjs` exit0, 오류·경고0.

브라우저·실제 Worker 번들·OS Clipboard·다운로드 파일·모바일 렌더 검증은 전담 native 담당의 별도 근거다. 여기서 native 통과를 주장하지 않는다. 제품 TS/공용 번역/전체 tsc/빌드/배포/커밋 변경·실행 없음. 추가 미해결 제품 결함 없음.
