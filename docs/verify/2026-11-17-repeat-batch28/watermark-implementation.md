# 28 이미지 워터마크 부모 연결

2026-11-17 KST. 기존 `ImageWatermark.tsx` 경로가 새 `ImageWatermarkWorkspace.tsx`를 렌더하도록 연결했다. 새 유틸/어댑터를 완성한 뒤 마지막으로 부모를 연결했으며 canonical 번역·메타는 통합 담당이 반영했다. 제품 TS는 검증 대응을 제외하고 안정 상태다. 빌드·배포·커밋·자체 Chrome·전체 tsc를 실행하지 않았다.

## 현재 동작

- 기존 텍스트/이미지 로고·9위치·폰트/크기·색/굵기·회전·여백·투명도·타일과 원래 크기 PNG를 유지한다. 사진10개/8MiB/합계40MiB/16MP, 로고4MiB/4MP, 문구200 code point·줄바꿈→공백·#RRGGBB, 타일10,000회, 결과80MiB를 검증한다. PNG/JPEG/WebP/GIF의 정지 프레임만 지원한다.
- 사진 추가는 선택 사진의 축소 미리보기만 준비한다. `모두 만들기`에서 현재 설정과 대상 ID를 확정하며 이후 추가한 사진은 다음 명시 시작까지 대기한다. 큐/선택/순서/파일명은 안정 ID와 File 참조로 구분한다. 실패 행은 보존하고 다른 사진은 계속 처리한다.
- 미리보기·실제 출력·로고 검사는 하나의 직렬 작업 gate를 공유한다. 내부 로고 decode는 gate를 재획득하지 않는다. 중지/설정 변경/삭제/reset/언마운트가 발생해도 이미 시작한 decode/toBlob의 실제 finally까지 슬롯을 유지한다.
- 새 로고 확인 중에는 만들기/반출을 막고 기존 결과와 ZIP을 무효화한다. 새 로고 실패는 마지막 유효 로고를 보존한다. 사진 비우기는 옵션·기존 유효 로고를 유지하되 늦은 새 로고/미리보기를 무효화한다. 전체 초기화는 문구·옵션·로고도 초기화한다.
- 현재 설정의 완료 PNG만 반출한다. ZIP은 클릭 당시 선택된 완료 Blob 참조와 안전한 중복 이름을 확정한다. 이후 선택/행 삭제는 그 ZIP을 바꾸지 않으며 설정/reset/언마운트는 늦은 자동 다운로드를 막는다. 취소된 encode의 실제 종료까지 ZIP busy를 유지한다. 저장 시작 실패는 결과를 남겨 재시도할 수 있다.
- 앱 언어 변경은 사진·사용자 문구·옵션·출력을 바꾸지 않는다. URL/localStorage/sessionStorage에 사진이나 문구를 쓰지 않는다. 주요 조작44px, 입력16px, 모바일1열, 결과 이동 링크를 적용했다.

## 자체 검사와 독립 발견 대응

준비 순수7 + 큐/게이트/ZIP10 + 브라우저 어댑터 포트8 = **25그룹 PASS**. 순수/어댑터의 이전 통과 검사는 변경이 없어 반복하지 않았다. 큐는 독립 발견 수정 후 관련10그룹을 재실행했다.

독립 담당이 `a 실패 → b 진행 중 중지 → b 늦은 완료 → 실패만 재시도`에서 b/c 정상 대기 행까지 다시 시작되는 것을 재현했다. `retryFailed`가 이번 실행 membership을 실패한 ID만으로 교체하고 이전 세대를 취소하도록 최소 보완했다. 중지된 정상 대기 행은 다음 명시 `모두 만들기`까지 유지한다. 자체 추가1그룹과 독립 영향 검사가 통과했다.

`node scripts/check-image-watermark-components.mjs`의 실제 workspace **7그룹**과 마지막 기존 부모 연결 전용 **1그룹**, 합계 **8그룹 PASS**:

