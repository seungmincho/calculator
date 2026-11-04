# 에버랜드 대기 현황 개발·운영 안내

2026-11-04. 기능 브랜치 `feat/everland-wait-times`. 현재 구현은 **iframe 없이 같은 도메인의 독립 현황판으로 이동**한다. 이전 iframe·교차 출처 임베드 제안과 설정 안내를 이 문서로 대체한다. 실제 원격 Worker·D1·Route 상태는 Cloudflare 인증 부재로 확인하지 못했다.

## 구조와 표시 내용

- `/everland-wait-times/`: 기존 Pages가 제공하는 정적 안내·SEO 페이지. 메뉴, 사이트맵, OG, 가이드, FAQ, 출처를 포함하며 `/everland-board/`로 이동하는 일반 링크를 제공한다. iframe·postMessage·추가 공개 환경변수를 사용하지 않는다.
- `/everland-board/`: 독립 Worker `toolhub-everland-collector`가 D1에서 읽어 완전한 사용자용 HTML 페이지를 제공한다. 일반 문서 탐색으로 열며 현황판 상단/하단 링크로 안내 페이지로 돌아간다. JSON API·피드·CSV·공개 수집 트리거는 없다.
- Worker의 `scheduled`: 10분마다 ThemeParks.wiki `/children`과 `/live`를 조회한다. HTTP 읽기는 수집을 실행하지 않는다. 10분 버킷 upsert, 7일 보관이며 쓰기는 `everland_snapshots`에만 제한한다. 실패·429는 마지막 성공 데이터와 시각을 보존한다.
- 제공자 상태 `OPERATING`, `CLOSED`, `DOWN`, `REFURBISHMENT`, `UNKNOWN`을 구분한다. 실제 숫자 0만 0분으로 표시하고 미제공·음수·문자열·비운영 상태 대기시간은 null로 유지한다.
- 수집 성공 시각과 기구별 제공자 갱신 시각을 분리한다. 마지막 수집이 20분을 넘으면 이전 정상 기록임을 표시한다. 화면은 보이는 동안 5분마다 새로 확인한다.
- 오늘의 추이는 한국 날짜 기준, 운영 중이며 시간이 제공된 기구들의 표시 대기시간 중앙값이다. 집계 대상 수를 함께 표시하고 결측 구간은 보간하지 않는다. 방문객 수·미래 혼잡도 예측이 아니다.
- 기존 Pages Function은 이미 Pages에 D1을 연결한 설치를 위한 대안으로 유지한다. 권장 독립 Worker 경로에서는 Pages D1 바인딩이 필요 없다.

## 이용약관과 iframe 제거 이유

