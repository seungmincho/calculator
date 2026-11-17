# 58차 후보 — 이미지 글자 인식 결과 복사 실패 복구

상태: 미연결 준비 author7/독립6/lint0 뒤57 부모에 출력 연결을 적용했다. root 부모검사와 공용/native/최종 타입은 아직 대기.

## 확인한 불편

57 담당의 실제 부모 제어 Clipboard 검사 `../2026-11-17-repeat-batch57/copy-before-fix.json`에서 API reject와 API없음+legacyfalse 모두 성공 아이콘/문구를 표시했고 명시적인 수동 복구 필드가 없었다. 원래 source SHA와 두 관측을 보존한다. 실제 브라우저 권한 거부를 재현했다는 뜻은 아니다. 현재 copyToClipboard는 오류를 삼킨 다음 setCopiedId를 실행하고, 2초 타이머는 원고/선택/locale 소유권을 확인하지 않는다.

## 구현 범위

- 기존 현재 결과/전체 결과 복사와 TXT·읽어주기 전달은 유지한다. 복사 클릭 시 보이는 정확한 원문(줄바꿈/공백 포함)을 캡처한다. OCR 원문·편집·정리 옵션의 최신 상태에서만 새 출력을 시작한다. 57의 마지막 성공/편집 보존 계약을 재사용하며 새 원문 생성 정책은 추가하지 않는다.
- 공용 `copyShareResultLink`의 native clipboard→legacy fallback을 재사용하고 실제 true 성공에만 완료를 표시한다. 두 경로가 모두 실패하면 오류와 전체 텍스트 수동 복구를 제공한다. 실패를 빈 문자열이나 첫 줄 복사로 대체하지 않는다.
- 복구 UI는 명시적으로 ‘전체 내용 보기’를 눌러 전체 readonly textarea를 열고, 선택·복사 재시도·닫기를 제공한다. 16px 입력/44px 버튼/긴 문장 줄바꿈을 지키고 선택 API 실패 시 길게 눌러 직접 선택하는 방법을 안내한다. 대용량 결과를 실패 즉시 별도 DOM에 중복 렌더하지 않는다. 사용자가 복구 필드 안에서 편집할 수 있게 해서 원본과 섞지 않는다.
- 원고 편집/다른 이미지 선택/현재 결과 교체/전체 목록 변경/clean옵션/locale/이탈은 이전 출력의 fallback·성공·오류·타이머를 무효화한다. 현재 복사→전체 복사→재시도→TXT→읽어주기 전달은 같은 출력 소유권 아래 둔다. 오래된 callback·locale A-B-A·Strict replay가 새 결과에 완료 표시를 붙이지 못한다.
- TXT는 클릭 시 전체 결과 snapshot의 UTF-8 bytes를 기존 파일명 `ocr-result.txt`로 내려받는다. 자기 object URL/anchor만 정리하며 오류는 다시 시도할 수 있게 표시한다. 읽어주기 handoff 실패는 기존 안내를 보존하고 성공 시에만 이동한다. 새 저장소나 원고 URL 파라미터는 만들지 않는다.
- 전체 결과가 일부 항목만 인식 완료된 상태에서도 기존 동작대로 완료 결과만 합친다면 그 수를 명확히 안내한다. 원고의 두 줄바꿈 구분 규칙은 변경하지 않는다. 사용자 원문이 HTML로 실행되는 경로를 추가하지 않는다.

## 소유·검증

root가 작은 `OcrCopyRecovery`와 전용 출력 상태를 준비할 수 있으나 부모 연결은57 담당의 final/freeze 뒤에만 진행한다. 컴포넌트와 `imageOcr.output` KO/EN 조각은 같은 담당, canonical은 integrate 전담이다. 기존 OCR 이미지 처리/Worker 정책·모델·파일 제한·storage schema는 이 배치에서 변경하지 않는다.

검사: 정상 현재/전체복사 exacttext·legacytrue/false·native reject·두출력역순·동일내용 ABA·입력/선택/locale/Strict/unmount·selection focus 재진입·늦은2초타이머,manual전체/TXT actual bytes·createObjectURL/anchor실패 cleanup·handoff현재텍스트. 제어 Worker 결과로 한국어/이모지/공백/여러행/빈 결과/긴 결과를 공급하고 실제 모델 다운로드 없이 출력 정책을 확인한다. native는 실제 Clipboard·TXT·320KOEN·57원고보존 회귀를 구분해 검증하며 인식 정확도 향상을 주장하지 않는다.

57 완료 전에는 자체/독립/native 검사 통과나 복사 문제 해결로 세지 않는다. 빌드·배포는 별도 명시 요청 없이 실행하지 않는다.
