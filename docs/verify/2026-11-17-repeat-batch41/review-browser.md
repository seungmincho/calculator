# 41차 메모장 실제 브라우저 검증

2026-11-17 KST, 기존3039·격리 Chrome context·합성 메모/기기 저장소. **8/8 통과, 메모장 Chrome 종료.** 전체 타입은 아래 통합 체크포인트로 통과했다. 서비스 워커/외부 요청은 차단했으며 개인 메모를 읽지 않았다.

1. 정상 legacy의 CRLF·emoji·빈 본문·같은 제목의 다른 ID·고정 필드를 JSON 전체 백업에서 그대로 확인했다. 최초/KO→EN notes/settings 쓰기0, 실제 TXT의 CRLF 바이트,400ms 저장·새 탭 복원·다운로드 URL 회수를 확인했다.
2. 실제 두 탭 storage 이벤트와 Web Locks로 dirty 원고/외부 변경을 만들었다. 같은 ID의 다른 두 본문을 명시 함께 보관 후 고유 ID로 모두 보존했다.4개 메모를 유지하고 외부 key 삭제 뒤 자동 부활0, 명시 보관 후 복구를 확인했다.
3. native lock 대기 중 최신 편집만 저장했다. 제어 pagehide는 옛 저장0, pageshow 재확인 뒤 현재 원고 저장, 실제 Header SPA unmount 뒤 늦은 저장0이었다.
4. 손상 raw의 실제 TXT 백업과 현재 메모리 JSON 백업을 구분했다. quota에서 기존 raw/새 메모리 보존, 실제 set 후 readback 실패에서 rollback0·명시 재확인, settings 실패와 본문 저장 분리, 읽기 차단 중 메모리 보존을 확인했다.
5. 실제 File.text 완료 전달을 보류하여 편집/새 파일 선택 뒤 옛 파일 적용0·다음 파일 읽기0을 확인했다. 정상 JSON+손상 JSON+CRLF TXT를 함께 가져와 정상 자료를 보존하고, 같은 ID 충돌 사본·뒤 incoming ID·같은 파일 재선택을 확인했다.
6. 전체 바꾸기/삭제 undo, 후속 편집 후 옛 undo 무효, 옛 toast 무효, native Tab 삽입·Esc+Tab 탈출·집중 모드·새 메모 실제 DOM 초점을 확인했다.
7. native 키보드로 한글+emoji를 선택하고 실제 새 탭 TTS로 정확한8 UTF-16 문자를 전달했다. opener=null·session 일회 소비·합성 speak 호출0·원고 유지, 편집 후 옛 선택 비활성·팝업 차단·언어 전환의 원고 보존을 확인했다.
8.320px 다크 KO/EN의 저장 실패 복구, 찾기/제목/본문 입력16px 이상·주요 새 동작44px 이상·문서 폭320px를 확인했다. 두 언어 복구 캡처를 직접 열어 줄바꿈/버튼을 검토했다. root도 KO 복구 캡처를 별도로 확인했다.

제품 결함은 없었다. 선택읽기 fixture에서 DOM `select` 이벤트만 보내 React 선택 상태를 갱신하지 못한 부분을 실제 키보드 선택으로 고쳤고, 새 TTS 탭의 SSR 예제를 너무 일찍 읽던 기대를 실제 handoff hydration 완료 조건으로 고쳤다. popup 대기 Promise도 클릭과 함께 회수하도록 수정했다. 통과6흐름을 반복하지 않고 선택읽기/모바일 및 마지막 선택읽기 영향만 확인해 최종8/8로 합쳤다.

JS page error·hydration·unhandled rejection·원시 번역 키0. 외부 광고/폰트/통계 차단 로그는 별도다. 저장 실패·readback·파일 전달 지연·pagehide는 제어 포트이며 actual localStorage/Web Locks/File.text/키보드/새 탭/Blob 다운로드와 구분한다. 실제 OS IME, 사용자 파일 선택 대화상자, 이탈 순간 저장 보장, 무잠금 환경의 완전 원자성을 주장하지 않는다.

실행기 `scripts/check-repeat-batch41-browser.mjs`, 상세 `browser/final-results.json`,각 evidence·TXT/JSON·KO/EN PNG.

전체 타입은 통합 담당이2026-11-17 08:43:20 KST에여유3.84GiB·Node heap2GB로시작한 `tsc --noEmit`의 첫실행 exit0·진단0으로 통과했다(session89128). Chrome 종료 뒤의 최신41/42/43/45 제품과44copy보완/49준비를 포함한 검사이며 이 담당은 별도전체타입을 실행하지 않았다.
