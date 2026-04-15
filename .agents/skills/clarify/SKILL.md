---
name: clarify
description: Unified clarification skill with 3 modes. Use when user needs to clarify requirements (vague), surface strategy blind spots (unknown), or reframe content vs form (metamedium). Trigger on "/clarify", "clarify", "명확히", "요구사항 정리", "뭘 원하는 건지", "blind spots", "뭘 놓치고 있지", "4분면", "known unknown", "가정 점검", "content vs form", "metamedium", "관점 전환", "형식을 바꿔볼까", "다른 방법 없을까".
allowed-tools:
  - AskUserQuestion
  - Read
  - Glob
  - Grep
  - Write
---

# Clarify: Unified Clarification Skill

3가지 모드를 하나로 통합한 명확화 스킬. **모든 질문은 반드시 AskUserQuestion 도구를 사용**하며, 일반 텍스트로 질문하지 않는다.

---

## Mode Selection

사용자의 입력을 분석하여 적절한 모드를 자동 선택한다. 확실하지 않으면 AskUserQuestion으로 모드를 물어본다.

| Mode | When to Use | Trigger Keywords |
|------|-------------|-----------------|
| **vague** | 요구사항이 모호하고 구체화 필요 | "요구사항 정리", "뭘 원하는 건지", "spec this out", "scope this" |
| **unknown** | 전략/계획의 숨겨진 가정과 사각지대 분석 | "blind spots", "4분면", "known unknown", "뭘 놓치고 있지", "가정 점검" |
| **metamedium** | Content(내용) vs Form(형식) 관점 전환 | "content vs form", "metamedium", "관점 전환", "다른 방법 없을까", "diminishing returns" |

모드가 불분명한 경우:

```
questions:
  - question: "어떤 종류의 명확화가 필요한가요?"
    header: "Mode"
    options:
      - label: "Vague → 요구사항 구체화"
        description: "모호한 요청을 구체적인 스펙으로 변환"
      - label: "Unknown → 사각지대 분석"
        description: "전략/계획의 숨겨진 가정과 블라인드스팟 발견"
      - label: "Metamedium → 관점 전환"
        description: "내용(Content) 최적화 vs 형식(Form) 변경 판단"
    multiSelect: false
```

---

## Mode 1: Vague (요구사항 명확화)

모호한 요구사항을 가설 기반 질문으로 구체적 스펙으로 변환한다.

### Core Principle: Hypotheses as Options

```
BAD:  "What kind of login do you want?"           ← open question, high cognitive load
GOOD: "OAuth / Email+Password / SSO / Magic link" ← pick one, lower load
```

### Protocol

**Phase 1: Capture and Diagnose**
- 원래 요구사항을 그대로 기록
- 모호한 부분, 가정이 필요한 부분, 해석에 열린 결정 식별

**Phase 2: Iterative Clarification**
- AskUserQuestion으로 모호성 해소. **한 번에 최대 4개 관련 질문 배치.**
- **총 5-8개 질문 상한.** 핵심 모호성 해소 시 중단.

```
questions:
  - question: "Which authentication method should the login use?"
    header: "Auth method"
    options:
      - label: "Email + Password"
        description: "Traditional signup with email verification"
      - label: "OAuth (Google/GitHub)"
        description: "Delegated auth, no password management needed"
      - label: "Magic link"
        description: "Passwordless email-based login"
    multiSelect: false
```

**Phase 3: Before/After Summary**

```markdown
## Requirement Clarification Summary

### Before (Original)
"{original request verbatim}"

### After (Clarified)
**Goal**: [precise description]
**Scope**: [included and excluded]
**Constraints**: [limitations, preferences]
**Success Criteria**: [how to know when done]

**Decisions Made**:
| Question | Decision |
|----------|----------|
| [ambiguity 1] | [chosen option] |
```

**Phase 4: Save Option**
- 명확화된 요구사항을 파일로 저장할지 질문. 기본 위치: `requirements/`

### Ambiguity Categories

| Category | Example Hypotheses |
|----------|-------------------|
| **Scope** | All users / Admins only / Specific roles |
| **Behavior** | Fail silently / Show error / Auto-retry |
| **Interface** | REST API / GraphQL / CLI |
| **Data** | JSON / CSV / Both |
| **Constraints** | <100ms / <1s / No requirement |
| **Priority** | Must-have / Nice-to-have / Future |

---

## Mode 2: Unknown (Known/Unknown 4분면 분석)

전략/계획의 숨겨진 가정과 사각지대를 4분면 프레임워크로 분석한다.

### 3-Round Depth Pattern

| Round | Purpose | Questions | Key trait |
|-------|---------|-----------|-----------|
| R1 | 초안 검증 | 3-4 | 모든 분면 커버 |
| R2 | 약점 심화 | 2-3 | R1 답변 기반 타겟팅 |
| R3 | 실행 세부 (선택) | 2-3 | 구체적 |

**총 7-10개 질문 상한.** Round N 질문은 반드시 Round N-1 답변에서 도출.

### Protocol

**Phase 1: Intake** — 파일 제공 시 읽고 분석, 키워드만 제공 시 R1로 범위 설정

**Phase 2: Context** — Glob/Read로 관련 파일 탐색, Unknown Knowns(보유했지만 미활용 자산) 발굴

