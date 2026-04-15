---
name: linkedin-insight
description: This skill should be used when the user wants to collect and analyze LinkedIn insights using browser automation. Trigger on "linkedin", "linkedin 인사이트", "linkedin 분석", "linkedin analytics", "링크드인 분석", "링크드인 인사이트", "포스트 분석", "linkedin post", "linkedin trend", "링크드인 트렌드", "linkedin profile", "linkedin network". Supports post analytics, profile insights, trend/content analysis, and network analysis via Codex in Chrome.
---

# LinkedIn Insight

LinkedIn 브라우저 자동화를 통해 인사이트를 수집하고 분석하는 스킬.

## 사전 조건

- Chrome 브라우저에서 LinkedIn에 로그인되어 있어야 함
- Codex in Chrome 확장 프로그램이 활성화되어 있어야 함

## 워크플로우

### Phase 0: 초기화

1. `tabs_context_mcp`로 현재 탭 상태를 확인한다.
2. `tabs_create_mcp`로 새 탭을 생성한다.
3. AskUserQuestion으로 사용자에게 수집할 인사이트 유형을 확인한다:

```
AskUserQuestion:
  question: "어떤 LinkedIn 인사이트를 분석할까요?"
  header: "분석 유형"
  multiSelect: true
  options:
    - label: "포스트 분석"
      description: "내 게시물의 조회수, 반응, 댓글, 공유 등 engagement 분석"
    - label: "프로필 인사이트"
      description: "프로필 조회수, 검색 노출, 방문자 분석"
    - label: "트렌드/콘텐츠"
      description: "LinkedIn에서 화제인 주제, 업계 트렌드, 인기 콘텐츠"
    - label: "네트워크 분석"
      description: "연결/팔로워 성장, 네트워크 구성 분석"
```

### Phase 1: 데이터 수집

선택된 유형에 따라 아래 섹션을 순차 실행한다.

---

#### 1A. 포스트 분석

**목표**: 최근 게시물의 engagement 데이터 수집

**Step 1**: LinkedIn 활동 페이지로 이동
```
navigate: https://www.linkedin.com/in/me/recent-activity/all/
```

**Step 2**: 페이지 로드 대기 후 스크린샷 촬영
```
computer: screenshot
```

**Step 3**: 게시물 목록 추출
- `read_page`로 게시물 영역의 accessibility tree를 읽는다
- 각 게시물에서 다음 정보를 추출:
  - 게시 날짜
  - 게시물 내용 (첫 2줄)
  - 반응 수 (좋아요, 축하 등)
  - 댓글 수
  - 공유/리포스트 수
  - 조회수 (노출수)

**Step 4**: 상세 분석이 필요한 경우 개별 포스트 클릭
- `find`로 "analytics" 또는 "조회" 관련 요소를 찾는다
- 클릭하여 상세 analytics 페이지로 이동
- `get_page_text`로 상세 데이터 추출:
  - 노출수 (Impressions)
  - 고유 조회수
  - 반응 breakdown (좋아요, 축하, 응원 등)
  - 댓글 상세
  - 공유 수
  - CTR (클릭률)
  - 인구통계 (직무, 회사, 위치)

**Step 5**: 최근 5~10개 게시물에 대해 Step 3-4를 반복

---

#### 1B. 프로필 인사이트

**목표**: 프로필 분석 데이터 수집

**Step 1**: LinkedIn 프로필 분석 페이지로 이동
```
navigate: https://www.linkedin.com/dashboard/
```

**Step 2**: 스크린샷 촬영 후 대시보드 데이터 읽기
```
computer: screenshot
read_page: interactive elements 확인
```

**Step 3**: 프로필 조회수 섹션 수집
- "프로필을 본 사람" 또는 "Who viewed your profile" 클릭
- `get_page_text`로 다음 데이터 추출:
  - 총 프로필 조회수 (주간/월간 추이)
  - 조회자 직무/회사/위치 분포
  - 조회 트렌드 그래프 데이터

**Step 4**: 검색 노출 섹션 수집
- "검색에 노출된 횟수" 또는 "Search appearances" 클릭
- 추출 데이터:
  - 검색 노출 횟수
  - 검색 키워드 (어떤 검색어로 찾았는지)
  - 검색자 회사/직무

**Step 5**: 추가 분석 데이터
```
navigate: https://www.linkedin.com/analytics/profile/
```
- 팔로워 수 및 추이
- 콘텐츠 노출 통계

---

#### 1C. 트렌드/콘텐츠 분석

**목표**: LinkedIn에서 화제인 주제와 트렌드 파악

**Step 1**: LinkedIn 뉴스/트렌드 페이지 확인
```
navigate: https://www.linkedin.com/feed/
```

**Step 2**: 스크린샷 촬영
```
computer: screenshot
```

**Step 3**: 트렌딩 뉴스 수집
- `find`로 "LinkedIn News" 또는 "오늘의 뉴스" 사이드바 섹션을 찾는다
- `read_page`로 트렌딩 주제 목록 추출
- 각 트렌드에서:
  - 헤드라인
  - 읽는 사람 수
  - 카테고리

