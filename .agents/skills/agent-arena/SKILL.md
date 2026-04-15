---
name: agent-arena
description: This skill should be used when the user wants multiple AI agents to debate a topic from different perspectives. Trigger on "agent-arena", "에이전트 토론", "에이전트 싸워", "debate this", "여러 관점에서 분석", "찬반 토론", "agent debate", "arena", "팀 토론", "관점별 분석". Spawns role-assigned agents that argue in multiple rounds, then synthesizes options with a recommendation. 간단한 비교는 3인, 기능/방향성 검토는 5인, 전략적 심층 분석은 8인(--preset 8) 권장.
version: 0.1.0
---

# Agent Arena - 역할별 에이전트 다라운드 토론

주제에 대해 페르소나가 부여된 에이전트들이 다라운드 토론을 벌이고, 종합자가 옵션 + 추천안을 도출하는 스킬.

## 사용 시나리오

- A vs B 의사결정 ("모놀리스 vs 마이크로서비스?")
- 기능 방향성 토론 ("이 UX 흐름이 맞나?")
- 아키텍처 리뷰 ("이 설계의 약점은?")
- 전략적 판단 ("MVP 스코프를 어디까지?")

## 사용법

```
/agent-arena "주제"
/agent-arena "주제" --preset 5
/agent-arena "주제" --preset 8 --rounds 2
```

### 옵션

| 옵션 | 기본값 | 설명 |
|------|--------|------|
| `--preset` | `3` | 에이전트 수 (3, 5, 8) |
| `--rounds` | `3` | 토론 라운드 수 (1~3) |
| `--save` | `true` | 결과를 파일로 저장 |
| `--custom-roles` | - | 커스텀 역할 지정 (아래 참조) |

### 커스텀 역할

프리셋 대신 직접 역할을 지정할 수 있다:

```
/agent-arena "주제" --custom-roles "보안 전문가, 프론트엔드 개발자, PM, 데이터 엔지니어"
```

## 실행 워크플로우

### Step 0: 실행 직전 확인

`--preset`이 명시되지 않은 경우, 토론 시작 직전에 AskUserQuestion으로 인원 확인을 요청한다:

```
토론을 시작합니다. 인원을 확인하세요:

- **3인** (기본) - 빠른 토론 (옹호자, 비판자, 종합자)
- **5인** - 균형 토론 (+ UX 대변인, 설계자)
- **8인** - 심층 토론 (+ 비전가, 품질 악마, 현실주의자)

💡 간단한 비교는 3인, 기능/방향성 검토는 5인, 전략적 의사결정은 8인을 추천합니다.

인원을 선택하세요 (엔터 시 3인):
```

선택값을 `--preset`으로 설정한 뒤 Step 1로 진행한다. 엔터(빈 입력) 시 기본값 3인을 적용한다.

### Step 1: 설정 파싱

1. 주제, 프리셋, 라운드 수를 파싱한다.
2. 프리셋에 따라 에이전트 역할을 로드한다 (상세: **`references/presets.md`**).
3. `--custom-roles`가 있으면 프리셋 대신 해당 역할들로 에이전트를 구성한다.

### Step 2: 실행 방식 자동 선택

| 프리셋 | 실행 방식 | 이유 |
|--------|-----------|------|
| 3인 | 서브에이전트 (Agent 도구) | 가볍고 빠름 |
| 5인 | 서브에이전트 (Agent 도구) | 병렬 처리 효율적 |
| 8인 | 서브에이전트 또는 팀 | 환경에 따라 자동 판단 |

팀 사용 조건: `--team` 플래그가 명시되었거나, 8인 + 3라운드처럼 토큰 소모가 큰 경우.

### Step 3: Phase 1 - 독립 의견 수집 (병렬)

Synthesizer를 제외한 모든 에이전트를 **동시 병렬**로 스폰한다.

각 에이전트에게 전달하는 프롬프트 구조:

```markdown
## 토론 주제
{주제}

## 너의 역할
{페르소나 설명 - agents/*.md에서 로드}

## 지시사항
- 너의 역할 관점에서 이 주제를 분석하라.
- 주장에는 반드시 구체적 근거를 제시하라.
- 결론을 명확히 내려라 (찬성/반대/조건부 찬성 등).
- 300단어 이내로 작성하라.

## 출력 형식
### [역할명]의 의견
**입장**: [한 줄 요약]
**근거**:
1. [근거 1]
2. [근거 2]
3. [근거 3]
**결론**: [명확한 결론]
```

### Step 4: Phase 2 - 반박 라운드 (최대 3회, 병렬)

각 라운드에서 모든 에이전트(Synthesizer 제외)를 다시 병렬로 스폰한다.

```markdown
## 토론 주제
{주제}

## 너의 역할
{페르소나 설명}

## 이전 라운드 의견들
{Phase 1 또는 이전 라운드의 모든 에이전트 의견}

## 지시사항
- 다른 에이전트들의 의견을 읽고, 너의 관점에서 반박하거나 보강하라.
- 동의하는 부분은 인정하되, 빠진 관점을 지적하라.
- 새로운 근거를 추가하라.
- 200단어 이내로 작성하라.

## 출력 형식
### [역할명]의 반박 (라운드 {N})
**핵심 반박**: [가장 중요한 반박 포인트]
**동의 사항**: [동의하는 부분]
**추가 근거**: [새로운 근거]
**수정된 입장**: [입장 변화가 있다면]
```

### Step 5: Phase 3 - 종합 (Synthesizer)

모든 라운드의 의견을 Synthesizer에게 전달한다.

Synthesizer 에이전트 프롬프트: **`agents/synthesizer.md`** 참조.

출력 형식: **`references/report-template.md`** 참조.

### Step 6: 결과 출력 및 저장

1. 화면에 최종 보고서를 출력한다.
2. `--save`가 true(기본값)이면 `decisions/{YYYY-MM-DD}-{topic-slug}.md`에 저장한다.
3. 저장 경로를 사용자에게 알린다.

## 에이전트 정의

각 에이전트는 `agents/` 디렉토리에 정의된다:

| 파일 | 역할 | 프리셋 |
|------|------|--------|
| `agents/advocate.md` | 옹호자 | 3, 5, 8 |
| `agents/critic.md` | 비판자 | 3, 5, 8 |
| `agents/ux-advocate.md` | 유저 대변인 | 5, 8 |
| `agents/architect.md` | 기술 설계자 | 5, 8 |
| `agents/visionary.md` | 비전가 | 8 |
| `agents/qa-devil.md` | 품질 악마 | 8 |
| `agents/pragmatist.md` | 현실주의자 | 8 |
| `agents/synthesizer.md` | 종합자 | 3, 5, 8 |

## 참고 파일

- **`references/presets.md`** - 3/5/8인 프리셋 상세 정의
- **`references/debate-protocol.md`** - 토론 라운드 프로토콜
- **`references/report-template.md`** - 결과 보고서 템플릿

## 주의사항

1. **토큰 소모**: 8인 × 3라운드는 토큰을 많이 사용한다. 간단한 주제는 3인 × 2라운드를 추천.
2. **커스텀 역할**: `--custom-roles` 사용 시 Synthesizer는 자동 추가된다.
3. **결과 저장**: `decisions/` 폴더가 없으면 자동 생성한다.
