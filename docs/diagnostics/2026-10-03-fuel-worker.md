# 유가 수집 Worker 전환 상태

웹사이트는 Cloudflare Pages를 유지한다. 별도 `toolhub-fuel-collector` Worker가 기존 Pages의 전체 지역 OPINET 프록시를 조회해 기존 Supabase `fuel_prices`에 저장한다. 기존 실시간 조회·지역별 캐시와 2시간 TTL은 유지하며 OPINET 인증키를 다른 서비스로 복사하지 않는다.

## 확인된 접근 및 준비

2026-10-03 UTC 운영 `/api/fuel-prices?sido=all`이 HTTP 200으로 85개 제품별 행을 반환했다. 전국 집계 `00`을 제외하면 현재 응답의 지역은 16개이며 `20`을 포함한다. 예전 지역 목록을 하드코딩하지 않고 실제 응답을 사용한다. 이 검증은 조회 성공이며 Supabase 저장 성공을 뜻하지 않는다.

Worker는 `X-Cached-At`의 한국 날짜로 현재가격 스냅샷을 기록한다. 미래·3시간 초과 타임스탬프, 빈 자료, 잘못된 가격과 필수 가격 누락은 쓰기 전에 차단한다. 날짜·지역 복합키 upsert를 유지하고 저장 응답의 날짜·지역·가격 일치를 확인한다. 임의 오류 내용·URL·설정값은 로그로 남기지 않는다. 과거 누락 기간은 자동 복구하지 않는다.

## 사용자가 직접 입력할 항목

Cloudflare **Workers & Pages → toolhub-fuel-collector → Settings → Variables and Secrets**에서 다음을 입력한다.

| 이름 | 종류 | 목적 |
| --- | --- | --- |
| `SUPABASE_URL` | Variable 또는 Secret | 기존 `fuel_prices`가 있는 Supabase 프로젝트 URL |
| `SUPABASE_SERVICE_KEY` | Secret | 해당 프로젝트에서 수집기의 서버 저장에 사용하는 서비스 키 |

`OPINET_API_KEY`는 기존 Pages에서 계속 사용한다. 새 Worker에는 추가 입력하지 않는다. 기존 노출된 `CRONT_SECRET`을 재사용하지 않는다. 작업자는 비밀값을 읽거나 복사·입력하지 않는다. 값은 사용자만 Cloudflare 화면에 직접 입력한다.

## 활성화 순서

1. Worker를 공개 HTTP 경로와 Cron 없이 배포한다. `workers_dev=false`, `crons=[]`이므로 배포 등록만으로 수집이 시작되지 않는다.
2. 사용자가 위 설정을 입력한다. 이후 재배포는 `--keep-vars`를 사용해 Dashboard에서 설정한 값을 보존한다.
3. 허용된 실제 테스트 실행에서 성공 로그와 Supabase 저장 결과를 확인한다. 단위 테스트·dry-run·배포 성공을 실제 저장 검증으로 대체하지 않는다.
4. 성공 후에만 UTC `0 1 * * *` (한국 오전 10시) Cron을 등록하고 GitHub Actions의 기존 자동 수집을 중단한다. 실패하면 기존 경로·데이터를 유지한다.

현재 저장소 설정은 **Cron 비활성**이다. Secrets 입력과 실제 저장 검증 전에는 전환 완료라고 보고하지 않는다. 새 자격증명 발급·권한 확대·유료 플랜 전환은 이 절차에 포함하지 않는다.

```powershell
node scripts/check-fuel-collector.mjs
node node_modules/wrangler/bin/wrangler.js deploy --config workers/fuel-collector/wrangler.toml --dry-run
```

최초 비활성 Worker 배포와 이후 활성화는 별도 단계다. GitHub Actions 파일은 실제 신규 수집 성공 전까지 유지한다.
