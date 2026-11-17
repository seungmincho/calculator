# 37차 종횡비 이미지 — 독립 검토

2026-11-17 KST. 제품 파일은 수정하지 않았다. 작성자의 assertion/개별 fixture는 재사용하지 않았으며, 실제 컴포넌트 실행용 범용 29차 hook host만 공유했다. 이미지 read/decode/canvas/encode·Clipboard·timer·URL은 별도의 합성 포트다. 실제 네이티브 이미지 픽셀·EXIF·DOM layout·Chrome 이벤트는 별도 브라우저 담당 범위다.

## 현재 판정

**독립 순수/adapter 7그룹 + 실제 부모 6그룹 + 수정 후 remount 영향 1그룹 = 14그룹 PASS.** 재현한 P2 1건은 작성자가 수정했고 독립 영향 재검사로 해결을 확인했다. 추가 제품 변경 요청과 미해결 항목은 없다. 실제 브라우저·전체 타입 완료 판정과는 별개다.

## 실행 근거

| 독립 검사 | 결과 | 주요 범위 |
|---|---|---|
| `check-aspect-independent.mjs` | 7그룹 PASS | 별도 cover/contain scale oracle 400조합, 반올림 출력·정확16m·8192·0변·1×8192, source rect preview/export 일치, decoded치수 실패 시 기존 source 보존, canceled decode/encode의 실제 finally 대기, immutable snapshot·해제 |
| `check-aspect-parent-independent.mjs` | 6그룹 PASS | 실제 부모+image panel+real adapter, URL 최초복원/earlyedit·hash/history, Strict effect replay 뒤 업로드, 실패 B 후 A/position 유지, bounded thin frame, late decode/clear/unmount, 취소 export의 늦은 다운로드 차단·명시 재시도·URL회수, raw/locale ABA 복사 |
| `check-aspect-remount-independent.mjs --reproduce` | 수정 전 결함 재현 보존 | old adapter dispose 뒤 new adapter에서 encode 중첩 |
| `check-aspect-remount-independent.mjs` | 수정 후 영향1그룹 PASS | old native finally 이전 새 read/decode0, 동시 encode1, source/canvas 정리 |

400조합은 5원본×5목표×4x위치×4y위치의 입력 수이며 별도 그룹 400개로 합산하지 않았다. 안전한 출력 크기는 긴 변8192 및 16,000,000 픽셀 이하라는 불변식으로 확인했다. 1×8192의 preview raster는 1×320, DOM frame style은 최종 1:8192 비율을 유지하고 정사각 bounded wrapper 안에 있다. 이는 코드/포트 검증이며 실제 화면 높이·폭의 관찰 결과는 아니다.

실제 부모 검사는 저수준 I/O만 치환하고 실제 `AspectRatio.tsx`와 `AspectRatioImagePanel.tsx`, 실제 adapter/기하 함수를 사용한다. source B read 실패 때 A의 이름·x73/y19·자원 생존을 확인했고, C 성공 후에만 중앙50/50 및 A close1을 확인했다. 복사 실패는 native 거부와 fallback false를 거쳤으며, 이전 raw→다른값→원래값 또는 ko→en→ko 뒤 늦은 reject가 fallback을 추가로 호출하지 않았다.

## F1: 폐기된 adapter의 native encode와 새 adapter 작업 중첩

**P2, 해결 확인.** Root의 읽기 의심을 별도 두-adapter 실행으로 확인했다. 수정 전 `createAspectImageAdapter`의 `tail/active`가 각 인스턴스에 있어 다음 순서에서 현재 페이지를 떠났다 돌아오는 경우의 물리 작업 대기가 이어지지 않았다.

1. A source를 읽고 `A.export`의 encode Promise를 미완료로 유지한다.
2. `A.dispose()`를 호출한다. 이전 반환값/다운로드는 취소되지만 native encode 콜백은 아직 끝나지 않았다.
3. 새 B adapter를 만들어 B source를 읽고 내보낸다.
4. A가 미완료인 동안 B의 read/decode/export가 완료된다. 제어 포트가 관찰한 최대 동시 미완료 encode 수는 2다.

원본 결과는 `remount-before-fix.json`에 보존했다. 이전 A의 늦은 결과 자체가 새 UI로 돌아오는 결함은 아니며, A가 끝나면 canvas와 source도 정리된다. **실제 메모리 사용량·OS 영향은 측정하지 않았다.** remount까지 단일 physical slot을 유지하는 것은 이번 37차 보완 정책으로 구분한다. 28차 gate가 이미 이 범위를 보장한다고 인용하거나 이전 완료 기능을 재인증하지 않는다.

작성자가 `browser.ts`의 Promise tail만 module scope로 옮겼다. source/preview 정리와 alive/active/pending 상태는 각 owner에 유지한다. 수정 후 같은 독립 스크립트를 `--reproduce` 없이 실행해 A의 실제 finally 이전 B read/decode0·동시 encode1·양쪽source close1을 확인했다. 이미 통과한 13그룹은 불필요하게 전체 반복하지 않았다. 이 gate는 같은 JS 모듈 인스턴스의 SPA remount 범위이며 별도 탭/문서 사이 전역 스케줄러가 아니다.

## 검사 도구·범위

- 순수/adapter 검사 파일 lint: exit0, 오류0·경고0.
- 실제 부모/remount 검사 파일 lint: exit0, 오류0·경고0. 독립 JS 총3파일 모두 통과했다.
- 최초 부모 fixture 실행에서 공용 `MobileResultLink`의 번역 공유 모듈이 host external에 없어 로드 실패했다. 비검토 하위 표시 컴포넌트를 포트로 명시한 뒤 6그룹이 통과했다. 제품 결함으로 집계하지 않는다.
- 39/40 준비 TS·37 제품·canonical은 변경하지 않았다. Chrome·전체 tsc·빌드·배포·커밋·실사용 이미지·원격 쓰기는 실행하지 않았다.
