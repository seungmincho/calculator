# 42차 한글 워들 native 검증 계획

최종 실행 상태: 8/8 PASS, Chrome 종료. 실제 결과와 fixture 보완 경위는 `review-browser.md` 및 `browser/final-results.json`을 따른다. 아래는 실행 전 선정한 범위이며 일부 세부는 독립/작성자 증거와 구분한다.

상태: 준비. parent/canonical final ready 전 Chrome 실행0. 기존3039·단일 Chrome·격리 synthetic storage만 사용하고 공개 leaderboard RPC는 반드시 mock한다. 실제 점수 제출/조회·사용자 기록 접근0. 현재445/1379 사전·KST 정답/통계 수학은 테스트 기대를 위해 변경하지 않는다.

1. **정상 legacy·최근30·전체통계:** 합성35일 기록과 legacy 첫 유효1개를 seed. 최초0write, 최근30 UI와35일 전체 통계 구분, 진행중 기록은 격자/복사없음. legacy 두 키를 모두 더하지 않고 재방문 완료 기록이 성과를 다시 만들지 않음.
2. **손상·미래·키 분리:** daily null/잘못된 terminal/unknown field/미래 회차 원본 보존·쓰기중단, settings/legacy 오류는 정상 다른 키와 연습을 막지 않음. 8MiB/80k exact 경계는 순수 근거를 유지하고 native에서는 대표 손상만 확인.
3. **실제 두 탭 append:** 같은 날짜 같은 prefix의 동일 추측은 한 번만 append, 서로 다른 다음 추측 분기는 overwrite/concat0. 다른 날짜의 최신 기록은 보존. 명시 reload 확인이 메모리 분기를 바꾸며 외부 이벤트만으로 원고/입력 자동 교체0.
4. **실제 lock·저장 실패:** daily key의 native Web Lock 대기 중 새 연습/날짜 이동은 옛 날짜 저장 의미와 현재 view를 구분. reload/cancel/이탈은 queued 요청 무효. quota/readback unknown은 메모리 판 보존·rollback0·명시 재조회. settings는 별도 lock/key.
5. **reveal·새 판·자정:** 실제750ms reveal과 제어 옛 callback, 빠른 중복 Enter·완료 성과1회·즉시 새 연습/정답 반복/자정(KST clock 주입)을 검사. 옛 reveal/모달/copied timer가 새 판을 풀거나 덮지 않음. 새로고침 완료 기록의 재집계0.
6. **현재/과거/ShareResult 복사:** 실제 native Clipboard의 날짜·회차·시도·색상 격자에 정답/추측 텍스트 없음. 실패 readOnly 전체 격자/선택/재시도/닫기. current/history/공용 공유의 양방향 지연 거부와 날짜·contrast·locale A→B→A의 옛 피드백0.
7. **입력·모달·공개 제출:** native 키보드 두벌식/화면키·합성 composition을 구분. 모달 내부 키가 게임에 새지 않음, 명시 이름 제출의 payload는 mock RPC에만1회. 최초 SSR에 일일 정답을 새로 노출하지 않는지 소스/DOM 경계를 확인.
8. **320px 다크 KO/EN:** reduced-motion과 기록·복구 모달의 Tab/focus/44px·새입력16px·가로넘침/원시 키/JS/hydration, 화면 직접검토. 언어 변경이 현재판·기록 raw를 바꾸지 않음.

한 판 완료 의미의1회 검사는 한 컨텍스트/부모 수명 범위다. 여러 키/여러 탭을 하나의 전역 transaction으로 확정한다고 주장하지 않는다. 실제 OS IME·물리 휴대폰과 합성 이벤트의 한계를 구분한다.
