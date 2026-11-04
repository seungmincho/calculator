# 에버랜드 대기 현황 개발·운영 안내

2026-11-04. 작업 브랜치 `feat/everland-wait-times`. 배포·푸시·원격 자원 생성 없음.

## 구현

- `/everland-wait-times/`: 정적 Next.js 페이지. 메뉴·사이트맵 등록, OG 이미지, RSS, 가이드·FAQ·출처와 연휴 플래너 연결.
- `/everland-board/`: Cloudflare Pages Function이 **사람이 보는 HTML 현황판**을 렌더링. 같은 사이트 내 iframe에서 표시하며 크게 보기도 가능. raw JSON API, 피드, CSV 다운로드, 타 사이트 임베드는 제공하지 않음.
- `workers/everland/index.ts`: 10분 간격 예약 수집. ThemeParks.wiki `/children` + `/live`만 호출하고 검증 후 D1에 저장. 외부 HTTP 요청은 404이며 공개 수집 트리거 없음.
- 10분 버킷 기준 중복 수집을 upsert. 7일 보관. 스냅샷과 요약은 원자적으로 저장. 실패·429·비정상 응답은 기존 정상 시각과 기록을 유지.
- 오늘의 추이는 **한국 날짜 기준, 운영 중이면서 시간이 있는 기구의 표시 대기시간 중앙값**. 집계 대상 수 표시, 결측 구간 보간 없음. 방문객 수나 미래 예측이 아님.
- `OPERATING`, `CLOSED`, `DOWN`, `REFURBISHMENT`, `UNKNOWN`을 구분. 0분은 실제 숫자 0만 표시. 미제공·음수·문자열·NaN·비운영 상태의 대기시간은 null로 유지.
- 수집 성공 시각과 제공자의 값 변경 시각을 분리. 20분 이상 수집 지연 시 경고. 화면은 5분마다 확인하며 서비스 워커는 현황판을 캐시하지 않음.

## 지도 요청과 남은 부분

사용자가 원하는 것은 **에버랜드 내부 안내도 이미지 위 대기시간 표시**다. 현재 만든 것은 제공 좌표 기반 자체 위치 참고도이며, 이 요청을 완전히 구현했다고 보아서는 안 된다.

공식 이미지의 상업적 재사용 허락을 확인하지 못해 복제·핫링크·재배포하지 않았다. 공식 지도 링크만 제공한다. 참고도에는 길·입구·구역 경계를 추측해서 그리지 않았으며, 모든 좌표를 정확한 공식 위치로 표현하지 않는다.

2026-11-04 조회에서 메타데이터 57개에 좌표가 있었고 모두 보수적인 공원 주변 범위 안에 있었다. 같은 좌표를 쓰는 항목도 있다. 이 범위 검사는 입구나 실제 시설 위치의 독립 검증이 아니다. 지도 이미지를 확보해도 일러스트는 좌표와 선형 정합하지 않을 수 있어 **각 기구의 이미지상 위치를 수동 검수**해야 한다.

다음 중 하나가 필요하다:

1. 에버랜드의 상업적 웹 게시·이미지 수정/오버레이 허락이 확인된 안내도 파일과 이용 조건.
2. 독립적으로 제작해 상업 이용 권리를 가진 내부 안내도와 검수된 이미지 좌표.

안내도 교체는 `src/lib/everland/render.ts`의 위치도 렌더 부분에서 진행한다. 권리·버전·좌표 검증 근거를 함께 기록한 뒤 연결해야 한다. 지도 타일·외부 지도 라이브러리는 현재 사용하지 않으므로 타일 비용은 없다.

## Git 전달 시 Pages 설정 적용

기존 루트 `wrangler.toml`에는 민감한 설정이 있어 그 파일의 변경본을 이번 기능 커밋에 넣지 않는다. 기존 값을 임의로 삭제·교체하지도 않는다. 클라우드 작업 디렉터리의 추가 바인딩은 유지하되, Git으로 전달하는 안전한 추가 블록은 **`workers/everland/pages-bindings.toml`**이다. 이 파일에는 D1 ID와 바인딩 이름만 있다.

로컬에서 기능 브랜치를 받은 뒤 루트 `wrangler.toml`에 기존 `EVERLAND_DB` 설정이 없는지 확인하고, `pages-bindings.toml`의 전체 블록을 파일 끝에 한 번만 추가한다. 같은 이름의 D1 바인딩이 이미 있으면 중복 추가하지 않고 ID를 대조한다. `pages-bindings.toml`은 단독 배포 설정 파일이 아니다.

수집 Worker의 독립 설정 **`workers/everland/wrangler.toml`**은 민감한 값이 없어 기능 커밋에 포함한다. 기존 루트 설정의 민감값 정리·회전은 별도 작업이며 이번 커밋에서 처리하지 않는다.

