# FastAPI 보안

## 언제 참고하나?

- API 엔드포인트를 새로 구현하거나 수정할 때
- FastAPI 미들웨어 설정을 변경할 때

## CORS 설정

프로덕션에서는 허용 도메인을 명시적으로 제한한다.

```python
# 좋은 예 - 프로덕션
app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://your-domain.com"],
    allow_methods=["GET", "POST"],
)

# 나쁜 예 - 전체 허용
app.add_middleware(CORSMiddleware, allow_origins=["*"])  # 위험
```

## Request Validation (Pydantic 활용)

모든 요청 데이터는 Pydantic 모델로 검증한다.

```python
from pydantic import BaseModel, Field

class SimulationConfig(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    speed: float = Field(ge=0.1, le=100.0)

@app.post("/simulation")
async def create_simulation(config: SimulationConfig):
    return {"status": "created", "name": config.name}
```

## Rate Limiting 고려

공개 엔드포인트에는 `slowapi` 등으로 요청 횟수를 제한한다.

```python
from slowapi import Limiter
limiter = Limiter(key_func=get_remote_address)

@app.post("/simulation")
@limiter.limit("10/minute")
async def create_simulation(request: Request, config: SimulationConfig):
    pass
```

## Error Response에 내부 정보 노출 금지
```python
# 좋은 예 - 서버 로그에만 기록, 클라이언트에는 일반 메시지
@app.exception_handler(Exception)
async def global_handler(request, exc):
    logger.error("내부 오류: %s", exc)
    return JSONResponse(status_code=500, content={"detail": "내부 서버 오류"})
# 나쁜 예: content={"traceback": traceback.format_exc()} -- 절대 금지
```

## 보안 체크 항목

- [ ] CORS가 프로덕션에서 적절히 제한되어 있는가
- [ ] 모든 요청 데이터에 Pydantic 검증이 적용되어 있는가
- [ ] 에러 응답에 스택 트레이스가 노출되지 않는가
- [ ] Rate Limiting이 적용되어 있는가
- [ ] 프로덕션에서 `docs_url=None`으로 Swagger UI 비활성화
