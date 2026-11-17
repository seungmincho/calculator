# 38차 ShareResult 독립 검토

2026-11-17 KST, 담당 `team_rotation`. `plan.md`/`before-fix.md`와 실제 `ShareResult.tsx`/`shareResultActions.ts`를 읽고 별도 기대값으로 검사했다. 제품 TS/공용 번역을 수정하지 않았다. 31차 native 검증 발견 대응이 오면 그 작업을 우선한다.

## 결과

`node docs/verify/2026-11-17-repeat-batch38/check-share-result-independent.mjs` **7그룹 PASS**. 현재 추가 재현 결함이나 제품 변경 요청은 없다.

1. 최초 mount의 Strict effect replay 두 번 뒤 첫 저장·복사 정상, 같은 의미의 새 props 객체는 진행 중 작업 유지, A→B→A로 돌아와도 이전 scope 요청은 재활성화되지 않음.
2. tool/label/headline/sub/CTA/row/url/text/fileName/resultKey 각 의미값과 KO→EN 변경은 진행 중 복사를 무효화. 부모가 원본 행을 뒤늦게 수정해도 renderer가 받은 행은 분리된 당시 값이고 freeze돼 있음.
3. props 변경 없이 기본 `window.location.href`만 바뀐 copy/save/share의 늦은 완료는 새 URL과 옛 결과를 섞지 않음. 해당 응답이 정리되면 pending이 해제되고 새 명시 복사는 새 URL 사용.
4. native file payload의 파일명·실제 Blob 바이트·문구/URL, canShare 없음의 text payload, AbortError의 fallback0, 일반 오류/renderer 오류의 같은 URL 복사, share API 없음의 renderer0을 구분.
5. 긴 한글/HTML 모양 문자가 포함된 URL 전체가 readOnly textarea의 literal value로 남음. 선택 오류 안내→전체 범위 선택, 닫힌 recovery의 캡처된 retry 무효, 명시 재시도 성공으로 복구 종료 확인.
6. 새 요청 뒤 과거 Clipboard rejection은 legacy fallback을 실행하지 않음. 이전 성공 안내의 2초 callback이 새 실패 복구를 제거하지 않음. 언마운트 뒤 native share reject도 추가 복사/fallback 없음.
7. 클릭 완료한 Blob URL은 props 변경에 유지되고 30초 예약 또는 unmount에서 각각 정확히 한 번 해제. URL 생성/anchor click 실패는 저장 실패로 표시하고 재시도 가능. cleanup 뒤 이미 캡처된 release callback 재실행도 중복 revoke 없음.

## 독립성과 범위

검사는 작성자의 baseline/actual/pure assertion을 불러오지 않는다. 과거 19차의 일반 hook/DOM host와 29차 effect replay 확장만 재사용하고, 실제 ShareResult와 실제 actions를 번들해 실행한다. 시간·renderer·Clipboard·native share·DOM selection/anchor·URL 생성 포트만 제어한다. 의미값 변형, payload oracle, 실제 `Blob`/`File` 바이트, 30초 예약 기대값은 이 검사에 따로 작성했다.

Strict 검사는 개발 mount setup→cleanup→setup 이후 첫 사용자 동작의 경계다. 임의의 진행 중 사용자 작업 중간에 development mount replay를 삽입한 상황을 실제 React 사용자 흐름으로 주장하지 않는다. URL-only pending 검사는 오래된 응답이 settle된 뒤 해제되는 계약이며, 끝나지 않는 native Promise의 자동 timeout은 범위 밖이다.

실제 OS 공유창/다른 앱 전송, 브라우저 native Clipboard, PNG renderer 픽셀·폰트, 실제 DOM 포커스 이동/모바일 레이아웃은 이 fixture의 증거가 아니다. 이미 제출된 OS 공유·다운로드의 취소를 보장하지 않는다. native 담당의 별도 5흐름과 전체 타입 검사는 공용 완료 보고에서 구분한다.

검사 JS 1파일 scoped lint **exit0, 오류0·경고0**. Chrome·전체 tsc·빌드·커밋·배포는 실행하지 않았다.