**Step 4**: 피드에서 인기 콘텐츠 분석
- 피드를 스크롤하면서 높은 engagement를 가진 게시물 식별
- `javascript_tool`로 engagement 수치가 높은 게시물 필터링:
  ```javascript
  // 피드 게시물에서 반응 수가 높은 항목 추출
  document.querySelectorAll('.feed-shared-update-v2')
  ```
- 인기 콘텐츠 패턴 분석:
  - 주제/키워드
  - 포맷 (텍스트, 이미지, 비디오, 문서)
  - engagement 수준

**Step 5**: 업계 관련 트렌드 심화
- AskUserQuestion으로 관심 업계/키워드 확인 (필요시)
- LinkedIn 검색으로 특정 키워드 트렌드 확인

---

#### 1D. 네트워크 분석

**목표**: 연결 및 팔로워 네트워크 현황 파악

**Step 1**: 네트워크 페이지로 이동
```
navigate: https://www.linkedin.com/mynetwork/
```

**Step 2**: 스크린샷 촬영 및 데이터 수집
```
computer: screenshot
read_page: 네트워크 관련 요소 탐색
```

**Step 3**: 연결 현황 수집
```
navigate: https://www.linkedin.com/mynetwork/invite-connect/connections/
```
- 총 연결 수
- 최근 연결 목록
- 대기 중인 초대

**Step 4**: 팔로워 데이터 수집
- 팔로워 수
- 팔로잉 수

**Step 5**: 네트워크 구성 분석 (가능한 경우)
- `get_page_text`로 연결 목록에서 직무/회사 패턴 파악

---

### Phase 2: 분석 및 리포트

수집된 데이터를 종합하여 인사이트 리포트를 생성한다.

#### 리포트 구조

```markdown
# LinkedIn 인사이트 리포트

> 수집일: {날짜}

## 요약 (Executive Summary)
- 핵심 지표 하이라이트
- 주요 변화/트렌드

## 1. 포스트 퍼포먼스 (선택 시)
### 주요 지표
| 게시물 | 날짜 | 노출 | 반응 | 댓글 | 공유 | Engagement Rate |
|--------|------|------|------|------|------|-----------------|

### 트렌드
- 최고 성과 게시물 및 성공 요인
- engagement 추이 (상승/하락)
- 콘텐츠 유형별 성과 비교

### 추천
- 최적 게시 시간대
- 효과적인 콘텐츠 포맷
- engagement 개선 방안

## 2. 프로필 인사이트 (선택 시)
### 프로필 조회
- 주간/월간 조회 추이
- 주요 방문자 프로필 (직무, 회사, 위치)

### 검색 노출
- 노출 키워드
- 검색자 특성

### 추천
- 프로필 최적화 제안
- SEO 키워드 추천

## 3. 트렌드 & 콘텐츠 (선택 시)
### 현재 트렌딩
- 주요 뉴스/토픽
- 업계 트렌드

### 인기 콘텐츠 패턴
- 높은 engagement 콘텐츠의 공통점
- 포맷/주제별 분석

### 콘텐츠 기회
- 참여할 수 있는 트렌드 토픽
- 추천 콘텐츠 아이디어

## 4. 네트워크 (선택 시)
### 현황
- 총 연결/팔로워 수
- 네트워크 구성 (직무, 업종)

### 성장
- 최근 연결 추이
- 주요 새 연결

### 추천
- 네트워크 확장 전략
- 관계 강화 대상
```

### Phase 3: 후속 액션

리포트 생성 후 AskUserQuestion으로 후속 액션을 확인한다:

```
AskUserQuestion:
  question: "리포트를 기반으로 어떤 후속 액션을 진행할까요?"
  header: "후속 액션"
  multiSelect: true
  options:
    - label: "콘텐츠 아이디어 생성"
      description: "트렌드와 성과 데이터를 기반으로 새 게시물 아이디어 제안"
    - label: "프로필 최적화 제안"
      description: "검색 노출과 방문자 데이터를 기반으로 프로필 개선 포인트 제시"
    - label: "리포트 저장"
      description: "분석 결과를 마크다운 파일로 저장"
    - label: "완료"
      description: "추가 액션 없이 종료"
```

## 주의사항

- LinkedIn의 UI는 자주 변경되므로 선택자가 작동하지 않을 수 있다. 이 경우 `find`와 `read_page`로 동적으로 요소를 탐색한다.
- 로그인이 필요한 페이지에서 로그인 화면이 나타나면 사용자에게 알리고 로그인을 요청한다.
- 비공개 데이터(다른 사람의 프로필 상세 등)를 수집하지 않는다.
- 속도 제한을 고려하여 페이지 간 적절한 대기 시간을 둔다 (`computer: wait 2`).
- 스크래핑이 아닌 사용자 본인의 대시보드/분석 데이터만 수집한다.
