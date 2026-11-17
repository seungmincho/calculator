# 19차 독립 브라우저 검증

2026-11-17 01:39 KST 최종. **14/14 PASS — Diff 7개, Markdown 7개. JS pageerror·hydration 오류·unhandled rejection 0.** 기존 localhost:3039에서 격리 Chrome 한 인스턴스를 순차 사용했고 모두 종료한 뒤 통합 담당에게 전체 타입 검사 가능 신호를 보냈다. 이 담당은 제품 파일·dev 서버·빌드·배포·전체 타입 검사를 변경하거나 실행하지 않았다.

[실행 스크립트](../../../scripts/check-repeat-batch19-browser.mjs), [시나리오](browser-scenarios.md), [최신 결과 JSON](browser/final-results.json)에 근거를 남겼다. 검사 도중 추가 제품 결함은 확정되지 않았다.

브라우저 종료 후 전체 타입 검사에서 React input의 `onCancel` 타입 미지원 1건을 발견했다. 담당자가 JSX prop을 ref 기반 native `cancel` listener 및 cleanup으로 교체했고 실제 effect/DOM event 3그룹과 독립 부모 취소 1그룹이 통과했다. 이 최소 연결 변경 뒤 Chrome은 재실행하지 않았으며 기존 14개 브라우저 결과와 변경 후 컴포넌트 검증을 구분한다. 통합 담당의 01:44:40 KST 전체 타입 재검사는 exit 0이었다.

| 실제 브라우저 사례 | 결과 |
| --- | --- |
| 실제 Worker: 한글·빈 줄·CRLF/LF·끝 개행·HTML 원문, 양쪽 재구성, TXT/native clipboard, 이전 snapshot | PASS |
| 8,000줄 동일 문서·중간 1줄 수정·200행 페이지·변경 필터·전체 내보내기 | PASS |
| UTF-8 1MiB·10,000줄·남은 DP 작업량 상한 초과 및 이전 결과 보존·빈 문서 | PASS |
| native Worker의 전달 지연 중 취소·편집·새 비교·좌우 교체·전체 초기화 | PASS |
| Worker 미지원·생성 오류·30초 timeout 안내와 native Worker 복구 | PASS |
| Diff 복사 실패·readOnly 전체 선택·입력 뒤 늦은 거부의 fallback 차단 | PASS |
| Diff 320px 다크 영어·표 내부 스크롤·16px 입력·44px 버튼 | PASS |
| Markdown/HTML/rich native 복사와 실제 MD/HTML 다운로드·자동저장 | PASS |
| 세 복사 실패·수동 선택·rich 텍스트 대안 구분·native retry | PASS |
| Clipboard API 없음·legacy false/true·다른 복사/편집/언마운트 뒤 늦은 완료 | PASS |
| 실제 md 파일 읽기·상한/형식 거부·선택 취소·명시 빈 파일 | PASS |
| FileReader 역순 완료·읽는 중 편집·선택 취소·읽기 오류·늦은 오류 | PASS |
| 실제 Clipboard PNG 붙여넣기·이미지 늦은 읽기·기존 2MiB 제한 | PASS |
| Markdown 320px 다크 영어 수동 선택 및 18차 사용자 예제 원고 저장 보존 | PASS |

## 실제 실행과 산출물

