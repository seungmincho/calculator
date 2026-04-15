# 인프라 보안 (Redis / MQTT)

## 언제 참고하나?

- Redis 또는 MQTT 설정을 변경할 때
- 프로덕션 배포를 준비할 때
- Docker 네트워크 구성을 검토할 때

## Redis 보안

비밀번호 설정과 네트워크 격리가 핵심이다.

```conf
# redis.conf
requirepass ${REDIS_PASSWORD}
bind 127.0.0.1
protected-mode yes
rename-command FLUSHALL ""
```

```python
import os, redis
client = redis.Redis(
    host=os.getenv("REDIS_HOST", "localhost"),
    password=os.getenv("REDIS_PASSWORD"),
)
```

## MQTT (Mosquitto) 보안

인증, ACL, TLS를 적용한다.

```conf
# mosquitto.conf
allow_anonymous false
password_file /mosquitto/config/passwd
listener 8883                          # TLS (프로덕션)
certfile /mosquitto/certs/server.crt
keyfile /mosquitto/certs/server.key

# acl_file - 토픽 접근 제어
user simulator
topic readwrite simulation/#
```

## 프로덕션 vs 개발 설정 비교

| 항목 | 개발 환경 | 프로덕션 환경 |
|------|-----------|--------------|
| Redis 비밀번호 | 선택 | **필수** |
| Redis 바인딩 | 0.0.0.0 허용 | **127.0.0.1 / Docker 내부** |
| MQTT 익명 접근 | 허용 가능 | **비활성화 필수** |
| MQTT TLS | 불필요 | **필수** |
| Docker 네트워크 | bridge | **격리된 내부 네트워크** |

## Docker 네트워크 격리

```yaml
services:
  app:
    networks: [internal]
    ports: ["8000:8000"]       # API만 외부 노출
  redis:
    networks: [internal]       # 외부 포트 노출 없음
  mosquitto:
    networks: [internal]       # 외부 포트 노출 없음
networks:
  internal:
    internal: true             # 외부 접근 차단
```
