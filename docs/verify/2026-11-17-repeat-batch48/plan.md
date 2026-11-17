# 48차 계획 — 글자수 세기 입력·복사·되돌리기 보호

상태: 완료(미배포). 작성자 18·독립 8·Chrome 8흐름과09:43:59 KST 전체2GB 타입 재검사·번역/범위lint/diff를 통과했다. [완료 보고서](report.md). 아래 실행 계약과 사전 조사/수정 전 근거는 이력으로 보존한다.

## 확인한 문제

root의 실제 기존 부모 제어 포트 검사 `check-character-baseline.mjs`와 `before-fix.json`을 읽었다. 정상 native 복사1건과 다음4건을 재현한 근거다. 이 파일과 기록은 수정하거나 새 근거로 덮지 않는다.

- native Clipboard 거부 후 execCommand가 false여도 복사 성공으로 표시한다.
- 문항A 복사 대기 중 B로 이동하면 오래된 A의 fallback 복사를 실행하고 B에서 성공으로 표시한다.
- 초기 저장본 복원 microtask보다 먼저 입력한 글을 복원값으로 덮는다.
- 정리 작업 후 사용자가 새 글을 입력해도 옛 정리 undo가 새 글을 지운다.

이 근거는 실제 컴포넌트 이벤트/효과를 실행한 제어 포트 결과다. 실제 브라우저 Clipboard/IME/저장소나 개인 원고를 검증한 결과로 확대하지 않는다.

root의 추가 재현 승인 뒤 `check-character-clear-baseline.mjs --record`로 전체 초기화 확인→lock 대기→새 입력→오래된 초기화 완료를 별도로 실행했다. 새 화면 원고가 빈 문자열로 바뀌고 자동 초안 key remove1회가 발생했다. 근거는 `clear-before-fix.json`이며 원래 baseline5건을 수정하지 않았다. 이후 autosave lock은 아직 실행하지 않은 상태이므로 영구 저장 손실까지 확정한 결과는 아니다. 이 확인된 추가1경계를 부모 generation/revision/operation guard 범위에 포함하도록 승인받았다.

## 개선 범위

1. 복사는 현재 문항·문서 revision·요청 token을 소유한다. 현재 요청의 native 성공 또는 실제 fallback true만 성공으로 표시한다. 거부/없는 API/false/throw는 전체 클릭 원문 선택·명시 재시도로 복구한다. 문항 이동·편집·복원·undo·초기화·locale·unmount는 이전 안내/fallback을 막는다.
2. 초기 화면과 첫 클라이언트는 기존 빈5문항/목표500/문자 기준을 유지한다. 읽는 동안 입력 가능했던 원문을 잃지 않는다. 실제 편집한 문항/필드는 현재 값, 나머지는 정상 저장본을 복원한다. 다른4개 원고를 버리는 전체 복원 skip 방식은 사용하지 않는다. 손상/read 차단 raw는 보존하고 메모리 편집을 허용한다.
3. undo는 단일 작업 token·해당 탭의 적용 후 revision·현재 탭을 확인한다. 정리/현재 문항 비우기/수정본 복원만 undo를 만들며, 같은 탭의 다음 실제 편집은 이전 undo를 무효화한다. 무효화 뒤 원문이 다시 같아져도 옛 token이 살아나지 않는다. 현재 수정본 복원은 제목/본문/기준/목표를 모두 되돌릴 수 있어야 한다.
4. parent autosave와 전체 초기화의 대기 lock을 제한적으로 검토한다. 전체 초기화 중 새 입력 삭제는 추가 probe로 확정했으므로 같은 parent 수명/최신 문서 revision 가드에 포함한다. autosave의 unmount/queued 경계는 구현 전 필요한 영향 probe로 확인하고 같은 callback 범위만 보완한다. 손상 원문 보존·raw CAS·readback·기존 잠금 helper와 schema는 유지한다. 별도 동의/자동 마이그레이션 UI는 없다.
5. 외부 맞춤법 버튼의 현재 await 뒤 window.open 순서를 읽기 확인했다. 클릭 gesture 안에서 외부 열기와 복사 시작을 수행하고 같은 copy owner로 실패를 안내하는 최소 정책을 설계한다. 외부 서비스에 원문을 URL/폼/네트워크로 자동 전달하지 않는다. 팝업/Clipboard의 전환경 성공을 보장하지 않는다.

## 그대로 유지할 계약

- `characterCounter.v2`: 정확5개 문항, 활성 문항, 제목/본문/목표/기준. 분석·UTF-8/한글 byte·X/원고지·읽기시간 공식, PRESETS와 정리 함수는 변경하지 않는다.
- 현재 문항 지우기 및 전체 초기화의 기존 명시 확인. 전체 초기화는 자동 초안 key만 지우고 수정본 목록은 건드리지 않는다.
- `characterCounter.writingVersions.v1`: 전체20개, 제목40, 본문50,000자/전체300,000자, 문항 출처 표시, 명시 비교/복원/삭제. 목록 기준과 저장소 parser를 새로 만들지 않는다.
- 11차 JSON 백업/선택 가져오기2MiB 및 quota/future/stale/ID 충돌 정책.
- 25차 수정본↔현재 원고 Diff handoff의 양쪽 역할/정확 원문/명시 새 탭/sessionStorage·TTL·한도. 부모 current/onRestore 연결만 필요한 범위에서 검사한다.

## 파일 소유·검증 예정

구현 담당: `CharacterCounter.tsx`, 필요한 신규 `characterCounterActions.ts`/`characterCounterDraft.ts`와 복구 자식, 의미 있는 도메인·actual-parent JS, 본인 KO/EN 조각. 기존 `charCount.ts`, `writingVersions.ts`, backup/diff helper는 우선 읽기 전용으로 재사용한다. canonical/가이드/메타는 통합 담당이다.

복사 포트 실패/늦은 성공·거부/탭·입력·locale ABA, 초기 microtask와 필드 병합, revision undo/수정본 복원, autosave/전체 초기화 lock 중 편집·unmount를 별도 기대값으로 검사한다. 실제 부모에서 기존5탭/목표·기준·version restore/backup/diff 연결을 필요한 만큼 확인한다. native Clipboard/Tab/IME/팝업·320 KOEN는 verifier, whole tsc는 integrate 담당이다. 빌드·배포·커밋을 하지 않는다.

세부 API와 접점은 [design.md](./design.md)에 기록한다. 추가 autosave 위험은 아직 읽기 발견이며, 실행한 clear1건은 원래4결함과 근거 파일/범위를 구분한다.

추가 제어 포트 baseline1건 재현·해당 MJS scoped ESLint exit0/오류0/경고0은 구현 전 근거다. 후속 구현의 반대 기대값은 별도 새 검사에서 확인했으며 원래 baseline JSON/MJS는 보존했다. canonical은 통합 담당 소유다.