## 사용자 D1 연결 준비 상태 (2026-11-04 후속)

사용자가 D1 ID `0c60527d-f048-4d7c-ae52-dd050dd02992`를 제공하고 테이블 SQL 실행을 완료했다고 알렸다. 실제 DB 이름과 원격 테이블 상태는 이 환경에서 확인하지 않았다. 아래 초기 생성 안내의 `toolhub-everland`는 기존 제안 이름이며 실제 생성된 DB 이름으로 단정하지 않는다. **새 DB를 다시 만들거나 SQL을 다시 실행할 필요는 없다.**

- 루트 `wrangler.toml`: 기본·production·preview 각각 `EVERLAND_DB`에 제공된 ID를 추가했다. 기존 구성값은 바꾸지 않았다. preview도 같은 물리 DB를 읽는 구성이다.
- 수집 Worker: `workers/everland/wrangler.toml`에 동일한 ID와 `EVERLAND_DB`, 10분 Cron을 준비했다. 이제 별도 `wrangler.local.toml` 복사 없이 이 파일을 배포 준비 대상으로 사용할 수 있다.
- DB 이름은 추측하지 않고 `database_name`을 생략했다. 설치된 Wrangler 3.114.17의 스키마·검증기는 `binding`과 `database_id`로 검사하며 로컬 dry-run으로 확인한다. 최신 공식 문서는 `database_name`도 필수로 설명하므로 Wrangler를 바꾸거나 이름 기반 DB 명령을 쓰기 전 실제 이름을 확인해야 한다.
- 어떤 원격 연결·권한·배포·Cron 활성화도 실행하지 않았다. 파일 변경은 다음 승인된 배포 때 적용된다. 따라서 자동 수집은 아직 시작되지 않았다.

## Cloudflare 설정 순서 (대시보드 기준)

아래는 안내이며 아직 계정 설정·SQL 실행·배포를 수행하지 않았다. D1 생성만으로는 수집이 시작되지 않는다. **수집 Worker 코드 + D1 바인딩 + Cron을 실제 배포한 뒤** 예약 수집이 동작한다. Pages 배포만으로 수집 Worker가 생기거나 Cron이 실행되지 않는다.

### 지금 미리 준비할 수 있는 단계

1. Cloudflare 계정의 **Storage & databases → D1 SQL database → Create Database**에서 **`toolhub-everland`** 생성. 대시보드 분류명이 다르면 `D1 SQL database` 화면을 찾는다. 이름은 코드에 쓰이는 바인딩 이름과 다르다.
2. **D1 → toolhub-everland → Console**에서 `workers/everland/migrations/0001_waits.sql`의 전체 내용을 붙여 넣고 **Execute**. `CREATE TABLE`과 `CREATE INDEX`만 있으며 기존 데이터를 지우지 않는다. **Tables**에서 `everland_snapshots` 테이블을 확인한다. 처음에는 0행이 정상이다.
3. **Workers & Pages → toolhub.ai.kr이 연결된 기존 Pages 프로젝트 → Settings → Bindings**에서 현재 설정 관리 방식을 확인한다. 로컬 프로젝트 설정명은 `salary-calculator`지만 실제 계정의 프로젝트는 커스텀 도메인으로 식별한다.
   - 대시보드에서 수정 가능한 경우: **Add → D1 database bindings**, Variable name **`EVERLAND_DB`**, D1 database **`toolhub-everland`**. 사용할 Production/Preview 환경에 각각 설정. 실제 적용은 해당 환경 재배포 후다.
   - **Wrangler 관리로 읽기 전용이면 대시보드에서 강제로 바꾸지 않는다.** 이 저장소는 Wrangler 설정을 갖고 있으므로 DB ID를 확인한 다음 승인된 배포 준비 단계에서 Pages의 해당 환경 `d1_databases` 설정에 반영해야 한다. 구성 파일이 정본이며 대시보드만 바꾸는 방법을 전제로 하지 않는다.
4. DB ID는 D1 개요에서 확인할 수 있다. API 키나 Cloudflare 토큰을 대화로 보내지 않는다. 현재 ThemeParks.wiki 익명 라이브 API에는 별도 키가 필요하지 않다.

### 별도 배포 승인 이후 단계

