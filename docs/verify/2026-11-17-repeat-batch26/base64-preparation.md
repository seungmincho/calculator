# 26B Base64 미연결 준비 상태

2026-11-17 KST. 24차 체크포인트 후 root 승인으로 신규 `src/utils/base64Codec.ts`와 `base64Actions.ts`를 준비했다. **기존 `Base64Converter.tsx` 및 canonical 번역/메타는 수정하지 않았고 경로에 연결하지 않았다.** 준비 검사 뒤 TS 편집을 중지했다. 25차 checkpoint/TS freeze 요청을 존중하며 다음 작업은 25B 독립 검토다.

## 고정할 API 정책

- bytes(UTF-8 텍스트·인코딩 파일·디코딩 결과)는4MiB, Base64 입력/결과 문자열은6MiB. 디코딩 업로드 .txt/.base64는 입력 문자열 파일이므로6MiB까지 읽되 실제 디코딩 bytes는4MiB다. 원문은 한도 초과로 잘라 성공하지 않는다.
- `encodeBase64Bytes`/`encodeBase64Text`: 표준 출력은 padding 포함. Base64URL은 기본 생략 및 선택 포함. 텍스트의 앞뒤/공백만인 입력도 그대로 인코딩하고 lone surrogate는 손실 변환하지 않도록 오류로 구분한다.
- `decodeBase64`: 양쪽 형식에서 올바른 생략 padding을 허용한다. SP/TAB/LF/CR/FF만 무시하며 VT/NBSP/기타 문자는 거부한다. 혼합 alphabet/중간·과잉 padding/불가능한 길이/마지막0이 아닌 pad bits를 거부한다. 이 판정은 출력 padding 선택과 독립적이다.
- data URL은 `;base64,` marker를 요구하고 표준 alphabet로만 payload를 해석한다. MIME/선택 charset은 메타일 뿐 UTF-8 성공이나 이미지 여부를 보증하지 않는다. header는1024자까지의 MIME/ASCII parameter subset을 지원하며 percent-encoded payload 등 모든 data URL 방언을 지원한다고 주장하지 않는다.
- UTF-8은 fatal decoder로 text 또는 null을 반환한다. null이어도 bytes는 다운로드 가능하다. payload BOM은 문자로 보존해 바이트 왕복을 유지하고, 업로드 Base64 텍스트 파일의 시작 BOM 하나만 파일 marker로 제거한다.
- `readBase64File`: encode는 원본 bytes, decode는 UTF-8 Base64 text로 명시 분리한다. 크기/확장자/UTF-8 오류와 stale을 구분하며 UI 상태를 직접 변경하지 않는다. 부모는 실패 시 이전 입력을 유지하고 파일 bytes를 data URL 문자열로 대체하지 않아야 한다.
- `createBase64ImagePreview`: PNG/JPEG/GIF/WebP signature 후보만 URL을 만들고 실제 브라우저 load 성공까지 기다린다. SVG/HTML/MIME만 맞춘 데이터는 미리보기 대상이 아니다. AbortSignal은 pending/완료 URL을 회수하며 release는 한 번만 실행한다. 브라우저 load는10초 실패 경계를 둔다. 다운로드 확장자는 실제 검증된 타입 또는 일반 bin/txt를 사용하도록 부모에서 연결한다.
- `createBase64ActionGuard`: 읽기·복사 요청 번호와 공통 input revision. 부모가 신규 입력/모드/형식/초기화/언마운트에 invalidate해야 한다. `copyBase64Text`는 실제 success/legacy true/failed/stale를 구분한다.

알파벳·pad bit·벡터는 [RFC 4648](https://www.rfc-editor.org/rfc/rfc4648.html), wrapper 형식은 [RFC 2397](https://www.rfc-editor.org/rfc/rfc2397.html)을 직접 확인했다. 공백/생략 padding 허용은 이 도구가 명시하는 입력 정책이다.

## 준비 검사 완료·남은 연결

`node --experimental-strip-types scripts/check-base64-codec.ts` **12그룹 PASS**. RFC 벡터와 독립 Buffer oracle로 길이0~257·두 alphabet·padding 비교, one-byte256개 각각의 nonzero pad bits 전부 거부, 잘못된 alphabet/패딩/공백, Unicode/BOM/바이너리, data URL/MIME 분리,4MiB 실제 왕복/6MiB원문/초과 전 atob 미호출, 실제 Node File 바이트·UTF-8파일·재변환, 읽기 세대/오류, raster 후보+load 실패, preview 즉시 abort 회수/늦은 응답/중복release, copy false/stale, 안전 파일명을 확인했다.

`translations-base64.json` ko/en 조각을 준비했다. 부모 미연결 상태라 canonical 병합은 25차 체크포인트 뒤 통합 담당의 조율에 따른다. 새 유틸2개+검사1개 scoped ESLint **exit0, 오류0/경고0**다.

이미지의 `load`는 제어 포트 검사이며 실제 브라우저 이미지 디코더 검증으로 주장하지 않는다. 부모 UI의 byte/text/file/result 상태·편집후무효화·swap·현재 타입다운로드·복구 child는 아직 연결하지 않았다. 부모 UI 연결·실제 파일/이미지·Clipboard·모바일 검증은 25차 완료 후 별도 승인 단계다. 전체 tsc·Chrome·build·canonical 원본 수정·배포는 실행하지 않았다.
