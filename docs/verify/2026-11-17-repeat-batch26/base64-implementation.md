# 26B Base64 부모 연결 및 자체 검증

2026-11-17 KST. 25차 최종 타입 체크포인트 뒤 승인받아 연결했다. 새 경로/저장소/패키지/외부 요청은 추가하지 않았다. Chrome·전체 tsc·빌드·배포·커밋은 실행하지 않았다.

## 최종 구현

- `Base64Converter.tsx`: 표준/Base64URL, URL 패딩 포함 선택, 원문·파일 bytes·확정 결과 분리. 번역된 작은 예제를 첫 화면에 제공하며 최초 값만 캡처하므로 언어 전환이 입력/결과를 바꾸지 않는다. 입력/옵션 변경은 결과를 무효화하고 이전 복사/다운로드를 차단한다.
- `Base64CopyRecovery.tsx`: 실패한 현재 결과의 읽기 전용 원문, 수동 선택/실패 안내, 재시도/닫기. 실제 Clipboard 성공이나 legacy `true`에만 성공 표시한다.
- `base64Codec.ts`: 엄격한 알파벳/패딩/pad bits, 두 형식의 올바른 생략 패딩, 명시 ASCII 공백 정책, fatal UTF-8, data URL wrapper 분리. 4MiB bytes·6MiB Base64 문자열 한도를 변환 전에 검사한다.
- `base64Actions.ts`: 파일/복사 세대와 미리보기 URL 수명. 기존 `qrImageBatch.ts`의 헤더·치수 함수를 수정 없이 재사용한다. PNG/JPEG/GIF/WebP의 헤더와 16,777,216픽셀 이하를 확인한 후에만 이미지 URL/디코더를 시작한다. 실제 load 성공/치수도 확인한다. 실패해도 변환 바이트는 보존한다.
- `translations-base64.json`: ko/en 각각49키. canonical 메시지·메타/FAQ는 통합 담당 소유다.

인코딩 파일은 원본 bytes를 보존하며 업로드 직후 자동 변환하고 재변환도 같은 bytes를 쓴다. 결과의 raw Base64/data URL 대상을 표시·복사·텍스트 파일로 받는다. 디코딩 파일은 UTF-8 Base64 원문을 채우며 버튼으로 변환한다. **준비 단계의 확장자 제한은 최종 정책에서 제거했다.** 선택기 안내는 `.txt,.base64,.b64,text/plain`이며 다른 확장자도 실제 UTF-8/내용/크기 기준으로 처리한다. 파일 오류/취소는 현재 원문 또는 파일 소스를 유지한다.

디코딩의 `text=null`은 유효하지 않은 UTF-8을 뜻한다. 안내 문구를 output에 넣지 않으며 텍스트 복사/교환을 비활성화하고 바이트 파일 다운로드는 제공한다. 검증된 raster에만 이미지 확장자를 부여하고 그 외는 UTF-8 `.txt`/binary `.bin`이다. SVG/HTML의 MIME 이름은 미리보기 권한이 아니며 실행하거나 iframe/inline에 넣지 않는다. 인코딩 수치는 원본 바이트, 디코딩 수치는 결과 바이트로 구분한다.

다운로드는 클릭 당시 확정 결과/표시 대상을 Blob으로 만들고 임시 URL을1초 뒤 회수한다. 실패 시 결과를 유지하며 즉시 회수한다. 언마운트는 모든 남은 URL/타이머를 정리한다. 이미지 URL은 입력 변경/결과 교체/언마운트 시 즉시 abort·해제하며 늦은 load도 화면을 복원하지 않는다.

## 자체 검증

- `node --experimental-strip-types scripts/check-base64-codec.ts`: **13그룹 PASS**. 독립 Buffer/RFC 벡터, canonical bits 전수 경계, Unicode/공백/BOM, invalid UTF-8, 실제 File bytes, 크기 상한/선검사, 파일/복사 세대, 이미지 헤더·치수/abort 회수, 파일명.
- `node docs/verify/2026-11-17-repeat-batch26/check-base64-parent.mjs`: **8그룹 PASS**. 실제 부모/복구 컴포넌트, Node File/Blob로 raw/data URL/디코딩 다운로드 bytes 일치, 반복 파일 인코딩, 임의 확장자의 UTF-8 입력, 읽기 실패 원문 유지, 새 파일/직접 입력/모드/형식/닫기/이탈 이후 stale 억제, native/legacy false 복사, retry, 이미지·다운로드 URL 정리, locale/URL/저장소 격리, KO/EN 수동 선택.
- 제품4파일과 검사2파일 scoped ESLint: **exit0, 오류0·경고1**. native Blob 미리보기의 `<img>`에 대한 `@next/next/no-img-element` 경고이며 신규 lint 예외 없음. 변경 전 부모 lint 결과를 별도로 수집하지 않았으므로 경고의 신규/기존 여부는 단정하지 않는다.
- 이미지 `load`/DOM/Clipboard는 제어 포트이므로 실제 브라우저 이미지 디코더·OS 복사·모바일 레이아웃 검증과 구분한다. 실브라우저는 verify, 독립 코드는 writing 담당이다.

## 브라우저 선택자·행동 계약

- `[data-base64-mode="encode"|"decode"]`, `[data-base64-format]` select(`standard`/`url`), `[data-base64-padding]` checkbox.
- `[data-base64-input]` textarea, `[data-base64-upload]` file, `[data-base64-file-source]`, `[data-base64-use-text]`. 같은 파일 재선택을 위해 file input value는 즉시 빈 값으로 정리한다.
- `[data-base64-convert]`, `[data-base64-clear]`, `[data-base64-output-view="raw"|"dataUrl"]`, `[data-base64-output]` 읽기 전용 textarea. binary 결과에는 output textarea가 없다.
- `[data-base64-download]`, `[data-base64-swap]`, `[data-base64-copy]`, `data-base64-copied="true"|"false"`.
- `[data-base64-copy-recovery]`, `[data-base64-select]`, `[data-base64-copy-retry]`, `[data-base64-copy-close]`.
- `[data-base64-preview]`는 **검증 완료 blob URL만** 표시한다. `[data-base64-preview-failed]`, `[data-base64-utf8="true"|"false"]`, `[data-base64-reading]`, `[data-base64-error]`, `[data-base64-bytes]`.
- 결과 ID `base64-converter-result`와 MobileResultLink. 모든 입력은16px, 버튼44px 이상, 모바일1열/토큰 색상이다.

로컬 Blob을 native `<img>`로 표시해 이미지 최적화 권고 경고1개가 남는다. 외부 이미지 최적화 요청을 추가하지 않았으며 경고를 숨기는 lint 예외는 추가하지 않았다.
