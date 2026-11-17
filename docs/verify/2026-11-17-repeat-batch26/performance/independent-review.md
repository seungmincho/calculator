# CSV 성능 후속 독립 검토

2026-11-17 KST. 제품 TypeScript를 수정하지 않고 Worker/client/protocol/preview와 최종 부모 연결을 검토했다. 원래 26차 결과는 그대로 보존한다.

**독립 Worker/유틸 8그룹 + 실제 부모 영향 3그룹 PASS, 추가 제품 결함 없음.** 두 검사 파일의 scoped ESLint도 오류 없이 종료했다. 실제 Chrome 성능 측정은 별도 `browser/` 결과다.

- `check-independent.mjs`: 실제 제품 Worker를 번들하여 Node worker_threads에서 실행. 독립 CSV 직렬화·객체 oracle로 구분자/헤더/특수 키/문자열과 UTF-8 BOM을 확인했다. 기존 브라우저의 200,000셀 JSON 3,480,002바이트와 정확히 같았으며 70개 미리보기 구간을 합쳐 원본을 복원했다.
- 전송 전 2MiB 초과 버퍼는 Worker 생성 없이 유지하고, 정확히 2MiB 버퍼와 EUC-KR은 실제 transfer로 분리 후 decode했다. 잘못된 UTF-8, decode 후 UTF-8 확장, flatten 중간 8MiB 초과는 부분 성공 없이 거부했다.
- 24개 변환/decode 소유권 전이에서 캡처한 옛 message/error/messageerror가 최신 작업에 영향을 주지 않았다. 모든 Worker terminate 1회, terminate 자체 예외에도 Promise가 정리됐다. 잘못된 응답 8종은 거부하고 유효한 논리 행/물리 줄 오류 위치는 보존했다.
- 45개 CRLF/astral 경계 배치에서 인접 구간이 정확히 이어졌으며 surrogate·CRLF 분할이 없었다. 부모 추가 검사에서 최대 50,001 UTF-16 구간도 확인했다.
- `check-parent-independent.cjs`: 작성자의 React/DOM 제어 포트 설정만 재사용하고 독립 이벤트 순서와 문자열 기대값을 작성했다. 변환 중 native 파일 선택 취소→새 확정→옛 응답, 복사 대기→전송 decode→새 확정→옛 거부, 50,001단위 페이지·전체 다운로드·dirty 상태에서 memoized 결과 유지와 반출 차단을 확인했다.

최초 부모 fixture의 surrogate 위치 기대값에서 header 길이를 한 글자 잘못 계산해 50,000단위로 나왔다. fixture 위치를 수정한 뒤 50,001단위 검사가 통과했으며 제품 변경은 없었다. Node의 MODULE_TYPELESS_PACKAGE_JSON 경고는 기존 TypeScript 모듈 로딩 방식이며 브라우저 런타임 판정과 구분한다.

`independent-results.json`과 `parent-independent-results.json`에 실행 시각·범위를 기록했다. Node Worker 시간은 Chrome 성능 수치로 인용하지 않는다. React 제어 host는 실제 브라우저 레이아웃/IME/Clipboard 권한 검증을 대체하지 않는다.
