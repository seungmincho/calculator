# 45차 — 글꼴 조합 백업·선택 가져오기

상태: 실제 부모 연결·작성자22·독립14(core8+실제 부모6) 통과. 실제 Chrome·최종 전체 타입은 아직 대기다. 제품 TS는 동결했다. 빌드·배포·커밋은 하지 않았다.

## 구현

- `src/utils/fontPairBackup.ts`: app=`toolhub-font-pair-profiles`, version1, ISO exportedAt, profiles의 엄격한 백업 wrapper. 파일은 UTF-8 65,536bytes까지이며 BOM 한 개를 허용한다. 기존 저장 key/스키마/최대6개/이름40 UTF-16/카탈로그 스타일 검증은 유지한다. JSON 안 임의 공백까지 포함한 파일 제한이며 기존 localStorage 20,000 UTF-16 제한과 별개다.
- 반출은 확인된 snapshot.raw를 다시 검증한다. 원고·현재 미리보기·로컬 폰트 파일·임의 CSS URL·추가 필드는 반출하지 않는다. 요청 굵기를 정확히 보관하며 화면에는 실제 지원되는 적용 굵기를 별도로 표시한다.
- 선택한 행의 이름을 편집하고 중복 이름 또는 잔여 슬롯 문제를 해결한 뒤 한 번에 추가한다. 이름 중복은 기존 NFKC+소문자 규칙이다. 전체 원본 파일이 유효해야 하며 미지 글꼴/미래 버전/부분 손상을 조용히 보정하거나 일부만 가져오지 않는다. 기존 조합을 자동 삭제하지 않는다.
- 가져오기는 준비 당시 raw와 잠금 안 최신 raw를 비교한다. 모든 ID는 현재 목록과 모든 원본 ID를 예약한 뒤 새로 만든다. 충돌하는 ID 생성기를 주입해도 제한된 접미사 경로로 새 ID를 만든다. readback이 다르거나 실패하면 `unknownWrite`, 이전 자료로 rollback하지 않는다. 관찰 콜백은 저장 확인 뒤 잠금 안 호출하며 콜백 예외가 이미 확인한 저장 결과를 실패로 바꾸지 않는다.
- `FontPairBackupPanel.tsx`: JSON 다운로드/파일 선택/행별 선택·이름·스타일/명시 추가/취소. 성공 후 저장 목록만 바뀐다. 현재 스타일에 적용하려면 기존 불러오기를 눌러야 한다. 파일 재선택·지연 읽기·읽기 실패·hide/pagehide·unmount·언어/문맥 ABA·대기 잠금 취소를 세대로 구분한다.
- `FontPairProfiles.tsx`: 새 패널을 기존 펼친 프로필 구역에 연결했다. 새로고침은 같은 raw여도 진행 중 가져오기를 취소한다. 기존 저장/삭제 대기 잠금도 이탈 뒤 쓰지 않도록 보완했다. StrictMode 효과 재활성화 뒤 이전 대기는 취소하고 새 작업은 가능하다. 기존 저장/불러오기/삭제·사용자 이름 입력·공유 URL 복원 대기는 유지한다.

## 작성자 검증

| 범위 | 결과 |
| --- | --- |
| `scripts/check-font-pair-backup.ts` | 새 core9그룹 PASS |
| `check-font-backup-child.mjs` | 실제 미연결 child7그룹 PASS |
| `check-font-backup-parent.mjs` | 실제 부모+실제 child6그룹 PASS |
| 기존 `check-font-pair-profiles.ts` | 16그룹 PASS |
| 기존 `check-font-pairing.ts` | URL/CSS/catalog/Unicode/weight 회귀 PASS |

작성자 신규 합계22그룹이며 다시 실행한 영향 검사는 중복 집계하지 않는다. 마지막 부모 영향검사는 효과 재활성화 이후 실제 새 저장 성공까지 확인했다. 실제 부모+child fixture는 React hook/event host와 storage/lock/file/download 포트를 통제한 검사다. 실제 브라우저/폰트 네트워크/레이아웃 검증으로 세지 않는다. 외부 `FontPairPreview` 전체를 실행한 검사도 아니다.

독립 작성자 writing_versions의 `independent-core-check.mjs`는8그룹을 통과했다. 최초 `onConfirmed` 예외가 확정 저장을 unavailable/quota로 오분류한 재현은 `callback-before-fix.json`에 보존했고, 수정 후 해당 경계만 재검사했다. 나머지 독립7그룹을 다시 집계하지 않았다.

제품/작성자 검사6파일 scoped lint 오류0·경고0. 마지막 부모 영향 수정2파일도 추가 검사 exit0·오류0·경고0이다. 독립 실제 부모6은 `independent-parent-review.md`에 별도 기대값·포트·원고/스타일 비적용·refresh/이탈 경합·JSON bytes 검증을 기록했고 검사 JS lint0이다. 번역은 `translations-font-backup.json`의 `fontPreview.pairing.backup` KO/EN fragment이며 canonical·생성물·가이드·메타데이터는 통합 담당이 반영했다.

## 다음 검증과 선택자

실제 폰트 미리보기 페이지에서 조합 모드를 연 뒤 `data-font-pair-profiles` → `data-font-pair-backup`을 사용한다. JSON 백업 다운로드→격리된 다른 브라우저 문맥 가져오기→기존 원고 그대로→명시 불러오기 후 두 실제 폰트 로딩을 확인한다. 파일 내용은 합성 스타일만 사용한다.

- `data-font-pair-backup-download`, `-choose`, `-file`, `-preview`, `-row="<sourceId>"`, `-confirm`, `-cancel`, `-error="<code>"`, `-saved`.
- 각 row의 checkbox/이름 input/요청·적용 굵기. 다운로드 파일명 `toolhub-font-pair-profiles.json`, JSON MIME. Blob URL은 기존 download owner가 정리한다.
- 실제 Web Locks 두 탭/지연 파일/저장 차단·quota·readback unknown/320 KOEN·키보드 초점·공유 URL/기존 저장·삭제를 검증한다. 저장소가 막히면 개인 데이터를 지우거나 강제 덮어쓰지 않는다.

순수 파일 크기 측정은 `backup-size-measurement.json`의 합성6개/예시 wrapper3,913bytes다. 모든 JSON 문자열 표현의 엄밀한 최대값이나 실제 기기 성능을 뜻하지 않는다.
