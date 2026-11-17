# 27차 독립 브라우저 검증

2026-11-17 **05:00:51 KST, 세계시계 7 + 백색소음 7 = 14/14 PASS**. Chrome은 정상 종료했으며 통합 담당에게 전체 타입 검사 가능 신호를 보냈다. 최종 JS 예외·미처리 Promise·hydration 오류·검사 범위 원시 번역 키는 0건이다. 제품 변경 요청은 없었다. 최초 검사 fixture 문제 3건은 아래와 같이 고친 뒤 해당 사례만 재검사했다.

[실행 스크립트](../../../scripts/check-repeat-batch27-browser.mjs) · [전체 기계 결과](browser/final-results.json) · [14흐름 계획](browser-scenarios.md). 기존 localhost:3039와 한 Chrome을 사용해 격리 컨텍스트를 순차 실행했다. 서비스워커와 외부 통신은 차단했고 합성 입력만 사용했다. 제품 TS·서버·패키지·빌드·전체 타입 검사는 검증 담당이 변경/실행하지 않았다.

## 세계시계 7흐름

| 흐름 | 확인한 동작 |
| --- | --- |
| 정확한 순간·URL | `2026-11-16T23:45:37Z`의 분·초가 선택 결과·native 복사 링크·실제 새 탭 URL 방문에 유지됐다. URL 도시가 저장 도시보다 우선했다. 도시 순서/업무 시간/언어 변경은 순간을 보존하고 기준 도시 날짜만 변경했다. epoch 0·음수와 잘못된 도시/at도 안전하게 처리됐다. |
| DST 중복·짧은 날짜 | 뉴욕의 2026-11-01 01:30:45 두 순간을 UTC-04:00/UTC-05:00으로 구분했다. 가을25칸·봄23칸, 명시 칸 클릭의 시작 시각, 날짜 변경 후 URL과 선택 일치를 확인했다. |
| 부분 날짜·업무 교집합 | Lord Howe의23.5/24.5시간 날짜는 마지막30분 칸을 포함했다. 서울/카트만두 월요일09~18 교집합은 UTC03:15~09:00, 정확히345분이며 일부 칸45분을 반올림하지 않았다. UTC 자정의 마지막/첫 칸 경계도 확인했다. |
| 실제 ICS | 30/60/90/120분 파일을 실제 다운로드했다. 독립 UTF-8/CRLF/folding/property parser와 Node SHA-256으로 초 포함 DTSTART/DTEND, 한글·쉼표·세미콜론·역슬래시 escaping,75octet 줄 제한, 안정 UID, 한 VEVENT를 대조했다. 제목은 URL/저장/요청/콘솔에 없었고 도시 순서·locale 변경 후 UID가 같았다. |
| 지연·실패 반출 | 실제 WebCrypto 결과의 전달을 지연했다. 제목/길이/순간/도시/locale 변경 및 실제 unmount 뒤 이전 다운로드0. 실패 시 제목·선택 보존과 명시 재시도 성공,9999년 종료 범위 초과 거부도 확인했다. |
| 복사 복구·경합 | native Clipboard 텍스트/링크, API 거부/없음·legacy false/true, 읽기 전용 전체 선택·재시도를 확인했다. 이전 텍스트 복사 거부가 나중 링크 복사 뒤 fallback을 실행하지 않았다. |
| 320px KO/EN | 다크320px의 날짜/제목/길이/수동 복구 입력16px 이상·주요 버튼44px 이상, 문서/본문 가로 overflow0. 언어 변경·실시간 시계 tick이 미팅 순간이나 제목을 바꾸지 않았다. |

대표 [90분 ICS](browser/world-clock-90-minutes.ics)는 **516바이트**, `DTSTART:20261116T234537Z`, `DTEND:20261117T011537Z`다. [도시 순서·EN 변경 후 같은 일정](browser/world-clock-same-event-en.ics)의 UID가 같으며 [실패 후 재시도 파일](browser/world-clock-digest-retry.ics)도 별도로 검사했다. 외부 캘린더 계정 등록은 하지 않았다.

## 백색소음 7흐름

