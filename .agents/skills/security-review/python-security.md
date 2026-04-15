# Python 보안 기본

## 언제 참고하나?

- 보안 리뷰 수행 시
- 민감 정보(비밀번호, API 키 등)를 다루는 코드 작성/수정 시
- 외부 입력을 처리하는 로직 구현 시

## 환경 변수로 민감 정보 관리

모든 비밀번호, API 키, 토큰은 환경 변수로 관리한다. `.env` 파일은 `.gitignore`에 포함해야 한다.

```python
# 좋은 예
import os
REDIS_PASSWORD = os.getenv("REDIS_PASSWORD")
REDIS_HOST = os.getenv("REDIS_HOST", "localhost")  # 비밀 아닌 설정만 기본값 허용

# 나쁜 예 - 하드코딩 금지
REDIS_PASSWORD = "my-secret-password"
API_KEY = "sk-abc123def456"
```

## 입력 검증 (Pydantic 활용)

외부 데이터는 Pydantic 모델로 검증한다. `Field`로 범위와 제약 조건을 명시한다.

```python
from pydantic import BaseModel, Field

# 좋은 예 - Pydantic이 자동 검증
class SimulationRequest(BaseModel):
    speed: float = Field(ge=0.1, le=100.0)
    name: str = Field(min_length=1, max_length=100)
    max_entities: int = Field(ge=1, le=10000)
```

## 로깅에서 민감 정보 제외

```python
# 좋은 예
logger.info("Redis 연결 성공: host=%s, port=%d", REDIS_HOST, REDIS_PORT)

# 나쁜 예
logger.info("Redis 연결: password=%s", REDIS_PASSWORD)  # 비밀번호 노출
```

## pickle / eval 사용 절대 금지

`pickle.loads()`와 `eval()`은 임의 코드 실행 취약점을 유발한다. JSON 또는 MessagePack을 사용한다.

```python
# 좋은 예
import json, msgpack
data = json.loads(payload)
data = msgpack.unpackb(payload)

# 나쁜 예 - 절대 금지
import pickle
data = pickle.loads(untrusted_data)   # 원격 코드 실행 가능
result = eval(user_input)             # 원격 코드 실행 가능
```

## 의존성 취약점 검사

```bash
# pip-audit으로 취약점 스캔
uv run pip-audit
```

## 보안 체크 항목

- [ ] `.env` 파일이 `.gitignore`에 포함되어 있는가
- [ ] 하드코딩된 비밀번호, 키, 토큰이 없는가
- [ ] 외부 입력에 Pydantic 검증이 적용되어 있는가
- [ ] 로그에 민감 정보가 포함되지 않는가
- [ ] `pickle.loads()`, `eval()`, `exec()`를 사용하지 않는가
- [ ] `subprocess` 호출 시 `shell=True`를 피하고 있는가
- [ ] 의존성 취약점 스캔을 실행했는가
