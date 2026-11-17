# 49차 native 브라우저 검증

최종 **7/7 PASS**, 제품 결함0. 기존3039 dev 서버·격리 Chrome context의 합성 데이터만 사용했고 외부 요청을 차단했다. Chrome은 실행기 종료 시 닫혔다. 통합 담당의 최종 전체 타입 검사도 통과했다(2026-11-17 09:43:59 KST).

- `[피자,국수,피자,김밥]`에서 같은 메뉴2칸을 함께 제외하고 원래4칸 순서로 복구했다. 원본 후보/URL·식사/주간계획 raw는 그대로이고 현재 결과만 무효화되며 최근 추첨 이력과 실제 spin 버튼 초점이 유지됐다.
- 3칸에서 피자2칸 제외는 거부하고 국수1칸 제외 뒤 피자2칸 추첨은 허용했다. 빈 추가는 no-op이며 스핀 중 옛 복구 handler/완료 RAF를 직접 호출해도 새 결과·이력을 만들지 않았다.
- 다른 탭/새 방문은 임시 제외0. 관계없는 식사 기록은 제외를 유지하고 실제 필터 후보 변경·원본 추가는 초기화했다.
- 임시 제외한 피자가 주간 계획 후보에 남았다. 실제7줄 TXT와 계획 초안 보존을 확인했고 명시 저장 없는 식사/계획 raw 쓰기0이었다.
- 4.2초 native RAF 추첨을 독립 회전수/index 계산과 대조했다. 실제 결과 PNG는600×340·34,904바이트, native Clipboard 성공과 제외 뒤 늦은 거부의 fallback0을 확인했다. PNG는 기존 동기 `toDataURL` 출력이며 비동기 encoder 검증으로 확대하지 않는다.
- 일반 roulette의 실제 복사와 order-picker 수동 전체 공개를 짧게 확인했다. 메뉴 전용 UI는 다른 두 경로에 노출되지 않았다.
- 320px 다크 KO/EN 문서·body 폭은320px, 필드16px/동작44px 이상. 실제 Enter/Space 제외·복구와 초점을 확인했고 EN 패널 캡처를 직접 열어 긴 이름·안내 줄바꿈을 검토했다.

첫5/7의 실패2는 검증 fixture의 함수명 조건이 dev 번들의 RAF를 수집하지 못한 문제였다. 제품의 `progress`/`pointerAngle` 소스 경계를 좁혀 관찰하도록 fixture만 고친 후 해당2개를 재실행해 통과했다. 제품 변경이나 신규 제품 결함으로 집계하지 않는다. 최초 failure 자료는 경위로 보존하고 판정은 최신 evidence를 따른다.

JS page error·hydration·unhandled rejection·원시 번역 키0. 난수 첫 호출/옛 callback/Clipboard 거부·storage quota는 제어 포트이고 native Canvas PNG·Clipboard·키보드·RAF·Storage와 구분한다. 실행기 `scripts/check-repeat-batch49-browser.mjs`, 근거 `browser/final-results.json`·각 evidence·PNG·TXT에 있다.

Native 이후 EN 수량 한 문구를 `Available entries: {count} · Temporarily skipped menus: {excluded}`로 정밀화했다. canonical/생성·정적79사용 검사는 통합 담당이 확인했으며 제품 TS·키·placeholder 변경0이다. 기존7흐름을 다시 집계하지 않았다.

최종 타입 근거: 통합 담당 `node --max-old-space-size=2048 ... tsc --noEmit`,09:43:59 KST 시작·free3.36GiB·8.74초·exit0·진단0·chunk0f20ce(동기 종료로 session ID 없음). 첫09:40:26/session62674에서 useSpeakingRecorder.ts131 TS2367 한 건이 있었고 `pageHidden()` 최소 보완 뒤 hook hidden1+parent hidden1·lint0을 확인하고 전체 타입만 재검사했다. 이미 통과한 native는 그대로 보존했으며 새 브라우저 반복은 하지 않았다.
