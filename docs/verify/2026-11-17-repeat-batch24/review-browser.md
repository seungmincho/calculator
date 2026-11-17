# 24차 독립 브라우저 검증

2026-11-17 03:06:26 KST 최종 **11/11 PASS**. 비밀번호 5개, PDF 6개 흐름을 기존 localhost:3039에서 단일 Chrome·순차 격리 컨텍스트로 실행했다. Chrome을 닫고 통합 담당에게 전체 타입 검사 가능 신호를 전달했다. 제품 파일 변경, 서버 재시작, 빌드, 배포는 하지 않았다.

## 결과

| 흐름 | 검증한 결과 |
| --- | --- |
| 비밀번호 한 위치 재생성 | 무작위·PIN·암호구문 각 5개 중 요청 위치만 교체 가능, 나머지 4개 불변. 현재 옵션과 버튼 DOM·초점 유지. 보안 난수 버퍼 사용 확인; 같은 값이 우연히 나오는 경우를 실패로 취급하지 않음. |
| 설정·언어·검사 입력 | URL의 길이 24 복원, 설정 32 변경, 문자 종류 모두 해제 시 생성 중단, 다시 유효 설정으로 복구. KO↔EN 전환은 결과·강도 검사 입력·설정 URL 보존. |
| 실제 복사·수동 복구 | Chrome의 실제 Clipboard API로 개별/전체 읽기 대조. Windows의 CRLF를 LF로 정규화해 전체 값 비교. API reject/없음 + legacy false에서 성공 표시 없이 읽기 전용 복구, 전체 선택, 실제 재시도. legacy true는 제어된 API 반환으로 상태 처리 확인. |
| 늦은 복사 | 한 행/전체 재생성·설정·탭·언마운트가 옛 응답을 무효화. 새 전체 복사 성공 뒤 옛 개별 거부가 fallback을 실행하거나 성공 표시를 덮지 않음. |
| 비밀번호 320px | 다크·영어, 길이 128 결과, 복구 입력 16px 이상·주요 버튼 44px 이상, 가로 폭 320px. Enter 재생성 초점·탭 End 키 이동. 결과 원문은 모든 캡처에서 마스킹. |
| 실제 PDF 출력 | 3페이지를 3→1로 정리하고 원본 회전과 추가 회전을 합산. 내려받은 1,098바이트 PDF를 별도 재파싱해 내용 표식·순서·크기·회전 확인. 결과는 원본 3페이지 240×320/0도, 원본 1페이지 200×300/270도. 편집 후 옛 결과 링크 제거. |
| PDF 이력·키보드 | 35회 편집 후 최근 30회만 undo, redo·새 분기·reset undo 확인. Ctrl+Z/Shift+Ctrl+Z/Ctrl+Y, 편집 필드·합성 IME 제외, 빈 문서 삭제 뒤 undo 버튼 초점과 복원 후 카드 초점 확인. |
| PDF 읽기 경합 | 잘못된 파일은 이전 문서·이력 보존. 실제 File.arrayBuffer 완료를 지연해 새 파일 우선, 탭 이동·언마운트 후 옛 읽기 무효화. |
| PDF 저장 경합 | 실제 60페이지 PDF writer의 저장 yield를 지연한 뒤 탭 이동: 자동 다운로드 0. 원본 읽기 대기 중 편집: 옛 다운로드 0. 이후 명시 저장만 1회, 실제 출력 60페이지·최신 회전 180도 확인. |
| 공용 PDF 회귀 | 실제 2+3페이지 병합은 5페이지 내용 순서 유지. 3,1 분할 ZIP의 두 파일 내용 대조. 40×20 테스트 PNG를 PDF로 변환하고 이미지 XObject 존재 확인. 다른 탭 입력 보존. |
| PDF 320px | 다크·영어, undo/redo·페이지 조작 44px 이상, 가로 폭 320px, 삭제 후 살아 있는 카드 초점, 탭 키 이동. 캡처 직접 검토에서 잘림 없음. |

## 근거와 범위

- [최종 결과 JSON](browser/final-results.json), [재실행 스크립트](../../../scripts/check-repeat-batch24-browser.mjs), [계획](browser-scenarios.md).
- 실제 산출물: [정리 PDF](browser/organized-output.pdf), [60페이지 최신 PDF](browser/latest-sixty-pages.pdf), [병합 PDF](browser/merged.pdf), [분할 ZIP](browser/split.zip), [이미지 PDF](browser/image.pdf).
- 화면: [비밀번호 복구](browser/password-copy-320-dark-english.png), [비밀번호 첫 화면](browser/password-results-320-dark-top.png), [PDF 이력](browser/pdf-history-320-dark-english.png), [PDF 카드·저장](browser/pdf-cards-320-dark-english.png).
- JS page error 0, hydration 오류 0, unhandled rejection 0, 도구 원시 번역 키 0. 외부 광고·폰트·동의 SDK·방문 통계는 의도적으로 차단했고, 관련 네트워크/통계 console 오류는 신규 제품 결함으로 세지 않았다. 개발 Issue 배지와 기존 하단 탐색 바도 구분했다.
- 비밀번호는 테스트 메모리에서만 대조했다. 관찰한 생성값/검사 문자열이 URL·localStorage/sessionStorage·저장 호출·요청 URL/본문·console에 없는지 확인했다. 증거에는 원문을 저장하지 않는다. 실제 사용자 비밀번호나 파일은 사용하지 않았다.
- 실제 로컬 파일 처리·다운로드·Clipboard API와 달리, 지연 파일/저장 yield 및 clipboard 실패·legacy 반환은 제어해 상태 경계를 재현했다. OS 권한 프롬프트·물리 키보드 IME·모든 PDF 뷰어 렌더링을 검증했다는 뜻은 아니다.

## 최초 실패의 처리

첫 실행은 8/11이었다. 제품 수정 없이 검증 조건만 바로잡고 영향 사례만 다시 실행했다.

1. 보안 난수는 Uint32Array 256개 버퍼를 재사용하므로 재생성마다 getRandomValues 호출 증가를 요구한 검사가 잘못됐다. 기존 보안 버퍼가 채워졌고 요청 위치만 갱신되는 계약으로 수정했다.
2. Windows 실제 클립보드는 전체 복사의 개행을 CRLF로 돌려주었다. 개행 정규화 뒤 원문 내용이 일치했다.
3. PDF는 requestAnimationFrame에서 초점을 옮긴다. DOM 갱신 즉시 확인하던 검사를 실제 다음 프레임의 초점 완료 대기로 수정했다.

남아 있는 `*-failure.png/txt`는 이 초기 테스트 실패의 진단 기록이며 최종 제품 실패를 뜻하지 않는다. 최종 판정은 각 `*-evidence.json`과 `final-results.json`의 11/11이다.
