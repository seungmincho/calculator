# 37차 화면 비율 이미지 실제 검증 준비

현재 부모 연결 중이며 준비 계획이다. final ready와 번역 통합 뒤 단일 Chrome로 실행한다. 기존3039·격리 context·외부 요청/service worker 차단, 개인 사진 대신 검증기가 만든 작은 색 구역 PNG/JPEG만 사용한다. 새 패키지·전체 타입·빌드·서버 조작은 하지 않는다.

1. **초기 URL·finite·기존 규격:** w/h/lock/zone 공유값의 최초 복원과 입력 수정/새 방문, 명시 빈값·0/음수/Infinity·과도한 비율의 원문/오류·반출 보류. 정상16:9/9:16/1.91:1·비율 잠금·치수/CSS/ladder/resize 결과 회귀를 필요한 범위로 확인한다.
2. **실제9위치 PNG:** 가로 색 구역 원본의9버튼을 눌러 각 출력PNG 픽셀을 독립 cover 계산과 비교한다. 세로 원본의3개 수직 위치도 확인해 잘리지 않는 축을 구분한다. 임의 슬라이더 위치와 작은 preview raster를 같은 source rect 기준으로 대조한다. 전체9버튼이9개의 서로 다른 crop을 뜻한다고 주장하지 않는다.
3. **pad·alpha·실제크기:** 원본 투명도 crop, 검정/흰 pad의 색과 중앙 배치, safe zone은 DOM에만 있고 출력에 없는지 비교.8192² 요청은 실제4000²(정확16,000,000px) output, 너무 얇은0변은 반출 거부. 큰 출력을 반복 생성하지 않는다.
4. **형식/EXIF/경계·실패 교체:** PNG 실제header 우선·정적 JPEG/EXIF orientation,8MiB 초과/16,000,000px 초과 header는 decode0. SVG/잘린 파일/decoder 실패는 이전 정상 사진·crop 위치 유지. 정상 교체만50/50 초기화하며 원본/파일명을 URL/storage로 보내지 않는다.
5. **교체·삭제의 늦은 read/decode:** native read/decode는 실제 실행하고 완료 전달만 보류한다. A 대기→B/clear/SPA이탈 후 A가 돌아오지 않고 자기 Bitmap/URL만 정리. 실제 작업 종료 전에는 다음 decode/preview가 시작되지 않는 물리 gate를 확인한다. 독립 검토에서 발견한 dispose/remount 경계도 실제 Header SPA 이탈→뒤로가기→새 사진 선택으로 확인하며, 이전 toBlob callback 반환 전 새 adapter의 읽기0·해제 뒤 최신 사진만 반영·옛 다운로드0을 검사한다.
6. **실제 encoder gate·실패 재시도:** native toBlob callback 보류→위치/비율/사진 변경→새 요청에서 이전 자동 download0·동시 encoder 최대1·실제 callback 종료 후만 다음 작업 시작. null/실패 후 현재 사진 재시도, 완료 download Blob의 MIME/치수·소유URL 회수도 확인한다.
7. **현재 복사/수동 복구:** 치수·비율·CSS 사이 최신 요청, native Clipboard/legacy false·throw/선택·재시도, 입력·locale A→B→A·이탈 뒤 stale 안내/fallback0. 이미 OS에 제출한 작업 자체를 취소한다고 주장하지 않는다.
8. **320px 다크 KO/EN:**9위치·range·복구·실제 출력치수/자동축소 안내, 입력16px/조작44px·문서 overflow0·언어 변경 원본/위치 보존. JS/hydration/unhandled/raw key 수집.

픽셀 oracle는 제품 geometry 함수를 import하지 않는다. 실제 PNG decode/native Canvas draw와 제어한 실패/지연 callback은 보고서에서 구분한다. 정확한16,000,000 상한은 공용 QR16,777,216과 다르다. 검사실 Chrome의16MP 성공을 모든 모바일 메모리/코덱 성공으로 확대하지 않는다.

2026-11-17 07시 순서 조정: 36 Chrome8/8 완료·종료. 37 공유 physical gate 보완/독립/lint/freeze 뒤 통합 담당 전체 타입을 먼저 실행하고 PASS 신호 후 이8흐름을 시작한다. 이후 제품 TS 변경이 없으면 해당 타입 결과를 시점 명시해 재사용한다. 현 문서는 준비 상태이며 native PASS를 선기록하지 않는다.