5. 수집 Worker **`toolhub-everland-collector`**를 실제 소스로 생성·배포한다. `workers/everland/wrangler.example.toml`을 같은 폴더 `wrangler.local.toml`로 복사하고 DB ID를 입력하면 코드·바인딩·Cron 설정을 함께 배포할 수 있다. 예제의 자리표시자 그대로 배포하지 않는다. 대시보드에서 Hello World를 만드는 동작도 이미 원격 배포이므로 미리 해둘 필요가 없다.
6. Worker **Bindings → Add binding → D1 database**에 해당하는 연결을 확인한다: Variable name **`EVERLAND_DB`** → DB **`toolhub-everland`**. Pages와 수집 Worker 양쪽이 같은 DB를 가리켜야 한다. Wrangler로 배포할 때는 예제 설정에 이 연결이 들어 있으므로 대시보드에서 중복 생성하지 않고 확인한다.
7. Worker **Settings → Triggers → Cron Triggers**에서 **`*/10 * * * *`** 확인. UTC 기준 10분마다 실행한다. Wrangler로 관리하면 Cron도 파일에서 관리한다. Worker의 `scheduled` 코드와 바인딩이 준비된 다음 활성화하며 공개 HTTP URL을 열어 수집을 시작하는 방식은 제공하지 않는다.
8. Cron 변경 전파는 최대 약 15분 걸릴 수 있다. 첫 수집 성공 후 D1 **Console**에서 아래 읽기 전용 SQL로 확인한다. 두 번째 성공 기록이 생겨야 오늘의 추이 그래프가 표시된다. Cron 이벤트 화면은 새 Worker에서 최대 약 30분 늦게 나타날 수도 있다.

   ```sql
   SELECT count(*) AS observations, max(fetched_at) AS latest_success
   FROM everland_snapshots;
   ```

9. Pages의 바인딩을 반영하고 새 기능 소스와 `functions/`를 포함하여 **먼저 preview 배포**한다. 바인딩을 수정한 이후 이미 배포된 페이지에는 재배포가 필요하다. D1 최근 시각, `/everland-board/` HTML, `/everland-wait-times/` 화면을 함께 확인한 뒤 production 배포를 별도로 진행한다. Pages Functions는 단순 정적 파일 드래그앤드롭만으로 연결된다고 가정하지 않는다.

### 초기 화면과 장애 상태

- DB 연결 없음·SQL 미적용·조회 실패: 현황판 HTTP 503과 데이터 이용 불가 안내.
- 테이블은 있지만 0행: 기록 준비 안내. 가짜 대기시간을 표시하지 않음.
- 첫 성공: 시설별 현황 표시. 오늘 기록이 1개면 추이 부족 안내.
- 오늘 성공 기록 2개 이상: 관측 중앙값의 추이 표시. 결측 구간을 채우지 않음.
- 마지막 성공 후 20분 초과: 이전 정상 기록을 유지하며 수집 지연 안내.

`next dev`와 production 정적 build는 원격 수집 작업을 실행하지 않는다. 로컬 검토 화면에 넣은 관측본도 원격 D1에 저장하지 않았다.

## 예상 비용

매일 24시간 10분 간격: **144회/일, 4,320회/30일**, 매 수집 2개 API 호출로 **8,640회/30일**. 운영시간을 추정해서 수집을 끊지 않는다. D1은 수집당 스냅샷 한 행을 쓰고, 7일 이후 한 행씩 삭제하며 인덱스 쓰기도 계산된다. 수천 행/일보다 적은 규모가 예상된다. 데이터 크기에 따라 다르지만 7일 저장은 수십 MB 수준을 예상한다.

Pages 조회당 최신 스냅샷 1행 + 오늘 요약 최대 144행을 읽는다. 화면 5분 갱신도 추가 조회이므로 트래픽과 기존 계정 사용량을 함께 봐야 한다.

2026-11-04 공식 가격표 기준 D1 Free는 읽기 500만 행/일, 쓰기 10만 행/일, 총 저장 5GB. Workers Free는 요청 10만/일, CPU 제한이 있다. 작은 초기 트래픽은 무료 범위로 설계했지만 운영 사용량·CPU 실측 전 **0원 보장은 하지 않는다**. 무료 한도를 넘으면 자동 유료 전환을 가정하지 말고 오류 및 플랜을 확인한다.

## 로컬 검증

Linux CI 준비 과정에서 Windows 전용 `@tailwindcss/oxide-win32-x64-msvc@4.2.2` 직접 의존성을 제거했다. 기존 `package-lock.json`은 이미 Tailwind 4.1.18과 운영체제별 선택 의존성을 기록하고 있어 재생성하지 않았다. Linux에서는 해당 플랫폼의 네이티브 패키지가 설치되며, Windows 패키지도 선택 의존성으로 유지된다. 초기 개발 때 사용한 강제 설치 우회는 더 이상 필요하지 않다. 후속 검증은 기존 `node_modules`와 로컬 환경 파일이 없는 별도 복사본에서 Node 24.19.0 / npm 11.9.0으로 수행했다.

