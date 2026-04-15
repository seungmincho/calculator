# 검증 시나리오 템플릿

## 메타데이터
- **주제**: {주제}
- **생성일**: {YYYY-MM-DD}
- **대상 타입**: {웹 | CLI | API | 복합}
- **시나리오 수**: {N}건

---

## 시나리오 목록

### S{번호}: {시나리오명}
- **대상**: {웹 | CLI | API}
- **도구**: {Playwright | Bash | curl}
- **사전조건**: {서버 실행 여부, 필요한 데이터, 환경 설정 등}
- **단계**:
  1. {구체적 행동 — "무엇을 어디에 어떻게"}
  2. {다음 행동}
  3. ...
- **기대결과**: {관찰 가능한 결과 — 텍스트 존재, URL 변경, 상태 코드 등}
- **카테고리**: {정상 | 엣지케이스 | 에러 | 회귀}

---

## 도구별 단계 작성 가이드

### 웹 (Playwright)
단계는 Playwright MCP 도구와 1:1 매핑되어야 한다:
- "페이지 이동" → `browser_navigate`
- "버튼 클릭" → `browser_click`
- "텍스트 입력" → `browser_fill_form` 또는 `browser_type`
- "화면 상태 확인" → `browser_snapshot`
- "스크린샷 촬영" → `browser_take_screenshot`
- "키 입력" → `browser_press_key`
- "요소 대기" → `browser_wait_for`

### CLI (Bash)
- "명령어 실행" → `Bash` 도구로 실행
- "출력 확인" → stdout/stderr 텍스트 매칭
- "종료 코드 확인" → $? 값 비교
- "파일 생성 확인" → `ls` 또는 `Glob`으로 확인

### API (curl)
- "요청 전송" → `Bash`에서 curl 명령어 실행
- "응답 코드 확인" → HTTP 상태 코드 비교
- "응답 본문 확인" → JSON 필드 값 비교
- "헤더 확인" → 특정 헤더 존재/값 비교
