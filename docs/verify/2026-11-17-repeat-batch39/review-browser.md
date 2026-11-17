# 39차 정규식 실제 Chrome 검증

2026-11-17 **08:07:42 KST, 8/8 PASS**, Chrome/context 모두 종료. 최초 제품 결함1건은 수정 후 실제 경로가 통과했고 미해결 native 제품 결함은 없다. 통합 담당의37/39/40 최종 전체 타입도 **08:08:20 KST 시작·2GB·exit0/진단0**으로 통과했다. 기존40차8/8·37차8/8 검사는 반복하지 않았다.

| 흐름 | 실제 확인 결과 |
|---|---|
| Native Worker·기존 의미 | 정규식 경로의 실제 Chrome Worker7개 생성/응답/각 terminate1. 비전역 캡처·CRLF grep·JS 치환 토큰 독립 oracle·Unicode astral의 빈 일치 전진·공백 패턴·빈 결과 완료 통과 |
| 역추적·취소·timeout | `(a+)+$` 합성 입력은 실제 Worker 안에서만 실행. 300ms 관측 중 main heartbeat19회/max16.8ms, native 중지·terminate 뒤 자동 재시작0. 명시 재시도 중 입력 변경은 새 성공42를 확정. foreground timeout 관측5449ms 뒤 이전 결과 유지, 해당 흐름의 Worker5개 모두 종료 |
| 늦은 결과·숨김·실패 | native 응답 전달만 보류한 A→B에서 옛 완료 무효. 제어 visibility/pagehide 뒤 자동 재시작0·명시 retry만 실행. Worker 미지원/생성실패/messageerror/불량 응답은 명확 오류와 이전 결과 보존·native 복구 |
| 스마트·확정 결과·이력 | dedupe·capitalize·여러 글자 구분자 처리, replacement 포함 기존 이력 저장/복원, quota 실패의 기존 raw bytes 유지. 새 패턴 오류는 이전 성공 결과 표시·현재 저장/링크 제한, 이전 성공 TXT 반출 |
| 큰 결과·TXT·복구·한도 | **63,000 UTF-16** 성공 결과 중50,000 미리보기. 실제 UTF-8 TXT **105,000 bytes**를 독립 Buffer와 동일성 대조. native Clipboard 전체 전달·수동 원문 전체 선택. 입력1,000,001/일치100,001/결과5,000,000 초과는 부분 성공 없이 이전 결과 보존 |
| 파일·복사 세대 | 실제 FileReader가 읽은 A/B 완료 전달 역순·취소 뒤 늦은 load 무효. 파일 읽기 실패·4MiB 초과는 기존 입력 유지, 초과는 reader 생성0. 같은 파일 재선택·native Clipboard·API 없음/legacy false·수동 선택/재시도. output→link 늦은 거부 fallback0·입력/언어 A→B→A 안내 부활0 |
| URL·재방문 | legacy 이중 인코딩·빈 flags·replacement 링크 새 탭 복원. unknown query/hash/history.state 유지. malformed percent 원문과 중복 경고,16,384자 한도 초과 때 옛 소유 URL key 제거·공유 제한·새로고침에서 옛 입력 부활0 |
|320px 다크 KO/EN | body/document320px, 확인한 입력16px 이상·새 실행/반출 버튼44px 이상. 언어 변경 후 원문/결과 유지. 복구 패널과 첫 화면 캡처를 직접 검토 |

**줄바꿈은 계층별로 구분했다.** CRLF URL 원문을 처리한 실제 [grep TXT](browser/crlf-grep.txt)는 `keep A\r\nkeep B\r`의15바이트를 보존한다. textarea 값은 HTML 규칙에 따라 LF로 표시한다. 큰 결과의 Clipboard API에 전달된 문자열은 LF 전체와 정확히 같고, Windows native `readText()`는 CRLF를 반환하므로 내용 비교에서 그 OS 변환만 정규화했다. 실제 [전체 TXT](browser/large-whole.txt)의 바이트 비교에는 정규화를 적용하지 않았다.

**성능 관측의 범위:** 63k native paste→Worker→50k preview 완료는1330ms, 이 구간 main heartbeat 최대 간격은930.6ms였다. 입력·DOM 갱신을 포함한 값이며 Worker 계산 시간이나 모든 UI가 무지연이라는 근거가 아니다. 반면 위험 정규식 실행 구간의19회 heartbeat와 실제 종료는 계산이 Worker에서 수행됨을 확인한다. 별도 core/렌더 성능 분해는 이 검사의 범위 밖이다. 5초 timeout은 이 foreground Chrome의 관측이며 background/모바일의 엄격 wall-clock SLA를 주장하지 않는다.

## 발견·수정과 검증기 정정

첫 실제 진입에서 `RegexExtractor.tsx`가 실제 `@/lib/i18n`에 없는 `useLocale`을 import하여 HTTP500/Next compile overlay가 발생했다. 자체 fixture가 가상 export를 제공해 놓친 제품 경계다. [첫 오류 기록](browser/initial-compile-failure.json)을 보존했고, 작성자가 실제 `LanguageContext.useOptionalLanguage`를 사용하도록 최소 수정·locale 영향/lint 확인 후 새 context에서 검증했다. 첫8실패는 같은 진입 결함으로 기능 흐름에 도달하지 못한 상태이며8개 제품 결함으로 세지 않는다.

이후5/8 통과와 나머지3실패는 검증기 기대값/선택자를 수정했다: CRLF 끝 CR의 textarea LF 표시, Windows Clipboard LF→CRLF, URL kind 오류와 개별 malformed/duplicate 경고의 서로 다른 DOM, `추출`이 필터 설명에도 포함되는 버튼 이름 중복이다. 해당 실패 흐름만 선별 재검사해 최종8/8이 됐다. 제품 추가 변경은 없었다. 남아 있는 `*-failure.*` 파일은 과거 진단 자료이며 최종 상태는 [final-results.json](browser/final-results.json)이다.

최종 JS pageerror·hydration·미처리 rejection·원시 번역키0. 외부 폰트/광고/분석/도구방문 기록 요청은 차단한 예상 console 오류이며 기능 JS 오류와 구분한다. 실제 Worker/FileReader/Clipboard/TXT와 제어한 전달 지연·실패·visibility·legacy 복사 성공을 혼동하지 않았다. 실사용 원문·외부 서비스 데이터는 사용하지 않았다.

실행기: `scripts/check-repeat-batch39-browser.mjs`, 포트: [browser-fixtures.mjs](browser-fixtures.mjs), 범위 ESLint exit0. [KO 첫 화면](browser/regex-320-ko-top.png), [EN 복구](browser/regex-320-en-panel.png)를 직접 검토했다. 기존 개발 Issue 배지·하단 고정 탐색은 제품 회귀로 판정하지 않았다.