```sh
npm ci
npm run messages:generate
npm run messages:check
node scripts/i18n-namespaces.cjs --apply
node scripts/i18n-namespaces.cjs --audit
npx tsc --noEmit
npx tsc --noEmit --incremental false --target es2022 --module esnext --moduleResolution bundler --resolveJsonModule --esModuleInterop --allowImportingTsExtensions --skipLibCheck functions/everland-board/index.ts workers/everland/index.ts
npx eslint src/lib/everland src/components/EverlandWaitTimes.tsx src/app/everland-wait-times/page.tsx functions/everland-board/index.ts workers/everland/index.ts
node_modules/.bin/esbuild scripts/check-everland.ts --bundle --platform=node --packages=external --format=cjs --outfile=/tmp/check-everland.cjs
NODE_PATH="$PWD/node_modules" EVERLAND_BROWSER_TEST=1 node /tmp/check-everland.cjs
```

브라우저 테스트는 Chromium `/usr/bin/chromium` 또는 `CHROMIUM_PATH`가 필요하다. 테스트용 데이터는 스크립트 내부의 합성 데이터이며 운영에 저장하지 않는다. SQLite는 메모리 DB에서만 실행한다.

후속 명시적 요청으로 `npx tsc --noEmit` 통과 후 `SKIP_BUILD_TYPECHECK=1 npm run build` 전체 production build를 완료했다. 772/772 정적 페이지 생성 성공. 에버랜드의 정적 본문·canonical·JSON-LD·사이트맵·OG를 확인했고, production 출력의 모바일/데스크톱 브라우저 검증도 통과했다. 실제 Cloudflare D1/Cron preview 검증은 남아 있다. 이 구현은 날짜별 SEO 예측 페이지를 만들지 않고 정적 안내 페이지의 기반만 마련한다. 실시간 iframe은 중복 검색을 피하도록 noindex이며 라이브 관측값의 검색 색인을 완료한 것은 아니다.

## 근거 (2026-11-04 확인)

- ThemeParks.wiki 이용약관: https://www.themeparks.wiki/terms — 사용자 대상 표시 허용, 연결된 `Powered by ThemeParks.wiki` 필수, 데이터 재배포 제한.
- 무료 API: https://www.themeparks.wiki/pricing
- 공식 내부 지도: https://www.everland.com/everland/map
- 공식 가이드맵 안내: https://www.everland.com/everland/information/guidemap
- 공식 이용약관: https://www.everland.com/terms — 부모 스레드 조사에서 제22조 상업적 복제 제한 확인. 이번 실행기의 정적 웹 읽기는 JS 앱 내용까지 얻지 못했으며 별도 사용 허락은 확인되지 않음.
- D1 가격: https://developers.cloudflare.com/d1/platform/pricing/
- Workers 가격: https://developers.cloudflare.com/workers/platform/pricing/
- OSM 타일 정책도 검토했으나 사용자 설명에 따라 타일 지도를 구현에 사용하지 않음: https://operations.osmfoundation.org/policies/tiles/

## Production build 검증 추가 (2026-11-04)

- 타입 검사를 별도로 통과했으므로 저장소 지침대로 build 중 중복 타입 검사만 생략했다. build 로그의 `Skipping validation of types`는 이 설정의 정상 표시다.
- build 오류 없음. `baseline-browser-mapping` 데이터가 2개월 이상 됐다는 동일 경고가 worker별 총 10번 출력됐다. 기존 의존성 경고이며 자동 업그레이드는 하지 않았다.
- `check-static-html.cjs out`: 771개 HTML 검사에서 기존 `tips/1`~`tips/400`의 h1 없음 400건. 모두 `noindex`임을 확인했으며 기존 인계 문서에도 기록된 항목이다. 에버랜드와 나머지 페이지에는 해당 검사 실패 없음.
- 로그: `/tmp/everland-production-build.log`, `/tmp/everland-static-check.log`. 에버랜드 개별 정적 검사: `/tmp/everland-evidence/production-html-results.json`.
- 로컬 검토 주소 `http://127.0.0.1:4143/everland-wait-times/`는 이제 production 정적 출력과 개발 시 수집본을 연결한다. 수집본은 고정 시각의 관측이며 이후 자동 갱신되는 운영 데이터가 아니다.
- 대시보드 절차 근거: [D1 생성·Console](https://developers.cloudflare.com/d1/get-started/), [Pages D1 바인딩](https://developers.cloudflare.com/pages/functions/bindings/), [Wrangler 설정 정본](https://developers.cloudflare.com/pages/functions/wrangler-configuration/), [Cron 설정·전파 시간](https://developers.cloudflare.com/workers/configuration/cron-triggers/).
