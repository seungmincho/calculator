# 58 실제 브라우저 검증 계획

상태: 부모 연결 final·canonical 대기.57 최종 Worker/큐를 포함한 동일 source에서 순차 실행한다.57 큐·원고 검사와 별도 집계한다.

1. 실제 OS Clipboard로 현재/전체 결과의 한글·emoji·공백·개행 보존. 전체 완료 개수 안내, 실제 UTF-8 TXT 바이트와동일 snapshot 비교.
2. API 없음+legacy false, API reject+legacy throw를 명시 주입. 거짓 성공0, 실패 즉시 전체 textarea 생성0, 명시 확대 후 readonly 전체선택·재시도·닫기 focus. legacy true는 통제 성공으로 구분.
3. 긴 원고64k의 전체 manual/실제 TXT, HTML처럼 보이는 문자열은 실행0. Windows Clipboard 개행 정규화와 source/TXT exact bytes를 구분.
4. 현재↔전체 복사와 retry/TXT/handoff 교차 요청, 오래된 거부 후 fallback0·성공 표시0. 실제 clipboard handed-off 작업 자체 취소를 주장하지 않음.
5. 원고 편집/선택/정리/새 결과/locale ABA·이탈은 늦은 응답/2초 타이머를 무효화.57 재인식 대기 원고를 복사·TXT로 그대로 반출.
6. 다운로드 objectURL/anchor 오류를 주입해 안내/자기 자원 정리와 재시도; TTS 전달은 현재 원고·일회 소비·자동발화0.
7. 320px dark KO/EN manual16px/동작44px·키보드·긴 줄·원시 키/JS/hydration 수집.

OCR 결과는57의 통제 Worker 메시지로 공급하며 모델 요청0·개인 사진0. 실제 Clipboard/Blob/TXT/native focus와 지연·실패 포트의 증거를 별도 보고한다. 추가 패키지·빌드·전체 타입·실사용 데이터 접근 없음.
