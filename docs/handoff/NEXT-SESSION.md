# NEXT-SESSION (2026-10-04 밤 — 연속 개선 루프 인계)

전체 흐름·백로그·완료 로그는 [IMPROVEMENT-LOOP.md](IMPROVEMENT-LOOP.md). 이전 인계: [2026-10-04-claude.md](2026-10-04-claude.md).

## 1. 미완료 + 막힌 이유

- **배치 5~7 운영 배포 안 됨** — 커밋·푸시는 끝(`a3cb5c0`, `3293608`, `96d0528`, main = origin/main). 빌드가 두 번 메모리 감시에 걸려 중단(사용자가 원격으로 ChatGPT·Mattermost·Chrome 사용 중 → 컴파일 단계에서 예약 여유 3GB 미만). 사용자가 "빌드는 나중에"로 결정. 운영은 배치 4(`cb1a4fd6`, SW v4.33.0)까지.
  - 배치 5: 상위 39페이지 보이는 FAQ(ToolFaq)·설명·본문, RelatedTools 큐레이션(src/config/relatedTools.ts), 인사말 시즌(크리스마스·건배사·수능·정미년), 셔플 Fisher–Yates
  - 배치 6: 보드게임 7종(BoardGamePage), 자동차 취등록세 재작성·전기차 감면 D-day, 연납 D-day, 종부세 고지서 대조·납부 일정
  - 배치 7: 노동법 개정 날짜별 안내, 신규 /daily-wage-tax·/rental-yield·/one-rep-max
  - 배치 5~7은 빌드본·브라우저 확인 전. 검증은 check-*.ts 152개·tsc 0·i18n audit 0까지만.
- 커밋된 SW 버전은 v4.33.1 — 배포 전에 v4.34.0으로 올릴 것(배치 6·7 포함).

## 2. 재개 프롬프트

```
docs/handoff/NEXT-SESSION.md와 IMPROVEMENT-LOOP.md를 읽고, 배치 5~7을 배포한 뒤 개선 루프를 이어가줘.
1) 메모리 감시 먼저: scratchpad에 memguard.ps1(여유 3GB 미만이면 grep·tsc·next build·playwright만 종료)을 다시 띄우고, PowerShell로 예약 여유(FreeVirtualMemory)가 9GB 이상인지 확인. 부족하면 사용자에게 ChatGPT·Mattermost·Chrome을 잠시 닫아 달라고 요청.
2) public/sw.js 버전 v4.33.1 → v4.34.0, `npx tsc --noEmit`(NODE_OPTIONS=--max-old-space-size=3072) 통과 후
   `SKIP_BUILD_TYPECHECK=1 NODE_OPTIONS=--max-old-space-size=3072 npm run build`
3) `node scripts/check-static-html.cjs out`(h1 없는 건 tips/* 400개만 정상), wrangler pages dev(launch.json "Wrangler Pages Dev")로 새 페이지 확인: /daily-wage-tax/ /rental-yield/ /one-rep-max/ /omok/ /car-tax-calculator/ /comprehensive-property-tax/ /greeting-generator/ /work-hours-calculator/ — 콘솔 오류·번역 키 노출·가로 넘침, 라이트/다크·모바일.
4) 배포: node22(mise installs/node/22.22.1) node_modules/wrangler/wrangler-dist/cli.js pages deploy out --commit-dirty=true --commit-message="<영문>" --branch=main → curl로 운영 h1·sw 버전 확인 → 커밋·푸시.
5) 그다음 IMPROVEMENT-LOOP.md 백로그 상단부터 배치 8 진행(에이전트 3개 안팎, 공유 파일은 메인이 먼저 수정, 에이전트 i18n은 scratchpad JSON → merge-i18n.py / 새 네임스페이스는 add_ns 방식 → npm run messages:generate → node scripts/i18n-namespaces.cjs --audit).
```

## 3. 확인 대기

- 배치 5~7 배포를 지금 진행해도 되나요? (빌드에 예약 메모리 여유 9GB 정도 필요)
- 보드게임 기록 줄은 Supabase 대신 로컬 기록(`ai_game_stats_local`)만 읽습니다 — 다른 기기 기록이 빠져도 괜찮나요?
- 구독료 합계 계산기는 보류했습니다. 필요하면 다음 배치에 넣을까요?

## 참고 (작업 방식)

- 사용자 결정: 광고(AdSense·Axeptio)·Pretendard 폰트는 그대로. 월세지원금은 청년월세로 301 완료.
- 예약 작업: 매월 1일 10:00 보금자리론 금리 갱신(로컬 커밋까지, 첫 실행 11/1), 수능 11/20·12/11.
- 빌드 함정: Turbopack은 worktree의 node_modules junction을 거부(turbopack.root 필요), worktree 폴더는 mise 미신뢰로 npm 실패 — 메인 체크아웃에서 에이전트가 없을 때 빌드하는 게 가장 단순.
