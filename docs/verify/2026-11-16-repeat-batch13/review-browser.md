# 13차 독립 브라우저 검증

기존 개발 서버3039와 단일 Chrome을 사용해 순차 실행한다. 외부 요청과 서비스 워커를 차단하고 검증용 데이터만 사용한다. 제품 파일은 수정하지 않으며 결함은 구현 담당에게 재현 근거와 함께 전달한다.

| 대상 | 검증 계획 |
| --- | --- |
| GPA 복사 | Clipboard API 실제 성공, API 없음/reject 및 fallback false/throw/true, 실패 후 수동 선택과 재시도, 지연 응답과 입력/만점/다른 복사 요청의 경합, 공유 URL 복원,4종 만점 계산/이미지 저장 회귀,320px 다크 |
| TTS 재시도 | 두 번째 문장 오류 후 사용자 클릭으로 해당 문장부터, 반복 구간/회차 유지, pause/resume, 본문/설정/정지/다른 문장 무효화, 오래된 error/end/boundary 무시, 기기 음성 필터, 메모/OCR 전달,320px 다크 |

TTS 검증은 실제 제품 UI에서 제어 가능한 Web Speech mock 콜백을 사용한다. 실제 OS 음성 엔진의 합성 성공·음질·기기별 동작 검증을 대신하지 않는다. ko/en 키 구조와 language=en 상태의 기능을 확인하되, 기존 한국어 전용 공통 레지스트리의 실제 영어 전환을 통과했다고 보고하지 않는다.

2026-11-16, 실제 Chrome에서 **11/11 PASS**(GPA4건·TTS7건). JavaScript 예외·hydration 오류0. 브라우저를 종료하고 통합 담당에게 최종 타입 검사 가능 시점을 전달했다. 추가 제품 수정 요청은 없다.

| 시나리오 | 결과 |
| --- | --- |
| GPA Clipboard 실패 matrix·수동 선택·재시도 | 실제 Clipboard 쓰기/읽기 일치. API 없음/reject와 fallback false/throw는 실패·읽기 전용 필드, fallback true는 성공. 전체 텍스트 선택 및 재시도 성공 |
| GPA 지연 응답·경합 | 입력/만점 변경 뒤 늦은 완료 표시 없음. 이전 결과 요청보다 최신 링크 요청 우선. 링크 성공 뒤 과거 결과 reject가 fallback을 실행하지 않음 |
| GPA URL·계산·이미지 회귀 |4.5/4.3/4.0/100의 URL 초기 입력과 기존 비례 환산값 일치. 실제 PNG660×380 저장,0/빈칸/범위 초과 처리 유지 |
| GPA320px 다크 | 결과/링크 복구 텍스트 읽기·선택 가능,16px 필드·44px 버튼, 문서 가로 넘침 없음 |
| TTS 중간 문장·오래된 콜백 |2번째 문장 실패 뒤 자동 재생 없이 명시 클릭부터 정확한 문장 재시도. 같은 세션/이전 세션의 중복 end/error/boundary 무시 |
| TTS 반복·pause/resume |2~3번째 문장 구간의3회 반복 중2회차 오류를 해당 회차에서 재시도. pause/resume 후 남은1회만 수행 |
| TTS 무효화 | 본문·반복 구간/횟수/간격·정지·Esc·다른 문장 재생 시 이전 복구 위치 폐기 |
| TTS 변경한 음성 설정 | 실패 위치를 유지하고 새 음성/속도/음높이/음량으로 명시 재시도. 동기 speak 예외도 복구 안내 제공 |
| TTS 기기 음성·취소 | 기기 음성 없음과 원격 음성 network 오류 구분. localOnly 변경은 실패 위치 무효화. 기기 음성 추가 후 사용, canceled/interrupted는 재시도 오류로 표시하지 않음 |
| TTS 메모/OCR 연결 | 실제 메모 버튼으로 새 탭 전달, no autoplay·opener 분리·localOnly·일회 소비 유지. 오류 상태 이후 새 OCR 전달은 이전 재시도 위치를 남기지 않음 |
| TTS320px 다크·공유 설정 | 오류/문장 번호/미리보기/44px 재시도 버튼을 읽고 조작 가능. URL의 본문·속도1.3 복원 및 해당 문장 재시도 |

독립 코드 리뷰에서 발견돼 브라우저 시작 전에 수정된 GPA의 이전 결과 reject→최신 링크 덮어쓰기 경계는 실제 UI에서도 다시 확인했다. 최신 링크 성공 표시가 유지되고 과거 요청의 fallback 실행은0회였다.

초기 실행10/11에서 TTS interrupted 콜백 직후 React commit을 기다리지 않고 버튼 disabled를 읽은 테스트가 실패했다. 화면의 재생/정지 상태 반영을 기다리도록 수정한 뒤 해당1건만 재실행해 통과했다. 이 수정은 제품 코드 변경이 아니다. 초기 결과·실패 캡처는 남겨 두었다.

세 복구 패널의320px 다크 캡처를 직접 검토했다. 한국어 줄바꿈·텍스트 선택·버튼 배치는 정상이고 문서 가로 넘침0이다. ko/en 추가 키 구조 및 language=en 상태 기능을 확인했다. 기존 한국어 전용 레지스트리 제약으로 실제 영어 UI 전환을 검증한 것은 아니다.

증거: `browser/final-results.json`, `gpa-copied-result.txt`, `gpa-existing-result.png`, `tts-middle-retry-mock-log.json`, `tts-repeat-retry-mock-log.json`, `gpa-copy-result-320-dark-panel.png`, `gpa-copy-link-320-dark-panel.png`, `tts-recovery-320-dark-panel.png` 및 각 top 캡처. 실행 스크립트는 `scripts/check-repeat-batch13-browser.mjs`.

검증 한계: 실제 Clipboard API 성공은 Chrome에서 수행했지만 권한 거부/미지원/legacy 결과는 주입했다. TTS는 제품 UI와 Web Speech mock 콜백의 상태 전이를 검증했으며 OS 음성 엔진의 실제 합성·음질·모바일 실기기 동작을 검증하지 않았다. 빌드·배포는 실행하지 않았다.