| 흐름 | 확인한 동작 |
| --- | --- |
| native 기한·설정 | mount에서 AudioContext0, 명시 재생만 생성했다. 실제 native source/gain/stop을 관찰하며97초 wall jump에 남은 시간을 즉시 맞췄다. 종류/음량/같은 타이머는 기한 유지, 다른 타이머는 지금부터 재설정, 무기한에는 예약 stop0. 음량0은 정지와 구분했다. |
| mute-before-resume | 실제 context suspend 후 native resume Promise 전달을 지연했다. resume 호출 전에 gain0을 설정하고 preparing 중 statechange/음량/fade 변경도0을 유지했다. 유효한 resolve 뒤 최신0.7 gain만 복원했다. 기한 초과/취소/새 시도 뒤 옛 resolve/reject/ended는 재생을 바꾸지 않았다. 거부와 실제10초 준비 timeout도 오류로 표시했다. |
| OfflineAudioContext | 제품 audio adapter/plan 소스를 test-only transpile하여 native OfflineAudioContext에서 실행했다. 상수 합성 버퍼의 실제 AudioParam 페이드·예약 종료 파형을 수치로 확인했다. 아래 표와 원본 코드 SHA-256을 evidence에 보관했다. |
| 프로필 CRUD·재방문 | 이름40자·최대6개·중복 이름, rename/delete의 현재 설정 유지, schema의 설정만 저장을 확인했다. 새 방문은 기본 설정·재생0. 진행 중 명시 load는 context를 닫고 설정만 적용했다. |
| 저장 실패·원본 보호 | 손상/미래버전 raw 보존, 쿼터 실패 이름/목록 유지, 읽기 차단 후 복구를 확인했다. 실제 쓰기는 됐지만 readback이 실패한 경우 원본을 롤백하지 않고 미확정 안내 후 재조회로 실제2개 목록을 회복했다. |
| 실제 두 탭·Web Locks | 같은 브라우저의 두 탭 storage event/CAS로 최신 목록을 보호했다. 실제 Web Lock 점유 중 load의 설정 편집/취소/storage 변경과 save 중 unmount는 이전 적용/쓰기를 막았다. 이후 새 명시 load는 정상 동작하며 자동 재생0이었다. |
| 320px KO/EN·이탈 | 다크320px·16px 입력·44px 주요 버튼·가로 overflow0. locale 변경 중 재생 generation/이름/설정 유지. 실제 패널 unmount 및 native close 완료 뒤 모든 context가 closed였다. |

실시간 오디오 관찰은 native AudioContext를 사용하되 **모든 destination 연결을 추가 gain0 sink로 보내고 Chrome `--mute-audio`도 적용**했다. 사용자 스피커 출력·마이크 입력은 없다. 지연 resolve/reject 및 wall clock 이동은 fixture로 제어했다. Offline 파형은 기기 출력 없이 실제 브라우저 오디오 엔진으로 렌더했다.

| 실제 Offline 파형 | 표본 |
| --- | --- |
| gain0.8,1초 유지 후30초 선형 감소,31초 stop | 0.5초≈0.8 /16초≈0.4 /30.5초≈0.0133333 /31.5초=0 |
| fade 끔, gain0.5,2초 stop | 0.5·1.5초=0.5 /2.5초=0 |
| 무기한·음소거 | 0.5·1.5초=0, stop 예약 없음 |
| 무기한·gain0.37 | 0.5·1.5초≈0.37, stop/fade 예약 없음 |

[파형 evidence](browser/noise-offline-native-waveforms-evidence.json)는 제품 adapter/plan 지문과 실제 샘플을 포함한다. 소음의 청감·집중/수면 효과, 실제 휴대폰 OS 절전 시 동작, 모든 기기 오디오 정책을 검증한 것은 아니다.

## 최초 fixture 문제와 영향 재검사

1. 새 `about:blank` 테스트 탭의 seed가 sessionStorage에 접근해 SecurityError를 만들었다. HTTP(S) 문서에서만 seed하도록 제한했고 URL/새 방문 사례만 재검사해 통과했다. 제품에서 발생한 저장소 접근 오류가 아니다.
2. 백색소음 이탈 검사는 URL 변경만 기다리고 React passive cleanup/native close가 끝나기 전에 closed를 즉시 검사했다. 실제 패널 detached와 모든 해당 context의 closed를 bounded poll로 확인하도록 바꿔 모바일/이탈 사례만 재검사했다.
3. 세계시계 이탈 검사는 URL 변경 직후, 이전 컴포넌트가 아직 mounted인 시점에 held digest를 풀었다. 실제 미팅 패널 detached를 확인한 뒤 release하여 늦은 다운로드0을 확인했다. 제목/도시 등 다른 지연 취소 경계는 최초 실행부터 통과했다.

따라서 최종14흐름에 영향 재실행3회가 추가됐다. `*-failure.png/txt`는 이 최초 fixture 기록으로 남겼으며 현재 판정은 최종 `*-evidence.json`과 `final-results.json`이다. 테스트 조건 변경으로 제품의 유한시간 내 cleanup 실패를 숨기지 않았고, 완료 조건을 못 만족하면 동일하게 실패하도록 했다.

## 화면과 제한

- [세계시계 미팅 KO 320px](browser/world-clock-meeting-320-dark-ko.png), [정확한 선택 EN 320px](browser/world-clock-selected-320-dark-en.png)
- [백색소음 재생 KO 320px](browser/white-noise-320-dark-ko-top.png), [프로필 EN 320px](browser/white-noise-profiles-320-dark-en.png)

네 캡처를 직접 확인했다. 날짜/offset·이름·버튼은 가로 잘림 없이 줄바꿈되고 사용자 한국어 제목/설정명은 EN에서도 보존됐다. 개발 Issue 배지와 외부 폰트/광고/방문 통계 차단 로그는 제품 JS/hydration 오류와 구분했다. 시간대 계산은 해당 Chrome Intl 데이터에 의존하며 모든 역사적 시간대와 미래 법령을 전수 검증한 것이 아니다. Native Clipboard는 격리 테스트 컨텍스트에 권한을 허용했고, 오류·지연은 제어 fixture로 주입했다. 전체 타입 검사 결과는 통합 담당 보고서에 별도 기록한다.
