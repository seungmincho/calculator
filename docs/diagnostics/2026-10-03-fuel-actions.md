# 유가 수집 실패 원인과 필요한 설정 (2026-10-03)

## 확인된 원인

사용자가 제공한 [Actions 실행 로그](https://github.com/seungmincho/calculator/actions/runs/37102249143/job/111143924946#step:4:10)는 커밋 `1175a53b76716cb9891fccdb3aa400d843941d75`의 수집 단계에서 세 환경 변수가 모두 비어 있었다고 보여준다. 이어서 `Missing required env vars: OPINET_API_KEY, SUPABASE_URL, SUPABASE_SERVICE_KEY`로 종료 코드 1이 발생했다.

`scripts/collect-fuel-prices.mjs`의 필수 설정 검사와 일치한다. API 호출·Supabase 저장 전에 중단됐으며, Node.js 20 및 Ubuntu 이미지 전환 경고가 이 실행의 실패 원인은 아니다. 빈 설정을 통과시키는 변경은 하지 않았다.

## 워크플로 참조 확인

`.github/workflows/collect-fuel-prices.yml`은 다음 이름을 `secrets` context에서 읽는다. 스크립트의 환경 변수 이름과 모두 일치한다. `vars` context나 `jobs.collect.environment` 선언은 없다.

| GitHub Actions secret 이름 | 수집기에 필요한 설정 |
| --- | --- |
| `OPINET_API_KEY` | OPINET에서 발급한 API 키 |
| `SUPABASE_URL` | 유가 테이블이 있는 Supabase 프로젝트 URL |
| `SUPABASE_SERVICE_KEY` | 해당 프로젝트에서 수집기의 서버 저장 작업에 사용하는 서비스 키 |

현재 코드에서 명확한 참조 오타는 발견되지 않았다. 로그로 확인되는 사실은 **이 실행에 설정이 전달되지 않았다는 것**이다. GitHub의 비공개 설정 화면을 확인하지 않아 미등록, 이름/등록 위치 차이, 접근 범위 중 어떤 설정 상태인지는 구분하지 않았다.

## 사용자가 직접 처리할 설정

1. 저장소의 **Settings → Secrets and variables → Actions → Secrets → New repository secret**에서 위 세 이름을 정확히 등록하거나 기존 등록 이름을 확인한다. `Variables` 탭에 등록된 값은 현재 `secrets.*` 참조에 전달되지 않는다.
2. Environment secret에만 등록했다면 현재 job에는 environment 지정이 없으므로 그 값을 받지 못한다. 현재 워크플로에 맞춰 repository secrets를 사용하거나, 의도한 environment 이름과 접근 규칙을 확인한 뒤 별도 코드 변경으로 job의 environment를 지정한다. 실제 환경 이름을 추측해 추가하지 않았다.
3. 설정 후 사용자가 **Actions → Collect Fuel Prices → Run workflow**로 확인한다. 이 실행은 OPINET 조회 후 Supabase에 유가를 저장하므로 이번 로컬 검증에서는 실행하지 않았다. 성공 로그의 날짜·지역 수와 해당 날짜의 조회 결과를 함께 확인한다.

비밀값을 채팅·코드·스크린샷으로 공유하지 않고 GitHub 설정 화면에 직접 입력한다. 기존 Cloudflare 설정은 GitHub Actions secrets에 자동으로 전달되지 않는다. 작업 중 비밀값 조회·복사·출력·업로드 또는 설정 변경은 하지 않았다. [GitHub 공식 안내](https://docs.github.com/en/actions/how-tos/write-workflows/choose-what-workflows-do/use-secrets)는 repository/environment secret 등록 방법과 미설정 secret 참조가 빈 문자열이 되는 동작을 설명한다.

## 화면 개선 및 검증 경계

과거 날짜 조회 API는 요청일 이전의 가까운 자료를 반환할 수 있다. 유류비 계산기는 이제 요청일과 실제 적용 기준일을 함께 안내한다. 동일 날짜, 실시간 조회, 수동 입력에는 해당 안내를 표시하지 않는다. API 실패·자료 없음에는 기존 가격 유지 안내를 보존한다.

브라우저 회귀 테스트의 API 데이터는 고정된 모의 응답이다. 따라서 화면 동작은 검증했지만 실제 외부 수집·인증·Supabase 쓰기 성공을 검증한 것은 아니다. 수집이 복구되어도 누락된 과거 날짜가 자동으로 채워지는 코드는 현재 없으므로 과거 자료 상태를 별도로 확인해야 한다.