- Chrome의 native Worker가 Next 개발 번들의 Blob worker 경로로 실제 생성되어 요청과 응답을 처리했다. 비교 결과 배열에서 왼쪽/오른쪽 원문을 각각 독립 재구성했다. HTML처럼 보이는 입력은 실행되지 않았다. Worker URL·생성/종료·입력 길이는 개별 evidence JSON에 기록했다.
- 8,000줄 동일 문서의 Worker 응답과 화면 완료는 이 환경에서 **463ms**였다. 중간 한 줄을 바꾸면 추가1/삭제1/유지7,999였다. 200행씩 보는 상태와 변경2행 필터에서도 [전체 TXT](browser/diff-8000-lines-full-result.txt)는 8,001행이며 양쪽 원문을 모두 재구성했다. 단일 측정이며 일반 기기의 성능 보장은 아니다.
- [한글/개행 TXT](browser/diff-unicode-comparison.txt)와 [편집 후 이전 확정 결과 TXT](browser/diff-previous-snapshot.txt)는 동일했다. 명시 재비교 후에만 최신 원문 결과가 됐다. TXT는 읽기용 접두사 형식이며 표준 patch라고 취급하지 않았다.
- Markdown의 실제 Clipboard API를 읽어 `text/plain`과 `text/html`을 확인했다. rich 복사의 Markdown 원문 및 `<strong>` HTML 내용을 확인했고, [MD 파일](browser/markdown-current.md)과 [HTML 파일](browser/markdown-current.html)도 실제 다운로드하여 현재 원고/제목/강조를 확인했다. 다른 OS 앱에 붙여넣는 단계까지 검증한 것은 아니다.
- 2×3 PNG를 Clipboard API에 쓴 뒤 실제 Ctrl+V로 붙여넣었다. native FileReader가 data URL을 만들었고 미리보기 이미지의 naturalWidth/Height가 2×3이었다. 이후 이미지 읽기 경합은 제어한 FileReader로 구분했다.
- [Diff 영어 결과/복사 실패 화면](browser/diff-english-320-dark-result.png), [Markdown 영어 수동 복구](browser/markdown-english-320-dark-panel.png), [Markdown 상단](browser/markdown-english-320-dark-top.png)을 직접 시각 확인했다. 가로 넘침·원시 번역 키가 없었으며 검사한 입력은 16px 이상, 복구 버튼은 44px 이상이었다.

## 실패 주입과 검증 한계

- Clipboard API 거부·없음과 `execCommand` false/true는 검증 컨텍스트에 주입했다. legacy true 사례는 성공 상태 처리 검사이며 실제 OS 복사를 입증하지 않는다. 실제 복사 근거는 별도의 native Clipboard 읽기 사례다. 이미 OS에 전달된 비동기 쓰기 자체를 취소했다고 주장하지 않으며, 오래된 UI 완료/복구와 추가 fallback이 차단됐음을 확인했다.
- Worker 취소 사례는 native Worker를 생성하되 `postMessage` 전달을 지연시켰다. 취소한 인스턴스가 종료되고 이전 작업이 새 결과를 덮지 않았다. 미지원/생성 오류/응답 없는 Worker와 30초 시간 경과는 주입한 경계다. CPU 계산 중 특정 시점의 강제 중단을 직접 측정한 것은 아니다.
- FileReader 역순/오류는 abort 뒤에도 이전 콜백을 강제로 전달할 수 있는 제어 객체로 검사했다. 실제 작은 파일 읽기·빈 파일·파일 선택과 이미지 붙여넣기 사례는 native API를 사용했다.
- 초기 큰 입력 검사에서 Playwright `fill`이 첫 textarea의 가시성/입력 단계에서 timeout이 났고, Worker를 생성하기 전에 검증 renderer가 약3.4GiB까지 증가했다. 식별한 검증 전용 Chrome만 종료했다. 사용자가 쓰는 실제 Clipboard 붙여넣기로 같은 8,000줄·UTF-8 한도 입력을 다시 확인하니 정상 처리됐다. 이 현상은 해당 자동화 입력 경로에서 관찰된 실패로 분리했으며 비교 알고리즘/제품 결함으로 보고하지 않았다. 이후 각 컨텍스트에 60초 종료 watchdog을 적용했다.
- 외부 폰트·광고·분석 요청은 차단했다. 320px는 데스크톱 Chrome viewport이며 실제 휴대폰의 OS 선택 메뉴·서드파티 편집기 붙여넣기·모든 기기의 Worker 성능 검증은 아니다. 개발 배지 및 의도적인 네트워크 실패는 JS/hydration 오류와 구분했다.
