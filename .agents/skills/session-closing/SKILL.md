---
name: session-closing
description: "세션 종료 스킬. 경량 모드(기본): '세션종료', 'closing', 'wrap up'. 풀 모드: '분석 세션종료', '분석 closing', 'analyze closing'. 경량 모드는 커밋+메모리+로그만. 풀 모드는 에이전트 분석 후 경량 모드 실행."
version: 3.0.0
---

# Session Closing Skill v3

두 가지 모드로 동작하는 세션 종료 스킬.

## Mode Detection

| 사용자 입력 | 모드 |
|-------------|------|
| "세션종료", "closing", "wrap up", "끝내자", "/closing" | **경량 (Lite)** |
| "분석 세션종료", "분석 closing", "analyze closing", "/closing --full" | **풀 (Full)** |

---

## Lite Mode (기본) — 에이전트 없이 직접 실행

컨텍스트가 부족한 상황에서도 안전하게 실행 가능한 최소 워크플로우.

```
┌─────────────────────────────────────┐
│ 1. git status + diff 확인           │
├─────────────────────────────────────┤
│ 2. 변경사항 커밋                     │
├─────────────────────────────────────┤
│ 3. MEMORY.md 업데이트               │
├─────────────────────────────────────┤
│ 4. development-log.md 업데이트      │
├─────────────────────────────────────┤
│ 5. AGENTS.md 업데이트 (해당 시만)    │
└─────────────────────────────────────┘
```

### Step 1: Git Status 확인

```bash
git status --short
git log --oneline -5
```

### Step 2: 변경사항 커밋

- 변경사항이 있으면 커밋 메시지를 작성하여 커밋한다
- 커밋 메시지는 프로젝트의 prefix 규칙을 따른다 (feat/fix/tidy/docs/test/refactor)
- 변경사항이 없으면 이 단계를 건너뛴다

### Step 3: MEMORY.md 업데이트

파일 위치: `~/.Codex/projects/{project-path}/memory/MEMORY.md`

업데이트할 내용:
- **현재 브랜치 / 최신 커밋** — 이번 세션의 마지막 커밋 해시와 메시지
- **다음 작업** — 이번 세션에서 완료하지 못한 작업, 다음에 이어서 할 작업
- **완료된 Phase** — 새로 완료된 Phase가 있으면 테이블에 추가
- **테스트 현황** — 테스트 수가 변경되었으면 업데이트
- **핵심 아키텍처 결정사항** — 이번 세션에서 새로운 아키텍처 결정이 있었으면 추가

기존 내용을 덮어쓰지 않고, 변경된 부분만 Edit으로 수정한다.

### Step 4: development-log.md 업데이트

파일 위치: `docs/development-log.md`

- 오늘 날짜의 섹션이 이미 있으면 → 내용을 보강/수정
- 오늘 날짜의 섹션이 없으면 → 새 섹션 추가
- git log에서 오늘 날짜의 커밋을 기반으로 작업 내역 정리
- 하단 종합 통계 테이블도 업데이트 (총 커밋, 테스트 수 등)

### Step 5: AGENTS.md 업데이트 (조건부)

다음 경우에만 AGENTS.md를 수정한다:
- 새로운 Phase가 완료된 경우 → 로드맵 테이블 업데이트
- 새로운 Behavior 타입이 추가된 경우 → Behavior 목록 업데이트
- 새로운 Tier 1 컴포넌트가 추가된 경우
- 프로젝트 구조가 크게 변경된 경우

해당 사항이 없으면 이 단계를 건너뛴다.

### 완료 메시지

```
세션 종료 완료:
- 커밋: {commit_hash} {commit_message}
- 메모리: MEMORY.md 업데이트 완료
- 로그: development-log.md {날짜} 섹션 업데이트
- AGENTS.md: {업데이트함/변경 없음}
```

---

## Full Mode — 에이전트 분석 + Lite Mode

컨텍스트에 여유가 있고, 세션에서 배운 점/자동화 기회를 분석하고 싶을 때.

```
┌─────────────────────────────────────────────────────┐
│  1. Check Git Status                                │
├─────────────────────────────────────────────────────┤
│  2. Phase 1: 4 Analysis Agents (Parallel)           │
│     ┌─────────────────┬─────────────────┐           │
│     │  doc-updater    │  automation-    │           │
│     │  (docs update)  │  scout          │           │
│     ├─────────────────┼─────────────────┤           │
│     │  learning-      │  followup-      │           │
│     │  extractor      │  suggester      │           │
│     └─────────────────┴─────────────────┘           │
├─────────────────────────────────────────────────────┤
│  3. Phase 2: Validation Agent (Sequential)          │
│     ┌───────────────────────────────────┐           │
│     │       duplicate-checker           │           │
│     │  (Validate Phase 1 proposals)     │           │
│     └───────────────────────────────────┘           │
├─────────────────────────────────────────────────────┤
│  4. Integrate Results & Present to User             │
├─────────────────────────────────────────────────────┤
│  5. Execute Lite Mode (커밋+메모리+로그)             │
│     (분석 결과를 반영하여 실행)                       │
└─────────────────────────────────────────────────────┘
```

### Phase 1: Analysis Agents (Parallel)

세션 요약을 만들어 4개 에이전트에 전달한다.

```
Session Summary:
- Work: [이번 세션에서 수행한 주요 작업]
- Files: [생성/수정된 파일]
- Decisions: [내린 핵심 결정]
```

| Agent | Role | Output |
|-------|------|--------|
| **doc-updater** | AGENTS.md/context.md 업데이트 필요 분석 | 추가할 구체적 내용 |
| **automation-scout** | 반복 패턴 감지 → 자동화 제안 | skill/command/agent 제안 |
| **learning-extractor** | 교훈/실수/발견 추출 | TIL 형식 요약 |
| **followup-suggester** | 미완료 작업 + 다음 세션 우선순위 | 우선순위 작업 목록 |

### Phase 2: Validation Agent

Phase 1 결과에서 기존 문서/자동화와 중복되는 제안을 필터링한다.

### Phase 3: 결과 통합 + Lite Mode 실행

분석 결과를 사용자에게 보여주고, Lite Mode를 실행한다.
분석에서 나온 추가 제안 (자동화 생성 등)은 사용자에게 옵션으로 제시한다.

---

## Quick Reference

### When to Use

- 세션 종료 시 (기본적으로 Lite Mode)
- 큰 기능 완료 후 정리할 때 (Full Mode)

### When to Skip

- 코드만 읽고/탐색한 세션
- 간단한 질문만 한 세션

### Arguments

- 없음: Lite Mode 실행
- `--full` 또는 "분석": Full Mode 실행
- 커밋 메시지 제공 시: 해당 메시지로 커밋 후 나머지 단계 실행
