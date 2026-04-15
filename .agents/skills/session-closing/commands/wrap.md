---
description: "세션 종료 — 커밋, 메모리, 개발일지 업데이트. 기본=경량, --full=분석 포함"
allowed-tools: Bash(git *), Read, Write, Edit, Glob, Grep, Agent, AskUserQuestion
---

# Session Closing (/closing)

세션을 종료하고 작업 내역을 기록한다.

## Mode Detection

- `/closing` → Lite Mode (커밋 + 메모리 + 로그)
- `/closing --full` 또는 "분석 세션종료" → Full Mode (에이전트 분석 + Lite)
- `/closing [message]` → Lite Mode + 지정 커밋 메시지

## Execution

`skills/session-closing/SKILL.md`의 워크플로우를 따라 실행한다.

### Lite Mode (기본)
1. `git status` 확인
2. 변경사항 커밋 (있으면)
3. MEMORY.md 업데이트 (브랜치/커밋/다음작업/완료Phase/테스트현황)
4. `docs/development-log.md` 업데이트 (오늘 작업 내역)
5. CLAUDE.md 업데이트 (Phase 완료 등 해당 시만)

### Full Mode (--full)
1. Lite Mode 앞에 에이전트 분석 단계 추가
2. 분석 결과를 Lite Mode에 반영
