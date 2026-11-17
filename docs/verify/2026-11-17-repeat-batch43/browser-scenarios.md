# 43차 단위 일괄 변환 native 검증 계획

최종 실행 상태: 7/7 PASS, Chrome 종료. 실제 결과와 fixture 보완 경위는 `review-browser.md` 및 `browser/final-results.json`을 따른다. 아래는 실행 전 선정한 범위이며 일부 세부는 독립/작성자 증거와 구분한다.

상태: 준비. parent/canonical final ready 전 Chrome 실행0. 기존3039·단일 Chrome·합성 값만 사용한다. 원본26/이전단위 검증을 반복하는 전수회귀는 피하고 새 일괄 입력·복사 소유권 접점을 확인한다.

1. **현재 조합·독립 산술:** 기존 단일 URL 초기복원 후 일괄 명시 실행. 선형 m→cm,섭씨→화씨,연비 역수,CSS rem/px를 별도 산술 기대값으로 비교. 음수·0·지수·쉼표·기존0x10 문법/공백·underscore 의미 보존, 탭은 오류행·빈행은0으로 계산하지 않음.
2. **1000행·200미리보기·CSV:** 합성1000행 전체/정상/오류/빈행 수와 실제200행 DOM 구분. 실제 CSV를 독립 delimited reader로 파싱해 BOM정확1/8열/1000데이터행/순서/특수문자/수식형 원문 텍스트 접두사·오류/빈행 모두 보존. TSV는BOM0·전체 snapshot.
3. **확정 snapshot·이전 결과:** 실행 후 raw·단위 swap·즐겨찾기·precision/rem 변경 시 이전 결과 표시. CSV/복사는 실행 당시 pair/precision/raw 전체이며 재실행만 현재 값 적용. 접기/재열기는 draft/snapshot 유지.
4. **행/문자 한도·빈 입력:**1001행·50001 UTF16은 원문 자르기/부분 성공0·이전 snapshot 보존. 마지막 개행1개는 terminator, 추가 빈줄은보존. 빈 원문0행은 복사/CSV 비활성. 비유한 계산은 해당행만오류.
5. **native Clipboard·실패·교차 세대:** batch/단일/전체표/행/ShareResult 양방향 늦은 거부 fallback0, native 성공과 legacy true/false 주입 분리. 전체 readOnly/선택/재시도, 입력·pair·locale ABA 옛성공 부활0, 실제 이탈 뒤 stale 안내0.
6. **URL·기록·재방문 분리:** 기존 단일 값·unknown query/hash/history.state 복원·수정 유지. batch 고유 marker가 URL/localStorage/최근값/네트워크에 들어가지 않음. 새로운 방문은 단일 값만 복원하며 batch 미자동실행. 전통 요약에서는 조합선택안내와 실행차단.
7. **320px 다크 KO/EN:** 단일 결과 진입/접기·이전 결과·표·복구의 실제16px/44px/가로넘침·원시 키/JS/hydration. EN CSV 헤더와 표시 locale, 원문·숫자 재계산 없음. 짧은 캡처를 직접 검토.

실제 CSV/Clipboard·DOM과 지연/실패 포트를 구분한다. 스프레드시트 소비 앱 실행이나 모든 기기의1000행 성능을 검증했다고 주장하지 않는다. 전체 타입은 통합 담당만 수행한다.
