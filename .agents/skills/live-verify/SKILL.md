---
name: live-verify
version: 0.1.0
description: >
  This skill should be used when the user wants to verify that implemented features actually work by testing them like a real user.
  Trigger on "live-verify", "라이브 검증", "E2E 검증", "실제 검증", "검증 실행",
  "검증 계획", "verify plan", "verify run", "검증 시나리오", "동작 검증",
  "실제로 돌려봐", "작동하는지 확인", "브라우저로 테스트", "end to end test",
  "검증 기준 설정", "acceptance test", "인수 테스트".
  Phase 1(plan): 작업 계획/PRD/코드를 분석하여 검증 시나리오를 자동 생성.
  Phase 2(run): 실제 제품을 Playwright/Bash/curl로 조작하여 E2E 검증 실행. 실패 시 자동 수정 + 재검증 사이클 (max 100회).
  `/live-verify` 자동 감지, `/live-verify plan` Phase 1만, `/live-verify run` Phase 2만.
allowed-tools:
  - AskUserQuestion
  - Read
  - Glob
  - Grep
  - Write
  - Edit
  - Bash
  - Agent
  - mcp__plugin_playwright_playwright__browser_navigate
  - mcp__plugin_playwright_playwright__browser_click
  - mcp__plugin_playwright_playwright__browser_fill_form
  - mcp__plugin_playwright_playwright__browser_type
  - mcp__plugin_playwright_playwright__browser_snapshot
  - mcp__plugin_playwright_playwright__browser_take_screenshot
  - mcp__plugin_playwright_playwright__browser_press_key
  - mcp__plugin_playwright_playwright__browser_wait_for
  - mcp__plugin_playwright_playwright__browser_hover
  - mcp__plugin_playwright_playwright__browser_select_option
  - mcp__plugin_playwright_playwright__browser_tabs
  - mcp__plugin_playwright_playwright__browser_console_messages
  - mcp__plugin_playwright_playwright__browser_network_requests
---

# Live Verify: 실제 제품을 유저처럼 조작하여 E2E 검증

작업 계획에서 검증 기준을 설정하고(Phase 1), 구현 후 실제 제품을 브라우저/CLI/API로 조작하여 검증한다(Phase 2). 코드 리뷰나 린트가 아닌, **유저와 완전히 동일한 방식**으로 동작을 확인한다.

> **핵심 철학**: "코드가 맞다"가 아니라 "제품이 동작한다"를 증명한다.

---

## 절대 원칙

1. **실제 제품을 조작한다.** 단위 테스트/코드 리뷰가 아닌, 로컬에서 띄운 제품을 에이전트가 직접 클릭/입력/확인한다.
2. **모든 질문은 AskUserQuestion 도구로.** 일반 텍스트로 질문하지 않는다.
3. **가설 기반 질문.** 열린 질문 대신 구체적 옵션을 제시한다.
4. **실패하면 고친다.** 검증 실패 시 원인을 분석하고 코드를 수정한 뒤 재검증한다. 최대 100회.
5. **중간 저장.** Phase 1 완료 시 시나리오 파일을, Phase 2 완료 시 보고서 파일을 반드시 저장한다.

---

## 호출 방식

| 명령 | 동작 |
|------|------|
| `/live-verify` | 자동 감지 — `docs/verify/` 에 시나리오 파일이 있으면 Phase 2, 없으면 Phase 1부터 |
| `/live-verify plan` | Phase 1만 실행 (검증 시나리오 생성) |
| `/live-verify run` | Phase 2만 실행 (기존 시나리오 파일 필요) |

---

## 진입 판단

스킬 호출 시 자동으로 상태를 판단한다:

1. 사용자가 `plan` 또는 `run`을 명시했으면 해당 Phase로 직행
2. 명시하지 않았으면:
   - `docs/verify/` 에서 최신 시나리오 파일(`*-scenarios.md`)을 Glob으로 검색
   - 있으면 → Phase 2로 진행 (해당 파일 사용)
   - 없으면 → Phase 1부터 시작

입력 소스 판단:

| 입력 상태 | 판단 기준 | 행동 |
|-----------|-----------|------|
| **인자로 경로 제공** | 파일 경로가 함께 전달됨 | 해당 파일을 읽고 분석 |
| **PRD 자동 감지** | `docs/prd/` 에 PRD 파일 존재 | 최신 PRD를 읽어 시나리오 생성 |
| **코드 경로 제공** | src/, app/ 등 코드 디렉토리 | 코드를 분석하여 기능 도출 → 시나리오 생성 |
| **아무것도 없음** | 입력 없음 | AskUserQuestion으로 대상 확인 |

---

## Phase 1: Plan — 검증 기준 설정

### 목적
작업 계획/PRD/코드를 분석하여, 실제 제품에서 검증할 시나리오를 자동 생성한다.

### 프로세스

#### 1-1: 입력 분석 및 대상 타입 감지

입력을 Read/Glob/Grep으로 분석하여 대상 타입을 자동 감지한다:

| 신호 | 대상 타입 |
|------|----------|
| package.json에 react/next/vue/svelte | 웹 |
| HTML/CSS 파일 존재 | 웹 |
| CLI 엔트리포인트 (bin/, cli.ts 등) | CLI |
| API 라우트 (routes/, api/, endpoints/) | API |
| PRD에 "화면", "페이지", "버튼" 언급 | 웹 |
| PRD에 "명령어", "옵션", "플래그" 언급 | CLI |
| PRD에 "엔드포인트", "요청", "응답" 언급 | API |

감지 결과를 AskUserQuestion으로 사용자에게 확인:

```
questions:
  - question: "감지된 대상 타입이 맞나요?"
    header: "대상 타입"
    options:
      - label: "{감지된 타입} (Recommended)"
        description: "{감지 근거 요약}"
      - label: "웹 (Playwright)"
        description: "브라우저에서 클릭/입력으로 검증"
      - label: "CLI (Bash)"
        description: "명령어 실행 + 출력 비교로 검증"
      - label: "API (curl)"
        description: "HTTP 요청 + 응답 비교로 검증"
    multiSelect: false
```

#### 1-2: 검증 시나리오 자동 생성

입력(PRD/코드/작업 계획)을 분석하여 시나리오를 자동 생성한다.

**참조**: `references/scenario-template.md`의 템플릿을 따른다.

생성 기준:
- **정상 시나리오**: 핵심 유저 플로우 각각에 대해 1개 이상
- **엣지케이스**: 빈 입력, 극단적 길이, 특수문자, 권한 없음 등
- **에러 시나리오**: 잘못된 입력, 서버 에러, 타임아웃 등
- **회귀 시나리오**: 기존 기능이 깨지지 않는지 (코드 변경 범위 기반)

각 시나리오의 "단계"는 검증 도구의 실제 동작과 1:1 매핑되어야 한다:
- 웹: "로그인 버튼 클릭" → `browser_click` 호출로 직접 변환 가능해야 함
- CLI: "help 명령어 실행" → `Bash`로 직접 실행 가능해야 함
- API: "POST /api/users 호출" → `curl` 명령어로 직접 변환 가능해야 함

#### 1-3: 사용자 확인

생성된 시나리오 목록을 사용자에게 제시하고 AskUserQuestion으로 확인:

```
questions:
  - question: "생성된 검증 시나리오 {N}건을 확인해주세요. 수정이 필요한가요?"
    header: "시나리오 확인"
    options:
      - label: "좋습니다, 저장해주세요"
        description: "시나리오를 그대로 저장하고 Phase 1을 완료합니다"
      - label: "시나리오 추가 필요"
        description: "빠진 시나리오가 있어서 추가하고 싶습니다"
      - label: "시나리오 수정 필요"
        description: "기존 시나리오의 단계나 기대결과를 수정하고 싶습니다"
      - label: "시나리오 삭제 필요"
        description: "불필요한 시나리오를 제거하고 싶습니다"
    multiSelect: false
```

수정이 필요하면 반복한다.

#### 1-4: 시나리오 파일 저장

`docs/verify/{YYYY-MM-DD}-{주제슬러그}-scenarios.md`에 저장한다.

### Phase 1 완료 시 안내

> **"검증 시나리오가 저장되었습니다: `docs/verify/{파일명}`**
>
> **이제 구현을 진행한 후 `/live-verify run`으로 검증을 실행할 수 있습니다.**
> **또는 `/live-verify`를 실행하면 자동으로 이 시나리오 파일을 감지하여 Phase 2를 시작합니다."**

---

## Phase 2: Execute — 검증 실행

### 목적
Phase 1에서 생성된 시나리오를 실제 제품에서 실행하여, 동작 여부를 검증한다.

### 프로세스

#### 2-1: 시나리오 파일 로드

1. `docs/verify/` 에서 최신 시나리오 파일을 Glob으로 검색
2. 여러 파일이 있으면 AskUserQuestion으로 선택:

```
questions:
  - question: "검증할 시나리오 파일을 선택해주세요."
    header: "시나리오 선택"
    options:
      - label: "{최신 파일명} (Recommended)"
        description: "{생성일} / {시나리오 수}건"
      - label: "{이전 파일명}"
        description: "{생성일} / {시나리오 수}건"
    multiSelect: false
```

3. 시나리오 파일을 Read로 로드하여 파싱

#### 2-2: 사전 조건 확인

시나리오의 사전조건을 검증한다:

**웹 프로젝트:**
1. 서버가 실행 중인지 확인 (`curl -s -o /dev/null -w "%{http_code}" http://localhost:{port}`)
2. 실행 중이 아니면 AskUserQuestion:

```
questions:
  - question: "서버가 localhost:{port}에서 실행 중이지 않습니다. 어떻게 할까요?"
    header: "서버 상태"
    options:
      - label: "서버 시작 명령어 알려주기"
        description: "서버를 시작할 명령어를 알려주시면 백그라운드로 실행합니다"
      - label: "이미 실행 중 (다른 포트)"
        description: "포트 번호를 알려주시면 변경합니다"
      - label: "나중에 하겠습니다"
        description: "Phase 2를 중단합니다"
    multiSelect: false
```

