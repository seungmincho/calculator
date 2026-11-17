# 41차 메모장 native 검증 계획

최종 실행 상태: 8/8 PASS, Chrome 종료. 실제 결과와 fixture 보완 경위는 `review-browser.md` 및 `browser/final-results.json`을 따른다. 아래는 실행 전 선정한 범위이며 일부 세부는 독립/작성자 증거와 구분한다.

상태: 계약/준비 보고서를 읽고 실행기와 합성 포트를 준비한다. **부모 final ready+canonical 준비 전 Chrome을 열지 않는다.** 기존3039 서버·단일 Chrome·격리 context·SW/외부 요청 차단, 실사용 메모 접근0을 유지한다. 현재 준비를 제품 완료로 기록하지 않는다.

1. **정상 legacy·재방문·반출:** 기존 notes 배열/별도 settings를 합성 seed. 첫 진입·KO→EN에 notes/settings0write, 제목/빈본문/CRLF/emoji/고정/같은 제목의 별개 ID 보존. 실제400ms 저장 후 새 방문 복원, Ctrl+S TXT와 JSON 백업의 전체 내용 독립 파싱.
2. **실제 두 탭 외부 변경:** A의 dirty 원고·선택을 B의 저장/삭제/clear storage 이벤트가 바꾸지 않음. 현재/외부 개수·제목 preview를 확인한 뒤 명시 함께 보관으로 양쪽 같은 ID의 다른 원문을 고유 ID로 보존. 삭제된 외부 key는 명시 적용 전 자동 부활0.
3. **실제 Web Locks 대기·이탈:** 다른 탭이 notes lock을 잡은 동안 편집→다시 편집, 외부 변경/재조회/적용 preview 뒤 추가 편집을 수행. 옛 queued 작업이 최신 원고를 되돌리거나 덮지 않음. 제어 pagehide는 새 lock 시작0·pageshow 재확인. 실제 Header SPA unmount와 늦은 작업의 효과0.
4. **손상·차단·quota·readback:** notes 손상/미래 구조·getItem 차단은 원문보존/쓰기0, 메모리 편집과 실제 raw/현재 백업 구분. quota와 set-success/readback-failure를 주입해 성공 선표시/rollback0·명시 재확인. settings 실패가 정상 notes 저장을 막지 않음. 거대한 legacy는 독립 domain 근거를 재사용하고 native 전수반복하지 않음.
5. **native 파일·역순·오류·취소:** 실제 File.text 완료 전달만 보류한다. 읽는 동안 편집/새 선택/외부 변경/삭제/이탈로 취소하고 옛 결과 적용/다음 파일 읽기0. 정상+실패 파일을 함께 넣어 정상 원문 보존, 같은 파일 재선택, 충돌 copy와 뒤 incoming ID 모두 보존. 파일 선택 취소도 기존 원고 유지.
6. **undo·찾기·고정·초점:** 가져오기/삭제/모두 바꾸기 직후 undo는 해당 revision만 복원. 후속 편집 뒤 옛 undo/timer가 새 글·toast를 지우지 않음. 검색/고정/새 메모·실제 Tab 초점·전체화면/Esc 기존 회귀를 핵심 한 흐름으로 검사.
7. **기존 읽어주기·언어·선택:** 합성 한글/emoji 원고에서 실제 textarea 선택→새 탭 TTS 한 번 전달, source 원고/undo 불변·autoplay0. 선택 뒤 본문/메모 변경 시 옛 선택 차단. 팝업 차단은 현재 원고 보존. 합성 composition 이벤트와 실제 OS IME 검증 범위를 구분.
8. **320px 다크 KO/EN:** 정상/외부복구·가져오기오류 UI, 입력16px/새버튼44px·overflow0·literal 제목·원시 키/JS/hydration. 짧은 viewport/element 캡처를 저장하고 직접 시각 검토.

실제 native Clipboard·Storage·Web Locks·File.text·다운로드와 오류/시간/전달 보류 포트를 구분한다. pagehide 저장 보장이나 무잠금 환경의 완전한 탭 원자성을 주장하지 않는다. 전체 타입은 통합 담당, 제품 변경은 작성자만 수행한다.