[ThemeParks.wiki 약관](https://www.themeparks.wiki/terms)은 자체 제품에서 사용자에게 대기시간을 표시하는 것을 허용하고, 무료 사용 시 링크가 있는 Powered by ThemeParks.wiki 표시를 요구한다. 반면 제3자 사이트로 데이터를 전달하는 iframe/위젯은 재배포로 분류한다. [가격 FAQ](https://www.themeparks.wiki/pricing)도 다른 사람의 사이트에 삽입하는 위젯을 금지 대상으로 설명한다.

같은 운영자의 다른 도메인 간 iframe이 명시적으로 허용된다는 확인은 얻지 못했다. HTML 변환이나 CSP 허용 목록 자체가 권리 확인을 대신하지 않으므로 해당 구현을 제거했다. 독립 현황판은 자체 웹사이트에서 사람에게 직접 표시하며, `Content-Security-Policy: frame-ancestors 'none'` 및 `X-Frame-Options: DENY`로 같은 출처를 포함한 모든 iframe 삽입을 차단한다. 원시 JSON·대량 다운로드를 제공하지 않는다. 이 구조는 약관의 사용자용 대시보드 허용 범위에 더 직접적으로 대응한다.

CORS 허용 헤더는 없다. 일반 페이지 탐색에는 CORS가 필요하지 않다. CSP/CORS는 HTTP 인증이나 스크래핑 방지가 아니며 공개 페이지를 서버에서 직접 읽는 것까지 막지는 않는다. GET/HEAD만 제공하고 다른 메서드는 405, 현황판 외 경로는 404다. no-store, noindex, nosniff를 적용한다. 현황판의 검색 색인을 완료했다고 주장하지 않으며 검색용 안내 페이지는 정적 HTML로 유지한다.

## 지도 한계

사용자가 원하는 **에버랜드 내부 안내도 이미지 위 대기시간**은 아직 구현하지 못했다. 현재는 제공 좌표를 배치한 자체 격자 참고도이며 길·입구·구역 경계를 추정하지 않는다. 공식 이미지의 상업적 게시·수정·오버레이 허락이 확인되지 않아 복제·핫링크·재배포하지 않고 공식 지도 링크만 제공한다.

제공 좌표의 공원 주변 범위 검사는 실제 기구 입구 위치의 독립 검증이 아니다. 겹치는 좌표도 있어 목록에서 기구를 선택할 수 있다. 허락된 공식 이미지 또는 상업적 사용 권리가 있는 자체 안내도를 확보하더라도, 일러스트 좌표는 지리 좌표와 단순 정합하지 않을 수 있어 각 기구의 이미지상 위치를 수동 검수해야 한다. 외부 지도 타일·라이브러리·지도 요금은 없다.

## 보존한 기존 구성

사용자가 만든 D1 ID는 `0c60527d-f048-4d7c-ae52-dd050dd02992`, 코드의 바인딩 이름은 `EVERLAND_DB`다. 실제 DB 이름과 원격 스키마는 미확인이다. 사용자는 migration SQL 실행을 완료했다고 밝혔다. 새 DB 생성·Supabase 이전·스키마 변경은 필요하지 않다.

민감한 루트 `wrangler.toml`은 이번 변경에 포함하지 않는다. 이전 작업의 로컬 D1 블록도 임의 삭제하지 않고 유지한다. Pages의 기존 변수·바인딩·관리자·유가·Supabase 설정을 변경하지 않는다. `workers/everland/pages-bindings.toml`은 이전 Pages D1 방식의 참고 파일이며 현재 경로에서는 적용하지 않는다.

안전한 Worker 설정 파일은 기존 내용 그대로 유지한다: `workers_dev=false`, 알려진 D1 ID, 10분 Cron. Route는 아직 넣지 않았다. 실제 zone 및 기존 Route 충돌 확인 없이 추측한 설정을 배포하지 않는다. 자동 수집과 실제 데이터 연결은 Worker와 Route 배포 전에는 작동하지 않는다.

## Cloudflare에서 필요한 사용자 조치

아래는 실행 순서이며 이 환경에서 원격 설정을 변경한 기록이 아니다. 기존 Pages Git 연결은 `seungmincho/calculator`, 운영 브랜치 `main`, 빌드 `npm run build`, 출력 `out`으로 사용자 화면에서 확인되었다. 기능 브랜치 푸시는 Pages 미리보기를 만들 수 있지만 Worker 생성·Route 설정을 대신하지 않는다.

1. **기존 D1 확인:** Storage & databases → D1 SQL database에서 ID가 위 값인 DB를 선택한다. Console에서 아래 읽기 전용 SQL로 테이블과 인덱스를 확인한다. 이미 있으면 새 DB 생성이나 migration 재실행을 반복하지 않는다.

   ```sql
   SELECT name, sql FROM sqlite_master
   WHERE name IN ('everland_snapshots', 'everland_day_bucket');
   ```

2. **도메인 연결 가능 여부 확인:** Cloudflare Websites에서 `toolhub.ai.kr`을 포함하는 실제 zone이 활성인지, 해당 호스트의 DNS가 Cloudflare 프록시를 사용하는지 확인한다. 기존 Worker Routes에 `/everland-board/`를 이미 처리하는 규칙이 없는지도 확인한다. 조건이 맞지 않으면 DNS나 전체 사이트 설정을 임의 변경하지 않고 실제 상태를 알려야 한다.

3. **Worker Git 연결:** Workers & Pages → Create application → GitHub에서 `seungmincho/calculator`를 연결한다. Worker 이름은 `toolhub-everland-collector`, 루트 디렉터리는 저장소 루트, 빌드 명령은 비움, 배포 명령은 다음과 같다. 자동 감지된 루트 Pages 설정으로 배포하지 않는다.

   ```sh
   npx wrangler deploy --config workers/everland/wrangler.toml
   ```

   처음에는 수정 코드가 들어 있는 `feat/everland-wait-times`를 선택한다. main에 반영한 이후 Worker 운영 브랜치도 main으로 맞춘다. Worker Preview builds는 비활성화해 같은 D1에 여러 예약 수집기가 만들어지지 않도록 한다. SQL migration은 이 명령으로 자동 적용되지 않는다.

4. **기존 인증 사용 가능 여부 확인:** Workers Builds도 API 토큰으로 배포한다. 기본 설정은 토큰 자동 생성이며 기존 적절한 토큰 선택도 지원한다. 새 자격증명 생성이 승인되지 않았으므로 기존 인증이 없으면 여기서 중단하고 그 필요를 보고한다. 토큰 값을 채팅으로 보내지 않는다. 기존 권한·보안 설정도 임의 확대하지 않는다.

5. **배포 후 바인딩·예약 확인:** Worker Bindings에서 `EVERLAND_DB`가 기존 D1 ID를 가리키는지, Settings → Triggers → Cron Triggers에서 `*/10 * * * *`인지 확인한다. 현재 설치된 Wrangler 3.114.17은 이름 없이 DB ID로 검증했지만 Wrangler 버전을 변경할 때는 실제 database_name을 확인해야 한다.

6. **같은 도메인의 경로 연결:** Worker → Settings → Domains & Routes → Add → Route에서 확인한 zone을 선택하고 정확히 `https://toolhub.ai.kr/everland-board/*`를 연결한다. 안내 페이지 링크는 항상 끝에 `/`가 있는 주소를 사용한다. `toolhub.ai.kr/*` 전체 경로나 기존 호스트 전체를 대체하는 Worker Custom Domain은 사용하지 않는다. Route는 대시보드에서 관리한다. 현재 Worker 파일에는 route/routes 키가 없고 workers_dev=false이므로 공식 문서의 대시보드 전용 관리 조건에 맞는다. 이 조건을 유지하고 향후 Git 재배포에서도 Route가 유지되는지 확인한다. 루트 Pages 설정 파일에 Route를 추가하지 않는다. 현재는 workers.dev가 꺼져 있으므로 임의의 workers.dev URL을 열어 확인하는 절차가 아니다.

7. **실제 수집 확인:** Cron은 UTC 기준 10분 간격이고 설정 전파에 최대 약 15분이 걸릴 수 있다. D1 Console에서 아래 SQL로 성공 시각을 확인하고 `https://toolhub.ai.kr/everland-board/`를 직접 연다. 예시 데이터로 초기 상태를 채우지 않는다.

   ```sql
   SELECT count(*) AS observations, max(fetched_at) AS latest_success
   FROM everland_snapshots;
   ```

8. **Pages 운영 반영:** 검증된 기능 브랜치를 main에 반영하면 기존 Pages Git 자동 배포가 안내 페이지를 반영한다. Worker 배포와 Pages 배포는 별개다. 현황판 연결을 먼저 확인하고 안내 페이지의 이동·복귀·모바일 동작을 확인한다. 기능 브랜치 미리보기의 `*.pages.dev/everland-board/`에는 위 커스텀 도메인 Route가 적용되지 않아 Pages D1 미연결 시 503이 계속될 수 있다. 그것을 운영 Worker 검증 결과로 해석하지 않는다.

이 환경에는 Cloudflare 배포 인증이 없어 위 원격 조치를 대신 실행하지 못했다. GitHub 소스 전달과 Cloudflare 실제 연결 완료를 구분해서 보고한다. 새 계정·토큰·유료 플랜·DNS·Route를 자동 생성하거나 변경하지 않는다.

## 초기 상태와 비용

- DB 연결 없음·SQL 미적용·조회 실패: HTTP 503과 데이터 이용 불가 안내.
- 정상 DB에 0행: HTTP 200과 기록 준비 안내.
- 첫 성공: 기구별 현황, 오늘 기록이 1개면 추이 부족 안내.
- 같은 한국 날짜에 2개 이상 기록: 관측 중앙값의 추이.
- 20분 초과 지연: 이전 정상 기록과 지연 경고.

수집은 144회/일, 4,320회/30일이며 매 수집 2번 API 호출한다. 7일 보관으로 약 1,009개 버킷을 유지한다. HTML 조회는 최신 스냅샷 1행과 오늘 요약 최대 144행을 반환하며 실제 D1 청구 스캔 행은 더 많을 수 있다. 화면 5분 갱신도 조회에 포함된다. 기존 계정·공통 D1의 사용량과 한도를 공유하므로 기존 서비스에 대한 간접 영향은 남는다.

2026-11-04 공식 문서 기준 Workers Free 요청 10만/일·CPU 10ms/호출, D1 Free 읽기 500만 행/일·쓰기 10만 행/일·총 저장 5GB다. 초기 소규모 운영은 무료 범위를 목표로 하지만 실제 CPU·사용량 측정 전 0원을 보장하지 않는다. 플랜 변경은 실행하지 않았다.

## 로컬 검증

Node 24 / npm 11.9.0, npm lockfile을 사용한다. Linux 설치를 위한 직접 의존성/lockfile 수정은 앞선 e11e7f7까지 포함되어 있다. 이번 독립 현황판 변경에는 새 의존성이 없다.

```sh
npm run messages:generate
npm run messages:check
npx tsc --noEmit
npx tsc --noEmit --incremental false --target es2022 --module esnext --moduleResolution bundler --resolveJsonModule --esModuleInterop --allowImportingTsExtensions --skipLibCheck functions/everland-board/index.ts workers/everland/index.ts
npx eslint src/lib/everland src/components/EverlandWaitTimes.tsx functions/everland-board/index.ts workers/everland/index.ts
node_modules/.bin/esbuild scripts/check-everland.ts --bundle --platform=node --packages=external --format=cjs --outfile=/tmp/check-everland.cjs
NODE_PATH="$PWD/node_modules" EVERLAND_BROWSER_TEST=1 node /tmp/check-everland.cjs
```

브라우저 테스트는 `/usr/bin/chromium` 또는 CHROMIUM_PATH를 사용한다. 데이터는 테스트용 합성 fixture이고 SQLite는 메모리 DB다. 실제 upstream·원격 D1에 쓰지 않는다. 최종 검증 결과와 로그는 `docs/verify/2026-11-04-everland.md`에 기록한다.

## 근거

- [ThemeParks.wiki 이용약관](https://www.themeparks.wiki/terms), [가격·사용 FAQ](https://www.themeparks.wiki/pricing)
- [공식 내부 지도](https://www.everland.com/everland/map), [공식 이용약관](https://www.everland.com/terms) — 이미지 재사용 허락 미확인
- [Workers Route 요구사항·대시보드 절차](https://developers.cloudflare.com/workers/configuration/routing/routes/)
- [Custom Domains의 호스트 전체 매칭](https://developers.cloudflare.com/workers/configuration/routing/custom-domains/)
- [Workers Builds 설정·인증](https://developers.cloudflare.com/workers/ci-cd/builds/configuration/)
- [Cron 설정·전파 시간](https://developers.cloudflare.com/workers/configuration/cron-triggers/)
- [Workers 가격](https://developers.cloudflare.com/workers/platform/pricing/), [D1 가격](https://developers.cloudflare.com/d1/platform/pricing/)

- [대시보드에서만 Route를 관리하는 Wrangler 조건](https://developers.cloudflare.com/workers/wrangler/configuration/#routes) — route/routes 생략, workers_dev=false.
