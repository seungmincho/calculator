---
name: auto-commit
description: 사용자가 지시한 작업을 실행한 후 자동으로 git commit & push. "자동 커밋", "auto commit", "실행하고 커밋" 요청에 사용.
version: 1.0.0
---

# Auto Commit

사용자의 지시를 실행한 후 변경사항을 자동으로 커밋하고 푸시한다.

## Purpose

작업 → 커밋 → 푸시를 하나의 흐름으로 자동화하여 반복 작업을 줄인다.

## Execution

### Step 1: 작업 실행

사용자가 지시한 작업을 수행한다. 작업 내용은 이 스킬 호출 시 함께 전달된다.

### Step 2: 변경사항 확인

```bash
git status
git diff
```

변경사항이 없으면 "변경사항 없음"을 알리고 종료한다.

### Step 3: 커밋 메시지 작성

변경된 파일과 내용을 분석하여 커밋 메시지를 작성한다.

**커밋 메시지 규칙**:
- 한글로 작성
- 첫 줄: 변경 요약 (50자 이내)
- 빈 줄 후 상세 내용 (필요한 경우)
- Co-Authored-By 포함

**커밋 유형**:
| 유형 | 설명 |
|------|------|
| 추가 | 새 파일이나 기능 추가 |
| 수정 | 기존 기능 변경/개선 |
| 수정(버그) | 버그 수정 |
| 삭제 | 파일이나 기능 제거 |
| 리팩토링 | 동작 변경 없는 코드 개선 |
| 문서 | 문서 추가/수정 |

### Step 4: 커밋 & 푸시

```bash
git add <변경된 파일들>
git commit -m "<커밋 메시지>"
git push
```

**주의사항**:
- `git add -A` 대신 변경된 파일을 명시적으로 추가
- `.env`, credentials 등 민감한 파일은 제외
- 푸시 실패 시 원인을 알리고 사용자에게 확인

### Step 5: 결과 보고

커밋 완료 후 다음을 보고:
- 커밋 해시
- 변경된 파일 목록
- 푸시 상태

## Output Format

```markdown
### 작업 완료

**실행한 작업**: [작업 요약]

**커밋**: `abc1234` - [커밋 메시지]
**변경 파일**:
- `path/to/file1` (추가/수정/삭제)
- `path/to/file2` (추가/수정/삭제)

**푸시**: origin/master ✓
```

## Error Handling

| 상황 | 대응 |
|------|------|
| 변경사항 없음 | 작업 완료만 알림, 커밋 생략 |
| 커밋 실패 | 에러 원인 분석 후 재시도 |
| 푸시 실패 | 원인 알림, 사용자 확인 요청 |
| 민감 파일 감지 | 해당 파일 제외 후 경고 |

## Examples

**스킬 추가**:
```
User: "auto-commit 스킬 만들어줘"
→ 스킬 파일 생성
→ git add skills/auto-commit/SKILL.md
→ git commit -m "추가: auto-commit 스킬"
→ git push
```

**코드 수정**:
```
User: "GUIDE.md에 설치 방법 추가해줘"
→ GUIDE.md 수정
→ git add GUIDE.md
→ git commit -m "문서: GUIDE.md에 설치 방법 추가"
→ git push
```