**CLI 프로젝트:**
- 실행 파일이 존재하는지 확인 (`which {명령어}` 또는 파일 존재 확인)

**API 프로젝트:**
- 엔드포인트가 응답하는지 확인 (health check)

#### 2-3: 시나리오 순차 실행

각 시나리오를 순서대로 실행한다:

##### 웹 시나리오 실행 (Playwright)

각 단계를 Playwright MCP 도구로 실행:

1. `browser_navigate` → 페이지 이동
2. `browser_snapshot` → 현재 상태 확인 (접근성 트리)
3. `browser_click` / `browser_fill_form` / `browser_type` → 유저 행동 수행
4. `browser_snapshot` → 결과 상태 확인
5. `browser_take_screenshot` → 증거 스크린샷 촬영
6. 기대결과와 실제 결과 비교 (snapshot의 텍스트/요소 존재 여부)

##### CLI 시나리오 실행 (Bash)

1. `Bash`로 명령어 실행
2. stdout/stderr 캡처
3. 종료 코드 확인
4. 기대결과와 실제 출력 비교 (텍스트 매칭)

##### API 시나리오 실행 (curl)

1. `Bash`로 curl 명령어 실행
2. HTTP 상태 코드 확인
3. 응답 본문 파싱
4. 기대결과와 실제 응답 비교

#### 2-4: 실패 시 자동 수정 사이클

시나리오가 실패하면 다음 사이클을 **최대 100회** 반복한다:

```
실패 감지
  ↓
원인 분석 (에러 메시지, 스크린샷/스냅샷, 로그, 관련 코드)
  ↓
관련 코드 식별 (Grep/Read로 원인 코드 탐색)
  ↓
코드 수정 (Edit 도구)
  ↓
해당 시나리오만 재실행
  ↓
통과? → 다음 시나리오로 진행
실패? → 사이클 반복 (카운터 +1)
```

**수정 원칙:**
- 수정은 최소 범위로 한다 (관련 없는 코드를 건드리지 않는다)
- 수정 전 원인 분석을 반드시 수행한다 (무작정 수정하지 않는다)
- 같은 수정을 반복하지 않는다 (이전 시도와 다른 접근을 시도한다)
- 3회 연속 동일 원인으로 실패하면, 접근 방식을 전환한다

**100회 도달 시:**
- 해당 시나리오를 FAIL로 기록
- 실패 원인과 시도한 수정 내역을 보고서에 상세 기록
- 다음 시나리오로 진행

#### 2-5: 보고서 생성

모든 시나리오 실행 완료 후 Markdown 보고서를 생성한다.

**참조**: `references/report-template.md`의 템플릿을 따른다.

저장 경로: `docs/verify/{YYYY-MM-DD}-{주제슬러그}-report.md`

### Phase 2 완료 시 안내

전체 통과 시:

> **"검증 완료: 총 {N}건 전부 PASS**
>
> **보고서: `docs/verify/{파일명}`"**

실패 있을 시:

> **"검증 완료: 총 {N}건 중 FAIL {Y}건**
>
> **보고서: `docs/verify/{파일명}`**
>
> **미해결 실패 시나리오에 대한 권장 조치:**
> - {시나리오명}: {권장 조치}"

---

## 스킬 연계

### ralph-prep 연계
`docs/prd/` 디렉토리에 PRD 파일이 존재하면 자동 감지하여 시나리오 생성의 입력으로 사용한다.
PRD의 Phase 2(유저 시나리오 상세)와 Phase 3(검증 시나리오)를 우선 참조한다.

### 다른 스킬 추천

검증 과정에서 아래 상황이 발생하면 해당 스킬을 안내한다:

| 상황 | 안내할 스킬 | 안내 문구 |
|------|-----------|-----------|
| 요구사항이 모호하여 시나리오 작성 불가 | `/clarify` | "요구사항이 불명확합니다. `/clarify`로 정리한 후 다시 시도해보세요." |
| 기술 의사결정이 필요 | `/tech-decision` | "기술 선택이 필요합니다. `/tech-decision`으로 분석해보세요." |
| 검증 기준 자체에 의견 충돌 | `/agent-arena` | "검증 기준에 대해 의견이 나뉩니다. `/agent-arena`로 토론해보세요." |

---

## Anti-Patterns

| 하지 말 것 | 왜 |
|-----------|-----|
| 코드만 보고 "동작할 것 같다" 판단 | 실제 실행 없이 판단하면 live-verify의 존재 의의가 없음 |
| 단위 테스트 통과를 검증 완료로 간주 | 단위 테스트는 격리된 환경. 실제 제품 동작과 다를 수 있음 |
| 시나리오 단계를 추상적으로 작성 | "로그인을 테스트한다" ✗ → "email 필드에 입력하고 버튼을 클릭한다" ✓ |
| 실패 원인 분석 없이 무작정 수정 | 동일 수정을 반복하게 됨. 반드시 원인 먼저 파악 |
| 기대결과를 모호하게 기술 | "정상 동작" ✗ → "200 응답 + body에 userId 필드 존재" ✓ |
| 사전조건 확인을 건너뜀 | 서버가 안 떠 있는데 검증하면 모든 시나리오 실패 |
