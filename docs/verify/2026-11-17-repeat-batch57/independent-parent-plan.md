# 57차 OCR 실제 부모 독립 검토 계획

helper 독립12그룹은 완료된 준비 증거로 보존하고 반복 합산하지 않는다. 이 문서는 부모 연결 전 읽기 계획이며 아직 실제 부모 PASS를 뜻하지 않는다. 작성 담당 final ready 후 실제 `ImageOcr.tsx`를 실행하되 기존 I/O host만 재사용하고 assertion/기대값은 별도로 작성한다. 제품·공유 host·canonical을 수정하지 않는다.

1. **visible 원고의 하나의 기준**: 성공→편집→재인식 확인 취소는 원고/worker 호출 수 불변. 확인 후 pending/running/error에서도 textarea·개별/전체 복사·전체 TXT·OCR→TTS가 같은 이전 원고를 사용한다. 새 성공은 승인한 revision에만 적용하며, 새 편집/빈 편집/A→B→A는 유지한다. 복사 성공/복구는58 범위이므로57은 실제 넘기는 text snapshot만 검사한다.
2. **확인창과 현재 상태**: cleanup/reset/rerun의 확인 요청 후 편집/파일 추가·삭제/다른 작업 완료가 있으면 old 확인 handler로 작업을 수행하지 않는다. 취소는 설정 checkbox와 원고를 그대로 유지한다. 최신 cleanup 확인은 raw 기반 정리와 edited 초기화를 함께 적용한다.
3. **빈 페이지**: `{data:{text:'',blocks:null,confidence:0}}`를 정상 성공으로 처리한다. 편집 교체 승인 후 빈 새 성공은 이전 raw를 재사용하지 않는다. 인식 중 새 edited가 있으면 유지하고 ‘빈 새 결과+편집 유지’를 별도 표시한다. 실패는 빈 성공으로 오인하지 않는다.
4. **일시정지/계속/실패만**: current 완료 뒤 next 호출0, paused중 추가 파일·실패 retry가 자동재개0, 계속 뒤 목록 순서대로 처리. 실패 retry가 정상 완료 결과를 다시 인식하지 않으며 edited를 교체하지 않는다.
5. **실제 API adapter와 세대**: 설치 API 인수 위치에 맞는 explicit jobId·text/blocks 출력 옵션, 언어 변경의 reinitialize 및 현재 설정 snapshot을 확인한다. remove/reset/unmount/StrictMode에서 create/reinitialize/recognize의 늦은 완료·error/logger가 원고나 진행률에 붙지 않는다. create 미완료 reset 후 새 파일은 이전 생성/종료까지 기다린다는 안내를 확인한다.
6. **미리보기**: active A→B 혹은 회전/prep 변경 후 old decode reject와 old toBlob callback은 새 prepared preview를 지우거나 old URL을 붙이지 않는다. 각 임시/preview URL 회수를 확인한다. source/settings가 다른 OCR words overlay를 그리지 않는다.
7. **기존 입력/읽기 연결 회귀**: files/paste/drop 경로가 동일 자동 큐로 연결되고, active 선택만으로 유효 job은 취소하지 않는다. 화면의 edited selection과 전체 text가 기존 OCR handoff key/schema에 전달된다. 대상 30k 한도·빈 선택 안내는 기존 범위대로 유지하며 원고 본문은 URL에 넣지 않는다.
8. **실행 범위**: 합성2px Canvas/Blob·제어 decode/worker/Clipboard/sessionStorage만 사용한다. 실제 OCR 모델 정확도·native Worker 메모리·OS 이미지/Chrome 검증을 주장하지 않는다. KO/EN 안내 키와 input16px/control44px은 제어 DOM/별도 browser 검증으로 구분한다.

현재 연결 전 원본 source는 기존 automatic queue + workerRef/runningRef와 truthy done-only 반출을 사용한다. 그 이미 알려진 baseline 문제를 새 구현 결함으로 다시 집계하지 않는다. 부모 ready 시 실제 새 API/selector에 맞춰 이 계획을 구현한다.
