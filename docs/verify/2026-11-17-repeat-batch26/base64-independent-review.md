# 26차 B Base64 독립 검토

2026-11-17 KST. 최종 부모 ready 이후 변경된 제품 경계를 읽고 독립 입력/기대값으로 실행했다. **현재 실제 재현 가능한 추가 제품 결함 없음, 수정 요청 없음.** 제품 파일은 수정하지 않았다. 27B 준비 TS는 고정한 채 이 검토를 수행했다.

## 실행 근거

`node docs/verify/2026-11-17-repeat-batch26/check-base64-independent.mjs`: **8그룹 PASS**.

1. 독립 Buffer oracle: 2바이트 3,856개 값 × 표준/URL 형식의 canonical 인코딩·디코딩 일치, 마지막 2bit 중 잘못된 pad bit 거부.
2. 실제 File의 `.txt`/`.base64`/`.b64`/임의 `.xyz` 확장자는 본문 UTF-8/Base64로 처리. 파일 BOM 한 번 제거, 한글/이모지/NUL/CRLF 결과 및 다운로드 바이트 일치. 확장자만 맞은 잘못된 본문·잘못된 UTF-8 업로드에서 원문 보존.
3. 바이너리 파일을 URL 형식·패딩·data URL view·언어 변경 후 다시 변환해도 원래 바이트를 사용. data URL→교환→디코딩 바이너리는 copy/swap 비활성, 다운로드 바이트 동일, 거짓 image MIME만으로 Image 생성 없음.
4. 동일 입력 재변환 또는 padding 변경 뒤 새 복사가 성공한 상태에서 이전 Clipboard resolve/reject가 와도 새 성공 상태 유지·fallback 추가 실행0·복구 패널 재등장0.
5. 이전 파일 읽기 대기 중 더 새 파일 읽기가 실패해도 이전 late 성공이 적용되지 않음. 기존 입력 보존 및 명시 재변환 성공.
6. PNG header 4,097×4,096은 URL/Image load 생성0, 정확 4,096²는 load 포트에 도달. native error 또는 header와 다른 초과 natural dimensions는 미리보기만 실패하며 모든 원본 다운로드 바이트 보존.
7. 성공한 preview URL은 locale 변경에서 유지, 새 입력과 unmount에서 각각 정확 한 번 회수. 늦은 onload는 이전 이미지를 되살리지 않음. 저장소 접근0.
8. 4MiB 초과 파일은 arrayBuffer 호출0, 신고 size와 실제 byteLength 불일치는 입력에 적용하지 않고 오류 반환.

검사 파일은 작성자 `check-base64-parent.mjs`의 host fixture 부분만 메모리에서 읽어 재사용하며 기존 assertions/8그룹은 실행하지 않는다. 실제 `Base64Converter.tsx`와 codec/actions를 번들하여 실행한다. 기대값·추가 시나리오는 이 독립 검사 파일에 있다. host 파일/공통 harness는 변경하지 않았다.

실제 File/Blob/Buffer 바이트와 제품 이벤트 코드를 사용했다. React hook 실행·DOM·Clipboard·Image load는 제어 포트이며 실제 브라우저 이미지 디코더·운영체제 Clipboard·모바일 레이아웃 검증으로 주장하지 않는다. 해당 범위는 단일 Chrome 담당의 별도 보고서에 따른다. 공개 API·실사용 파일·네트워크·전체 tsc·빌드 실행은 없다.

## 정적 경계 대조

입력/모드/형식/padding/초기화는 result를 비우고 read/copy 공통 revision을 바꾼다. 새 변환은 같은 원문이라도 새 result identity를 만들어 이전 copy/download handler를 막는다. encode file은 별도 bytes 상태이며 data URL 표시는 복사 view에만 있다. decode의 `text:null`은 번역 안내문과 분리되어 교환 대상으로 사용되지 않는다.

preview는 MIME을 신뢰하지 않고 raster signature→기존 QR header 치수→native load의 순서다. signal은 대기/성공 URL 모두를 해제하고, 각 release는 멱등이다. 복사 fallback은 실제 true만 성공이며 stale request에는 실행하지 않는다. 원문/결과를 URL·localStorage·fetch로 보내는 새 경로는 확인되지 않았다.

기존 authored 13개 도메인/8개 부모 결과는 담당자 증거이며 이 독립 8그룹과 구분한다. 기존 도메인 전체를 불필요하게 재실행하지 않았다. 독립 검사 파일 scoped ESLint **exit0, 오류0/경고0**으로 종료했다.
