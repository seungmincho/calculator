# 47차 병합 core/output 독립 검토

2026-11-17 KST. root가 작성한 **미연결** `src/utils/lineMerge.ts`와 `src/lib/diff/output.ts`를 검토했다. 제품 코드/공용 파일 수정 없이 별도 MJS 검사로 **9그룹 PASS, 재현된 제품 결함 및 수정 요청 없음**을 확인했다.

명령: `node docs/verify/2026-11-17-repeat-batch47/check-line-merge-independent.mjs`

범위 검사 파일 ESLint exit0/오류·경고0. 마지막 음수 페이지/MIME assertions 추가 후 영향2그룹도 재확인했다(9그룹에 중복 합산하지 않음).

작성자의 core9/output5 assertion이나 실행 결과를 재사용해 집계하지 않았다. 이전 읽기 probe는 설계 근거로만 읽었고, 이번 검사는 실제 새 제품 API에 대해 raw diff 행을 별도 순회하는 기대값과 Unicode code-point prefix oracle, 별도 output I/O 포트를 작성했다. 합계6,762개 선택/Unicode 절단 oracle 사례를 확인했다.

## 독립 9그룹

1. 중복 줄·빈 줄·CRLF/CR·Unicode의 짧은 원문 조합에서 모두 원본/모두 수정본이 정확한 LF 정규화 문장이 된다. 모든 변경 구간 선택 조합을 제품 block 내용이 아닌 raw diff 행 순회 oracle와 대조했다. choice 배열 순서를 뒤집어도 ID에 맞게 적용되며 전체 문자열·행 배열·행 수·UTF-8 바이트가 일치한다.
2. source gate가 content 변경·개행 삽입·좌우 번호·summary·행 누락/재정렬·type 변조를 거부한다. 빈 문자열의 `[]`와 한 빈 행을 join만 하면 같은 `''`가 되는 경계도 구분한다. 입력 byte/line 초과와 throw하는 응답 accessor는 false로 종료한다.
3. rows/blocks/각 원본 배열/choices/output의 모든 nested mutable container가 freeze되어 있다. 호출자의 원래 결과·선택을 나중에 바꿔도 snapshot은 유지된다. WeakSet은 spread/structuredClone/Proxy document 및 output을 거부한다. 서로 다른 snapshot ID의 옛 선택과 누락/중복/추가/prototype-only/잘못된 side 선택은 실패한다.
4. 이모지 기반 정확 1MiB 입력 두 개의 혼합 결과가 정확 **2MiB**로 보존되며 미리보기만 축약된다. 좌우 각10,000줄을 재구성하는 합성 정상 응답에서 선택 결과 **19,999줄**과 마지막 페이지199행을 확인했다. 이 두 번째 fixture는 **방어 gate/projection의 상한 근처 검사**이며, 4M DP 한도를 가진 실제 Worker가 해당 입력을 비교할 수 있다는 주장은 아니다. 실제 엔진의11,998줄 근거는 이전 읽기 probe와 분리한다.
5. per-row2,000/per-page50,000 UTF-16 제한을 독립 code-point prefix oracle와 대조했다. 페이지 줄 번호·omitted 합, 음수/무한/마지막 페이지 처리, surrogate pair의 중간 절단 방지를 확인했다. 원래 lone surrogate를 임의 정규화하지 않는 preview 정책도 확인했다. 빈 문서0줄/끝 개행2빈줄·0바이트 출력은 유효하다.
6. comparison/merged의 같은 문자열 A→B→A에서도 token identity가 달라 이전 성공 timer/close/retry가 새 상태를 바꾸지 않는다. dispose→activate 후 이전 native 거부는 fallback을 실행하지 않고 새 결과를 보존한다.
7. 양쪽 target의 copy/download 네 동작과 대기 copy를 조합한8경계에서 최신 요청이 이긴다. Object URL 생성 중 context 무효화가 재진입하면 파일 클릭 없이 URL을 회수하고 stale로 끝난다.
8. native 거부+fallback false는 실패이며 수동 복구 state는 전체 Unicode 문자열을 유지한다. 현재 실패 token의 재시도만 가능하고 fallback true를 성공으로 처리한다. TXT 실제 Blob의 전체 bytes와 MIME 경로·파일명·BOM 없음, 빈 문자열 복사·0바이트 TXT를 확인했다. dispose 뒤 타이머를 다시 실행해도 URL을 중복 회수하지 않는다.
9. 제품의 실제 기본 native fallback 경로를 제어 DOM으로 실행했다. textarea focus가 owner를 무효화하면 legacy execCommand0·옛 focus 복원0이다. 다른 요소가 새 초점을 소유하면 완료 후 그 초점을 뺏지 않는다. 공용 helper를 그대로 사용하며 공용 파일은 수정하지 않았다.

## 책임과 미검증 범위

snapshot ID의 단조 증가/새 성공 결과 reset은 이후 부모 책임이다. factory는 caller가 넘긴 유효한 ID를 사용하므로 같은 ID를 고의 재사용하지 않는 UI 연결을 후속 실제 부모 검사에서 확인해야 한다. WeakSet은 JSON/Worker로 다시 복제한 document/output을 수용하지 않는 현재 같은 realm API 계약이다.

20,000줄은 두 원문 합의 보수적인 상한이다. 검증된 source/단일 선택 규칙과 WeakSet을 우회해 20,001줄을 만드는 경로를 제품에 추가하지 않았으며, 강제로 내부 state를 변조한 테스트를 실제 사용자 경로라고 주장하지 않는다.

수동 복구 문자열은 output state에서 전체 보존됨을 확인했다. child의 표시/열기·선택 버튼·실제 브라우저 Clipboard, PNG/다운로드 UI, 부모의 locale/입력/Worker/25차 handoff 세대와 결과 reset 연결은 이 미연결 core/output 검토 범위 밖이다. root가 작성 중인 child 검사를 대신 실행하지 않았다. 이후 부모 연결 때 별도 검증한다.

Chrome·전체 타입·빌드·배포·커밋은 실행하지 않았고 44차 제품 TS 고정도 유지했다. Node의 기존 type-less TS import 경고만 나타났으며 package 설정은 바꾸지 않았다.
