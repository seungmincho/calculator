---
name: google-calendar
description: Google 캘린더 일정 조회/생성/수정/삭제. "오늘 일정", "이번 주 일정", "미팅 추가해줘" 요청에 사용. 여러 계정(work, personal) 통합 조회 지원.
---

# Google Calendar Sync

## Overview

여러 Google 계정(회사, 개인 등)의 캘린더를 한 번에 조회하여 통합된 일정을 제공한다.
- 사전 인증된 refresh token 사용 (매번 로그인 불필요)
- Subagent 병렬 실행으로 빠른 조회
- 계정 간 일정 충돌 감지

## 트리거 조건

### 조회
- "오늘 일정", "이번 주 일정 알려줘"
- "캘린더 확인", "스케줄 뭐야"
- "다음 미팅", "내일 뭐 있어"
- "일정 충돌 확인해줘"

### 생성
- "새 일정 만들어줘", "미팅 추가해줘"
- "내일 3시에 회의 잡아줘"
- "다음 주 월요일 팀 미팅 생성"

### 수정
- "일정 시간 변경해줘", "미팅 시간 바꿔줘"
- "sync 미팅 14시 21분으로 변경"
- "회의 제목 수정해줘"

### 삭제
- "일정 삭제해줘", "미팅 취소해줘"
- "이벤트 지워줘"

## 사전 요구사항

### 1. Google Cloud 프로젝트 설정

1. [Google Cloud Console](https://console.cloud.google.com)에서 프로젝트 생성
2. Calendar API 활성화
3. OAuth 2.0 Client ID 생성 (Desktop 유형)
4. `credentials.json` 다운로드 → `references/credentials.json`에 저장

### 2. 계정별 인증 (최초 1회)

```bash
# 회사 계정
uv run python .Codex/skills/google-calendar/scripts/setup_auth.py --account work

# 개인 계정
uv run python .Codex/skills/google-calendar/scripts/setup_auth.py --account personal
```

브라우저에서 Google 로그인 → refresh token이 `accounts/{name}.json`에 저장됨

## 워크플로우

### 1. 등록된 계정 확인

```bash
ls .Codex/skills/google-calendar/accounts/
# → work.json, personal.json
```

### 2. Subagent 병렬 실행

각 계정별로 Task 도구를 **병렬**로 호출:

```python
# 병렬 실행 - 단일 메시지에 여러 Task 호출
Task(subagent_type="general-purpose", prompt="fetch calendar for work account")
Task(subagent_type="general-purpose", prompt="fetch calendar for personal account")
```

각 subagent는 다음을 실행:
```bash
uv run python .Codex/skills/google-calendar/scripts/fetch_events.py \
  --account {account_name} \
  --days 7
```

### 3. 결과 통합

- 모든 계정의 이벤트를 시간순 정렬
- 동일 시간대 이벤트 = 충돌로 표시
- 계정별 색상/아이콘 구분

## 출력 형식

```
📅 2026-01-06 (월) 일정

[09:00-10:00] 🔵 팀 스탠드업 (work)
[10:00-11:30] 🟢 치과 예약 (personal)
[14:00-15:00] 🔵 고객 미팅 - 삼양 (work)
              ⚠️ 충돌: 개인 일정과 겹침
[14:00-14:30] 🟢 은행 방문 (personal)

📊 오늘 총 4개 일정 (work: 2, personal: 2)
   ⚠️ 1건 충돌
```

## 실행 예시

사용자: "이번 주 일정 알려줘"

```
1. accounts/ 폴더 확인
   └── 등록된 계정: work, personal

2. Subagent 병렬 실행
   ├── Task: work 계정 이벤트 조회
   └── Task: personal 계정 이벤트 조회

3. 결과 수집 (각 subagent 완료 대기)
   ├── work: 8개 이벤트
   └── personal: 3개 이벤트

4. 통합 및 정렬
   └── 11개 이벤트, 2건 충돌 감지

5. 출력
   └── 일별로 그룹화하여 표시
```

## 에러 처리

| 상황 | 처리 |
|------|------|
| accounts/ 폴더 비어있음 | 초기 설정 안내 (setup_auth.py 실행 방법) |
| 특정 계정 토큰 만료 | 해당 계정 재인증 안내, 나머지 계정은 정상 조회 |
| API 할당량 초과 | 잠시 후 재시도 안내 |
| 네트워크 오류 | 연결 확인 요청 |

## Scripts

| 파일 | 용도 |
|------|------|
| `scripts/setup_auth.py` | 계정별 OAuth 인증 및 token 저장 |
| `scripts/fetch_events.py` | 특정 계정의 이벤트 조회 (CLI) |
| `scripts/manage_events.py` | 이벤트 생성/수정/삭제 (CLI) |
| `scripts/calendar_client.py` | Google Calendar API 클라이언트 라이브러리 |

## 일정 관리 (생성/수정/삭제)

### 일정 생성

```bash
uv run python .Codex/skills/google-calendar/scripts/manage_events.py create \
    --summary "팀 미팅" \
    --start "2026-01-06T14:00:00" \
    --end "2026-01-06T15:00:00" \
    --account work
```

### 종일 일정 생성

```bash
uv run python .Codex/skills/google-calendar/scripts/manage_events.py create \
    --summary "연차" \
    --start "2026-01-10" \
    --end "2026-01-11" \
    --account personal
```

### 일정 수정

```bash
uv run python .Codex/skills/google-calendar/scripts/manage_events.py update \
    --event-id "abc123" \
    --summary "팀 미팅 (변경)" \
    --start "2026-01-06T14:21:00" \
    --account work
```

### 일정 삭제

```bash
uv run python .Codex/skills/google-calendar/scripts/manage_events.py delete \
    --event-id "abc123" \
    --account work
```

### 옵션

| 옵션 | 설명 |
|------|------|
| `--summary` | 일정 제목 |
| `--start` | 시작 시간 (ISO format: 2026-01-06T14:00:00 또는 2026-01-06) |
| `--end` | 종료 시간 |
| `--description` | 일정 설명 |
| `--location` | 장소 |
| `--attendees` | 참석자 이메일 (쉼표 구분) |
| `--account` | 계정 (work, personal 등) |
| `--adc` | gcloud ADC 사용 |
| `--timezone` | 타임존 (기본값: Asia/Seoul) |
| `--json` | JSON 형식 출력 |

## References

| 문서 | 내용 |
|------|------|
| `references/setup.md` | 초기 설정 상세 가이드 |
| `references/credentials.json` | Google OAuth Client ID (gitignore) |

## 파일 구조

```
.Codex/skills/google-calendar/
├── SKILL.md                    # 이 파일
├── scripts/
│   ├── calendar_client.py      # API 클라이언트
│   ├── setup_auth.py           # 인증 설정
│   ├── fetch_events.py         # 이벤트 조회 CLI
│   └── manage_events.py        # 이벤트 생성/수정/삭제 CLI
├── references/
│   ├── setup.md                # 설정 가이드
│   └── credentials.json        # OAuth Client ID (gitignore)
└── accounts/                   # 계정별 토큰 (gitignore)
    ├── work.json
    └── personal.json
```

## 보안 주의사항

- `accounts/*.json`: refresh token 포함, 절대 커밋 금지
- `references/credentials.json`: Client Secret 포함, 커밋 금지
- `.gitignore`에 추가 필수