1. 사진 추가는 미리보기만 실행, 명시 만들기·깨진 행 보존·원래 크기·같은 이름 ZIP·완료 결과 보존.
2. 9위치/문구 정규화/201 code point 거부/색 입력 원문 보존/활성 모드만 검증/폰트·alpha·회전.
3. 중지/계속 중 실제 작업 슬롯 유지, 시작 뒤 추가 행 대기, 설정 변경 뒤 늦은 PNG 미반영.
4. 로고 실패/늦은 교체/사진 비우기와 전체 초기화의 차이, 자원 해제.
5. ZIP Blob·이름 snapshot, 행 삭제/선택 변경 이후 내용 유지, 설정 변경 뒤 취소·busy·늦은 거절 안내 보호.
6. 저장 실패 뒤 현재 결과 보존·재시도, locale 변경·URL/저장소 bytes 보존, 언마운트 뒤 늦은 ZIP 차단.
7. 합계/개수 초과의 기존 목록 보존, 늦은 소스 읽기 후 비운 미리보기 부활 방지.
8. 기존 `ImageWatermark` export로 실제 workspace1개 연결과 영어 초기값·명시 원본 크기 PNG 동작.

첫 ZIP fixture는 새 만들기 버튼이 안내를 정상적으로 지운 뒤에도 과거 `설정 변경` 안내를 기대해 실패했다. 현재 안내를 snapshot으로 비교하도록 검사 기대를 고쳤으며 이 부분 제품 변경은 없었다. 테스트는 실제 큐/어댑터/컴포넌트에 합성 헤더·Canvas 명령·I/O 포트를 사용한다. 실제 이미지 픽셀/PNG CRC/브라우저 ZIP 성공이라고 주장하지 않으며 전담 verifier가 별도 확인한다.

자체 합계 **33그룹**, 준비8파일 및 최종 변경5파일의 범위 lint는 각각 exit0·오류/경고0이다. Node의 기존 package module-type 안내는 런타임 결과 실패가 아니며 package.json은 변경하지 않았다. `translations-watermark.json`은 KO/EN `batch` **86키**이며 통합 담당의 공용 guide7키와 별도 소유다. 독립 담당의 별도 순수8+실제 부모6, **14그룹 PASS**도 수신했으며 실제 PNG/ZIP Chrome 검증은 진행 중이다.

## 브라우저/독립 검증 인터페이스

- 소스 input `[data-watermark-files]`, 로고 `[data-watermark-logo]`; 파일 input은 선택 후 value를 비워 같은 파일을 다시 선택할 수 있다.
- `[data-watermark-text]`, `[data-watermark-color]`, `[data-watermark-type="text|image"]`, `[data-watermark-position="topLeft|…|bottomRight"]`, `[data-watermark-option="fontSize|fontFamily|bold|watermarkSize|opacity|rotation|margin|tileMode"]`.
- `[data-watermark-preview]` canvas는 축소 크기, 표시 문구는 원래 폭/높이. `#image-watermark-result`가 모바일 이동 대상이다.
- `[data-watermark-row="안정ID"]`/`data-watermark-status="pending|processing|done|error"`; `[data-watermark-select]`, `[data-watermark-select-preview]`, `[data-watermark-up/down/remove/png]`의 값도 같은 ID.
- `[data-watermark-action="start|pause|resume|retry|select-completed|deselect|zip|clear|reset"]`.
- `[data-watermark-progress]`/`data-watermark-phase`, `[data-watermark-selection]`, `[data-watermark-logo-name]`, `[data-watermark-notice]`.
- 개별 이름은 `<safe-base>_watermarked.png`, 중복 ZIP 이름은 기존 reserveUniqueImageNames 규칙의 ` (2)` 접미사. ZIP 이름은 `watermarked-images.zip`.
- 모든 download는 생성 Blob의 임시 URL을 쓰며30초 뒤 또는 언마운트에 해제한다. 결과 URL과 별도 소유로, 행 삭제는 이미 클릭한 ZIP Blob 참조를 깨지 않는다.
