# 프리셋 정의

## 3인 프리셋 (Quick)

빠른 찬반 분석. 간단한 A vs B 의사결정에 적합.

| # | 역할 | 파일 | 서브에이전트 타입 |
|---|------|------|-----------------|
| 1 | Advocate (옹호자) | `agents/advocate.md` | general-purpose |
| 2 | Critic (비판자) | `agents/critic.md` | oh-my-claudecode:critic |
| 3 | Synthesizer (종합자) | `agents/synthesizer.md` | general-purpose |

## 5인 프리셋 (Balanced)

유저 관점과 기술 관점이 추가된 균형 잡힌 토론.

| # | 역할 | 파일 | 서브에이전트 타입 |
|---|------|------|-----------------|
| 1 | Advocate (옹호자) | `agents/advocate.md` | general-purpose |
| 2 | Critic (비판자) | `agents/critic.md` | oh-my-claudecode:critic |
| 3 | UX Advocate (유저 대변인) | `agents/ux-advocate.md` | oh-my-claudecode:analyst |
| 4 | Architect (기술 설계자) | `agents/architect.md` | oh-my-claudecode:architect |
| 5 | Synthesizer (종합자) | `agents/synthesizer.md` | general-purpose |

## 8인 프리셋 (Deep)

전방위 분석. 중요한 전략적 의사결정에 적합.

| # | 역할 | 파일 | 서브에이전트 타입 |
|---|------|------|-----------------|
| 1 | Visionary (비전가) | `agents/visionary.md` | general-purpose |
| 2 | Advocate (옹호자) | `agents/advocate.md` | general-purpose |
| 3 | Critic (비판자) | `agents/critic.md` | oh-my-claudecode:critic |
| 4 | UX Advocate (유저 대변인) | `agents/ux-advocate.md` | oh-my-claudecode:analyst |
| 5 | Architect (기술 설계자) | `agents/architect.md` | oh-my-claudecode:architect |
| 6 | QA Devil (품질 악마) | `agents/qa-devil.md` | oh-my-claudecode:critic |
| 7 | Pragmatist (현실주의자) | `agents/pragmatist.md` | general-purpose |
| 8 | Synthesizer (종합자) | `agents/synthesizer.md` | general-purpose |

## 커스텀 역할 처리

`--custom-roles "보안 전문가, PM, 데이터 엔지니어"` 사용 시:

1. 지정된 역할 각각에 대해 페르소나 프롬프트를 자동 생성한다.
2. Synthesizer는 자동으로 추가된다 (지정할 필요 없음).
3. 페르소나 프롬프트 자동 생성 템플릿:

```markdown
너는 **{역할명}**이다.

## 핵심 원칙
- {역할명}의 전문 관점에서 주제를 분석하라.
- 너의 전문 영역에서 다른 관점이 놓치는 부분을 찾아라.
- 주장에는 반드시 구체적 근거를 제시하라.

## 분석 관점
- {역할명}으로서 가장 중요하게 보는 기준은 무엇인가?
- 이 결정이 {역할명}의 영역에 미치는 영향은?
- {역할명}이 보는 리스크와 기회는?
```

## 프리셋 선택 가이드

| 상황 | 추천 프리셋 | 이유 |
|------|------------|------|
| 빠른 A vs B 비교 | 3인 | 토큰 절약, 빠른 결론 |
| 기능 방향성 검토 | 5인 | UX + 기술 균형 |
| 전략적 의사결정 | 8인 | 전방위 분석 필요 |
| 특정 도메인 토론 | 커스텀 | 도메인 전문가 직접 지정 |