**Phase 3: Draft + R1** — 초안 4분면 분류 생성 후 R1 질문으로 검증

| Target | Pattern | Example |
|--------|---------|---------|
| KK | "Is this really certain?" | "Primary revenue source?" |
| KU | "Where's the weakest link?" | "Which connection is weakest?" |
| UK | "What exists but isn't used?" | Based on context findings |
| UU | "What's the biggest fear?" | Risk scenarios as options |

**Phase 4: R2** — R1 답변 분석 후 가장 불확실한 영역 심화

| R1 Signal | R2 Strategy |
|-----------|-------------|
| Compound answer (multiSelect) | Root cause 질문으로 분해 |
| Unexpected answer | 초안 수정, 심화 탐색 |
| "Other" selected | 프레임 외부 탐색 |

**Phase 5: R3 (Optional)** — 우선순위 결정 후 실행 세부사항

**Phase 6: Playbook Output** — 구조화된 4분면 플레이북 생성

```
# {Topic}: Known/Unknown Quadrant Analysis
## Current State Diagnosis
## Quadrant Matrix (resource %)
## 1. Known Knowns: Systematize (60%)
## 2. Known Unknowns: Design Experiments (25%)
   - Each KU: Diagnosis → Experiment → Success Criteria → Deadline → Promotion/Kill Condition
## 3. Unknown Knowns: Leverage (10%)
## 4. Unknown Unknowns: Set Up Antennas (5%)
## Strategic Decision: What to Stop
## Execution Roadmap (week-by-week)
## Core Principles (3-5 decision criteria)
```

리소스 비율(60/25/10/5)은 기본값. 상황에 따라 조정.

### Anti-Patterns
- Open questions — 항상 hypothesis options 사용
- 5+ options — choice fatigue 유발
- R1 답변 무시하고 R2 설계 — performative questioning
- 모든 분면에 동일 깊이 — 시간 낭비
- "stop doing" 섹션 누락 — 더하기만 하고 빼기 없음

---

## Mode 3: Metamedium (Content vs Form 렌즈)

Content(무엇을 말하는가)와 Form(어떤 매체/구조로 전달하는가)을 구분하여 진짜 레버리지가 어디에 있는지 판단한다.

> "A change of perspective is worth 80 IQ points." — Alan Kay

| | Content (what) | Form (how/medium) |
|--|----------------|-------------------|
| Example | LinkedIn 포스트 작성 | 컨설팅 회고를 포스트로 변환하는 도구 구축 |
| Example | 유닛 테스트 수동 작성 | 타입 시그니처에서 테스트 생성기 구축 |
| Leverage | Linear — 하나의 결과물 | Exponential — 무한한 콘텐츠 가능 |

### Protocol

**Phase 1: Identify and Label**

사용자의 작업을 Content/Form으로 분류:

```
[CONTENT] Writing a blog post about AI consulting
[FORM]    Building a pipeline that turns consulting retros into blog posts
```

**Phase 2: Surface the Fork** (AskUserQuestion)

```
questions:
  - question: "This is currently [CONTENT/FORM]-level work. Where should effort go?"
    header: "Level"
    options:
      - label: "Proceed with content"
        description: "Optimize within the current form — faster, lower risk"
      - label: "Explore form change"
        description: "What if the medium/structure itself changed? Higher leverage"
      - label: "Content now, note form"
        description: "Do the content work, but flag the form opportunity for later"
    multiSelect: false
```

**Phase 3: Branch**

- **"Proceed with content"**: 진행 + Form Opportunity 노트 첨부
- **"Explore form change"**: 2-3개 form 대안 생성 (구체적 모습, 새로운 속성, MVP)
- **"Content now, note form"**: content 작업 진행 + form 기회 기록

### Output

```markdown
## Content/Form Analysis

**Current work**: [description]
**Classification**: [CONTENT / FORM]

### Form Opportunity
| | Detail |
|---|--------|
| **Alternative form** | [what it would look like] |
| **New properties** | [what it enables that current form doesn't] |
| **Minimum test** | [smallest version to validate] |
| **Status** | [exploring / noted for later / not applicable] |
```

### The Metamedium Question

> **"What new form/medium could make this problem disappear?"**

### Rules
1. **Always label**: 작업을 content/form으로 태깅
2. **Content is fine**: 모든 것이 form 변경을 필요로 하지 않음 — 하지만 항상 옵션은 기록
3. **Form yields power**: New form = new medium = exponential leverage
4. **Code is metamedium**: 코드를 쓸 수 있다 = form을 바꿀 수 있다

---

## Global Rules

1. **AskUserQuestion 필수**: 모든 질문은 AskUserQuestion 도구로. 일반 텍스트 질문 금지.
2. **Hypotheses, not open questions**: 모든 옵션은 테스트 가능한 가설
3. **질문 상한 준수**: vague 5-8개, unknown 7-10개, metamedium 1-2개
4. **Preserve intent**: 사용자 의도를 리디렉트하지 않고 정제
5. **Before/After tracking**: 변화를 항상 보여줌

## Additional Resources

- `references/question-design.md` — Round별 질문 유형과 AskUserQuestion 포맷 가이드
- `references/playbook-template.md` — Unknown 모드 4분면 플레이북 출력 템플릿
- `references/alan-kay-quotes.md` — Alan Kay 원문 인용과 맥락
