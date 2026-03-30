export type PatternDifficulty = 'easy' | 'medium' | 'hard'
export type PatternCategory = 'array' | 'string' | 'tree' | 'graph' | 'dp' | 'design'

export interface CodingPattern {
  id: string
  name: string
  nameEn: string
  category: PatternCategory
  difficulty: PatternDifficulty
  description: string
  whenToUse: string[]
  approach: string[]
  timeComplexity: string
  spaceComplexity: string
  pseudocode: string
  examples: {
    name: string
    difficulty: PatternDifficulty
    hint: string
  }[]
  commonMistakes: string[]
  relatedPatterns: string[]
  tip: string
}

export const PATTERN_CATEGORIES: Record<PatternCategory, { nameKo: string; nameEn: string; icon: string }> = {
  array: { nameKo: '배열/투포인터', nameEn: 'Array/Two Pointers', icon: '📐' },
  string: { nameKo: '문자열/해시', nameEn: 'String/Hash', icon: '🔤' },
  tree: { nameKo: '트리/그래프', nameEn: 'Tree/Graph', icon: '🌳' },
  graph: { nameKo: '탐색/BFS/DFS', nameEn: 'Search/BFS/DFS', icon: '🔍' },
  dp: { nameKo: '동적 프로그래밍', nameEn: 'Dynamic Programming', icon: '📊' },
  design: { nameKo: '설계/기법', nameEn: 'Design/Technique', icon: '⚙️' },
}

export const CODING_PATTERNS: CodingPattern[] = [
  // ── Array/Two Pointers ──────────────────────────────────────
  {
    id: 'two-pointers',
    name: '투 포인터',
    nameEn: 'Two Pointers',
    category: 'array',
    difficulty: 'easy',
    description: '정렬된 배열에서 두 개의 포인터를 양 끝 또는 같은 방향으로 이동시키며 조건을 만족하는 쌍이나 구간을 효율적으로 탐색하는 기법입니다. 브루트포스 O(n²)를 O(n)으로 줄일 수 있습니다.',
    whenToUse: [
      '배열이 정렬되어 있고 특정 합/차를 찾아야 할 때',
      '두 요소의 쌍을 비교해야 할 때 (O(n²) → O(n) 최적화)',
      '중복을 제거하면서 배열을 순회해야 할 때',
      '연결 리스트에서 사이클 감지나 중간 노드를 찾을 때',
    ],
    approach: [
      '배열이 정렬되지 않았다면 먼저 정렬합니다',
      'left = 0, right = n-1 (양끝) 또는 slow = fast = 0 (같은 방향)으로 초기화',
      '조건에 따라 포인터를 이동: 합이 크면 right--, 작으면 left++',
      '두 포인터가 만나거나 조건을 충족하면 종료',
      '결과를 수집하거나 최적값을 갱신',
    ],
    timeComplexity: 'O(n)',
    spaceComplexity: 'O(1)',
    pseudocode: `def two_sum_sorted(arr, target):
    left, right = 0, len(arr) - 1
    while left < right:
        total = arr[left] + arr[right]
        if total == target:
            return [left, right]  # 정답 발견
        elif total < target:
            left += 1   # 합이 작으면 왼쪽 포인터 이동
        else:
            right -= 1  # 합이 크면 오른쪽 포인터 이동
    return []  # 없음`,
    examples: [
      { name: 'Two Sum II (Sorted)', difficulty: 'easy', hint: '양끝에서 시작하여 합이 target이 되는 쌍을 찾으세요' },
      { name: 'Container With Most Water', difficulty: 'medium', hint: '높이가 낮은 쪽의 포인터를 안쪽으로 이동하며 최대 넓이를 갱신하세요' },
      { name: '3Sum', difficulty: 'medium', hint: '하나를 고정하고 나머지 두 수를 투 포인터로 찾되, 중복을 건너뛰세요' },
    ],
    commonMistakes: [
      '정렬되지 않은 배열에 투 포인터를 바로 적용하는 실수 (정렬 먼저!)',
      '같은 요소를 두 번 사용하는 경우 (left < right 조건 확인)',
      '3Sum에서 중복 결과를 제거하지 않는 실수 (같은 값 건너뛰기 필요)',
    ],
    relatedPatterns: ['sliding-window', 'binary-search'],
    tip: '면접에서 "정렬된 배열"이 주어지면 투 포인터를 가장 먼저 떠올리세요. O(n) 시간, O(1) 공간이라는 점을 강조하면 좋습니다.',
  },
  {
    id: 'sliding-window',
    name: '슬라이딩 윈도우',
    nameEn: 'Sliding Window',
    category: 'array',
    difficulty: 'medium',
    description: '배열이나 문자열에서 연속된 부분 구간(윈도우)을 한 칸씩 밀면서 최적값을 찾는 기법입니다. 고정 크기와 가변 크기 두 가지 변형이 있으며, 중첩 반복문 없이 O(n)에 해결할 수 있습니다.',
    whenToUse: [
      '연속된 부분 배열/문자열에서 최대/최소/특정 조건을 찾을 때',
      '"크기 k인 연속 부분 배열"이 문제에 등장할 때 (고정 윈도우)',
      '"조건을 만족하는 가장 짧은/긴 부분 문자열"을 찾을 때 (가변 윈도우)',
      '부분합, 빈도수 기반 조건 충족 문제',
    ],
    approach: [
      '윈도우의 시작(left)과 끝(right) 포인터를 0으로 초기화',
      'right를 확장하며 윈도우에 새 요소를 추가',
      '윈도우가 조건을 만족하면 결과를 갱신',
      '조건을 초과하면 left를 축소하며 요소를 제거',
      'right가 끝에 도달할 때까지 반복',
      '고정 크기라면 윈도우 크기가 k가 된 후부터 left도 함께 이동',
    ],
    timeComplexity: 'O(n)',
    spaceComplexity: 'O(k) (윈도우 내 상태 저장)',
    pseudocode: `def min_window_substring(s, t):
    need = Counter(t)       # 필요한 문자 빈도
    left = matched = 0
    result = ""
    for right in range(len(s)):
        if s[right] in need:
            need[s[right]] -= 1
            if need[s[right]] >= 0:
                matched += 1
        while matched == len(t):  # 모든 문자 포함 시
            if not result or (right - left + 1) < len(result):
                result = s[left:right+1]  # 결과 갱신
            if s[left] in need:
                need[s[left]] += 1
                if need[s[left]] > 0:
                    matched -= 1
            left += 1  # 윈도우 축소
    return result`,
    examples: [
      { name: 'Maximum Subarray (크기 k)', difficulty: 'easy', hint: '윈도우 크기를 k로 고정하고 합을 유지하며 슬라이딩하세요' },
      { name: 'Minimum Window Substring', difficulty: 'hard', hint: '필요 문자 카운트를 관리하며 가변 윈도우를 축소하세요' },
      { name: 'Longest Substring Without Repeating Characters', difficulty: 'medium', hint: 'Set으로 중복을 감지하고 중복 시 left를 이동하세요' },
    ],
    commonMistakes: [
      '윈도우 축소 시 left에서 제거한 요소의 상태를 복원하지 않는 실수',
      '가변 윈도우에서 조건 체크를 if로 하고 while로 하지 않는 실수 (여러 번 축소 필요)',
      '고정/가변 윈도우 구분을 못해 불필요하게 복잡한 코드를 작성',
    ],
    relatedPatterns: ['two-pointers', 'hashmap-pattern'],
    tip: '"연속 부분 배열"이라는 키워드가 보이면 슬라이딩 윈도우를 떠올리세요. 고정 크기 vs 가변 크기를 먼저 구분하면 구현이 훨씬 쉬워집니다.',
  },
  {
    id: 'interval-merge',
    name: '구간 병합',
    nameEn: 'Interval Merge',
    category: 'array',
    difficulty: 'medium',
    description: '시작점과 끝점으로 표현된 구간(interval)들을 정렬한 후, 겹치는 구간을 합치거나 새 구간을 삽입하는 기법입니다. 스케줄링, 회의실 배정 등 구간 관련 문제의 핵심 패턴입니다.',
    whenToUse: [
      '구간(interval)을 합치거나 겹침 여부를 판단해야 할 때',
      '회의실/일정 관련 문제에서 동시 진행 수를 계산할 때',
      '새 구간을 삽입한 후 결과를 정리해야 할 때',
      '이벤트의 시작/끝 시간을 다루는 문제',
    ],
    approach: [
      '구간들을 시작점 기준으로 정렬',
      '첫 번째 구간을 결과 리스트에 추가',
      '다음 구간의 시작점이 현재 구간의 끝점 이하면 병합 (끝점 = max)',
      '겹치지 않으면 새 구간으로 결과에 추가',
      '모든 구간을 순회할 때까지 반복',
    ],
    timeComplexity: 'O(n log n) (정렬 포함)',
    spaceComplexity: 'O(n)',
    pseudocode: `def merge_intervals(intervals):
    intervals.sort(key=lambda x: x[0])  # 시작점 기준 정렬
    merged = [intervals[0]]
    for start, end in intervals[1:]:
        if start <= merged[-1][1]:   # 겹치면
            merged[-1][1] = max(merged[-1][1], end)  # 병합
        else:
            merged.append([start, end])  # 새 구간
    return merged`,
    examples: [
      { name: 'Merge Intervals', difficulty: 'medium', hint: '시작점 정렬 후 이전 구간의 끝과 현재 시작을 비교하세요' },
      { name: 'Insert Interval', difficulty: 'medium', hint: '삽입 위치 전후를 분리하고 겹치는 구간들을 하나로 합치세요' },
      { name: 'Meeting Rooms II', difficulty: 'medium', hint: '최소 힙으로 가장 빨리 끝나는 회의의 종료 시간을 추적하세요' },
    ],
    commonMistakes: [
      '정렬을 하지 않고 병합을 시도하는 실수',
      '병합 시 끝점을 단순 대입하고 max를 취하지 않는 실수 ([1,5]와 [2,3] → 끝점은 5)',
      '구간의 끝점이 같고 시작점이 다른 엣지 케이스 처리 누락',
    ],
    relatedPatterns: ['greedy', 'two-pointers'],
    tip: '구간 문제는 대부분 "시작점 정렬 → 순차 비교"가 핵심입니다. 면접에서 정렬 기준을 먼저 명확히 말하고 시작하면 좋은 인상을 줍니다.',
  },

  // ── String/Hash ──────────────────────────────────────────────
  {
    id: 'hashmap-pattern',
    name: '해시맵 활용',
    nameEn: 'HashMap Pattern',
    category: 'string',
    difficulty: 'easy',
    description: '해시맵(딕셔너리)을 사용하여 요소의 빈도수를 세거나, 이전에 본 값을 O(1)로 조회하는 기법입니다. 중복 검사, 그룹핑, 보완값 찾기 등 가장 범용적으로 사용되는 패턴입니다.',
    whenToUse: [
      '특정 합/차를 이루는 쌍을 찾아야 할 때 (보완값 저장)',
      '문자열에서 문자 빈도수를 세거나 비교해야 할 때',
      '배열에서 중복을 검사하거나 첫 번째 고유 요소를 찾을 때',
      '요소들을 특정 기준으로 그룹핑해야 할 때',
    ],
    approach: [
      '빈 해시맵을 생성',
      '배열/문자열을 순회하며 해시맵에 값을 저장 (빈도수 or 인덱스)',
      '현재 요소의 보완값이 해시맵에 있는지 O(1)로 확인',
      '조건을 만족하면 결과를 반환하거나 수집',
      '그룹핑의 경우 키를 기준으로 리스트에 추가',
    ],
    timeComplexity: 'O(n)',
    spaceComplexity: 'O(n)',
    pseudocode: `def two_sum(nums, target):
    seen = {}  # 값 → 인덱스 저장
    for i, num in enumerate(nums):
        complement = target - num  # 보완값
        if complement in seen:
            return [seen[complement], i]  # 정답!
        seen[num] = i  # 현재 값 저장
    return []

def group_anagrams(strs):
    groups = defaultdict(list)
    for s in strs:
        key = tuple(sorted(s))  # 정렬된 문자열을 키로
        groups[key].append(s)
    return list(groups.values())`,
    examples: [
      { name: 'Two Sum', difficulty: 'easy', hint: 'target - num이 해시맵에 있는지 확인하세요' },
      { name: 'Group Anagrams', difficulty: 'medium', hint: '정렬된 문자열을 키로 사용하여 그룹핑하세요' },
      { name: 'Valid Anagram', difficulty: 'easy', hint: '두 문자열의 문자 빈도수가 동일한지 비교하세요' },
    ],
    commonMistakes: [
      'Two Sum에서 같은 인덱스를 두 번 사용하는 실수 (저장 전에 확인 필요)',
      '해시맵의 키 타입이 hashable하지 않은 경우 (리스트 → 튜플 변환)',
      '빈도수 비교 시 Counter를 사용하지 않고 직접 구현하여 버그 발생',
    ],
    relatedPatterns: ['sliding-window', 'string-matching'],
    tip: '"O(n²)를 O(n)으로 줄여야 한다"는 힌트가 나오면 해시맵을 떠올리세요. 면접에서 해시 충돌 시 O(n) 최악 케이스도 언급하면 가산점입니다.',
  },
  {
    id: 'string-matching',
    name: '문자열 매칭',
    nameEn: 'String Matching',
    category: 'string',
    difficulty: 'medium',
    description: '문자열 내에서 패턴을 찾거나, 팰린드롬/아나그램 등 문자열 특성을 분석하는 기법입니다. 브루트포스부터 KMP, 라빈-카프 등 고급 알고리즘까지 면접에서 자주 출제됩니다.',
    whenToUse: [
      '텍스트에서 특정 패턴의 위치를 찾아야 할 때',
      '팰린드롬(회문) 여부를 판단하거나 가장 긴 팰린드롬을 찾을 때',
      '부분 문자열의 아나그램을 찾아야 할 때',
      '문자열 변환 최소 횟수를 구해야 할 때',
    ],
    approach: [
      '팰린드롬: 중심 확장법 — 각 위치에서 양쪽으로 확장',
      '패턴 매칭: KMP — 접두사 테이블(failure function)을 전처리',
      '슬라이딩 윈도우 + 빈도수 맵으로 아나그램 탐색',
      '필요 시 투 포인터로 양끝에서 비교',
      '복잡한 변환은 DP (편집 거리)로 접근',
    ],
    timeComplexity: 'O(n) ~ O(n+m)',
    spaceComplexity: 'O(m) (패턴 길이)',
    pseudocode: `def longest_palindrome(s):
    result = ""
    for i in range(len(s)):
        # 홀수 길이 팰린드롬 (중심 1개)
        odd = expand(s, i, i)
        # 짝수 길이 팰린드롬 (중심 2개)
        even = expand(s, i, i + 1)
        result = max(result, odd, even, key=len)
    return result

def expand(s, left, right):
    while left >= 0 and right < len(s) and s[left] == s[right]:
        left -= 1   # 왼쪽 확장
        right += 1  # 오른쪽 확장
    return s[left+1:right]  # 팰린드롬 반환`,
    examples: [
      { name: 'Longest Palindromic Substring', difficulty: 'medium', hint: '각 인덱스를 중심으로 양방향 확장하세요 (홀수/짝수 길이 모두)' },
      { name: 'Implement strStr (KMP)', difficulty: 'medium', hint: 'failure function을 전처리하여 불일치 시 되돌아갈 위치를 미리 계산하세요' },
      { name: 'Find All Anagrams', difficulty: 'medium', hint: '슬라이딩 윈도우로 빈도수 맵을 유지하며 패턴 길이만큼 이동하세요' },
    ],
    commonMistakes: [
      '팰린드롬 중심 확장에서 짝수 길이 케이스를 빠뜨리는 실수',
      'KMP의 failure function 구현에서 인덱스 오프바이원 실수',
      '대소문자/공백 처리를 문제 조건에 맞게 하지 않는 실수',
    ],
    relatedPatterns: ['hashmap-pattern', 'sliding-window', 'dp-2d'],
    tip: '팰린드롬 문제는 "중심 확장법"을 먼저 설명하고, 시간이 되면 Manacher 알고리즘도 언급하세요. 면접관에게 다양한 접근법을 알고 있다는 인상을 줍니다.',
  },

  // ── Tree/Graph ───────────────────────────────────────────────
  {
    id: 'tree-traversal',
    name: '이진 트리 순회',
    nameEn: 'Tree Traversal',
    category: 'tree',
    difficulty: 'easy',
    description: '이진 트리의 노드를 체계적으로 방문하는 기법입니다. 전위(Pre), 중위(In), 후위(Post), 레벨(Level) 순회 4가지가 있으며, 재귀와 반복(스택/큐) 두 가지 구현 방식을 모두 알아야 합니다.',
    whenToUse: [
      '트리의 모든 노드를 특정 순서로 방문해야 할 때',
      'BST에서 정렬된 순서로 값을 얻어야 할 때 (중위 순회)',
      '트리를 직렬화/역직렬화해야 할 때 (전위 순회)',
      '레벨별로 노드를 그룹핑하거나 최단 깊이를 찾을 때 (레벨 순회)',
    ],
    approach: [
      '순회 종류를 결정: 전위(루트→좌→우), 중위(좌→루트→우), 후위(좌→우→루트), 레벨(BFS)',
      '재귀: 기저 조건(node is None)을 먼저 처리',
      '재귀 호출 순서를 순회 종류에 맞게 배치',
      '반복(스택): 명시적 스택으로 재귀를 시뮬레이션',
      '레벨 순회: 큐를 사용하여 레벨 단위로 처리',
    ],
    timeComplexity: 'O(n)',
    spaceComplexity: 'O(h) (재귀 스택, h=트리 높이)',
    pseudocode: `def inorder(root):
    if not root:
        return []
    return inorder(root.left) + [root.val] + inorder(root.right)

def level_order(root):
    if not root:
        return []
    result, queue = [], [root]
    while queue:
        level = []
        for _ in range(len(queue)):  # 현재 레벨의 노드 수만큼
            node = queue.pop(0)
            level.append(node.val)
            if node.left: queue.append(node.left)
            if node.right: queue.append(node.right)
        result.append(level)
    return result`,
    examples: [
      { name: 'Binary Tree Inorder Traversal', difficulty: 'easy', hint: '재귀로 좌→루트→우 순서로 방문하세요. 반복 풀이도 연습하세요' },
      { name: 'Binary Tree Level Order Traversal', difficulty: 'medium', hint: 'BFS로 레벨마다 큐 크기만큼 꺼내면 레벨 구분이 됩니다' },
      { name: 'Maximum Depth of Binary Tree', difficulty: 'easy', hint: '재귀로 max(좌측 깊이, 우측 깊이) + 1을 반환하세요' },
    ],
    commonMistakes: [
      '기저 조건(None 체크)을 빼먹어 무한 재귀에 빠지는 실수',
      '레벨 순회에서 큐 크기를 미리 저장하지 않아 레벨 구분이 안 되는 실수',
      '반복 풀이에서 스택과 큐를 혼동하는 실수 (DFS=스택, BFS=큐)',
    ],
    relatedPatterns: ['bfs', 'dfs'],
    tip: '면접에서 "재귀와 반복 풀이 모두 구현할 수 있나요?"라는 질문이 자주 옵니다. 중위 순회의 반복 풀이는 반드시 외워두세요.',
  },
  {
    id: 'bfs',
    name: 'BFS (너비 우선 탐색)',
    nameEn: 'BFS (Breadth-First Search)',
    category: 'graph',
    difficulty: 'medium',
    description: '큐를 사용하여 시작 노드에서 가까운 노드부터 탐색하는 기법입니다. 가중치가 없는 그래프에서 최단 경로를 보장하며, 레벨별 탐색이 필요한 문제에 적합합니다.',
    whenToUse: [
      '최단 경로/최소 횟수를 구해야 할 때 (가중치 없는 그래프)',
      '레벨별로 탐색하거나 거리 단위로 확산해야 할 때',
      '격자(grid)에서 퍼져나가는 시뮬레이션 (썩은 오렌지, 불 전파 등)',
      '단어 변환 최소 횟수 등 상태 공간 탐색',
    ],
    approach: [
      '시작 노드를 큐에 넣고 방문 처리',
      '큐에서 노드를 꺼내 인접 노드를 확인',
      '방문하지 않은 인접 노드를 큐에 추가하고 방문 처리',
      '목표에 도달하면 현재 깊이(거리)를 반환',
      '큐가 빌 때까지 반복 (도달 불가 시 -1 반환)',
    ],
    timeComplexity: 'O(V + E)',
    spaceComplexity: 'O(V)',
    pseudocode: `def bfs_shortest_path(graph, start, target):
    queue = deque([(start, 0)])  # (노드, 거리)
    visited = {start}
    while queue:
        node, dist = queue.popleft()
        if node == target:
            return dist  # 최단 거리
        for neighbor in graph[node]:
            if neighbor not in visited:
                visited.add(neighbor)
                queue.append((neighbor, dist + 1))
    return -1  # 도달 불가`,
    examples: [
      { name: 'Shortest Path in Binary Matrix', difficulty: 'medium', hint: '8방향 BFS로 (0,0)에서 (n-1,n-1)까지의 최단 거리를 구하세요' },
      { name: 'Word Ladder', difficulty: 'hard', hint: '각 단어를 노드로, 한 글자 차이를 간선으로 모델링하고 BFS를 돌리세요' },
      { name: 'Rotting Oranges', difficulty: 'medium', hint: '모든 썩은 오렌지를 동시에 큐에 넣고 멀티소스 BFS를 실행하세요' },
    ],
    commonMistakes: [
      '방문 체크를 큐에서 꺼낼 때가 아니라 넣을 때 해야 중복 방문을 방지할 수 있음',
      '격자 문제에서 경계 체크를 빠뜨리는 실수 (0 <= x < n)',
      '멀티소스 BFS에서 시작점을 하나만 넣는 실수 (모든 소스를 동시에 넣어야 함)',
    ],
    relatedPatterns: ['dfs', 'tree-traversal', 'topological-sort'],
    tip: '"최단", "최소 횟수"라는 키워드가 보이면 BFS를 먼저 떠올리세요. DFS는 최단을 보장하지 않지만, BFS는 가중치 없는 그래프에서 최단을 보장합니다.',
  },
  {
    id: 'dfs',
    name: 'DFS (깊이 우선 탐색)',
    nameEn: 'DFS (Depth-First Search)',
    category: 'graph',
    difficulty: 'medium',
    description: '스택 또는 재귀로 한 경로를 끝까지 탐색한 후 되돌아오는 기법입니다. 모든 경로 탐색, 연결 컴포넌트 카운팅, 백트래킹 문제에 적합하며, 구현이 직관적입니다.',
    whenToUse: [
      '모든 가능한 경로/조합/순열을 탐색해야 할 때',
      '그래프의 연결 컴포넌트 수를 세야 할 때 (섬의 개수 등)',
      '트리에서 루트→리프 경로의 합을 구해야 할 때',
      '사이클 감지, 위상 정렬의 보조 수단으로 사용할 때',
    ],
    approach: [
      '시작 노드에서 재귀 호출 (또는 스택 사용)',
      '현재 노드를 방문 처리',
      '인접한 미방문 노드에 대해 재귀적으로 DFS 호출',
      '백트래킹: 탐색 후 방문 표시를 해제하여 다른 경로 탐색',
      '기저 조건을 명확히 설정 (목표 도달, 범위 초과 등)',
    ],
    timeComplexity: 'O(V + E)',
    spaceComplexity: 'O(V) (재귀 스택)',
    pseudocode: `def count_islands(grid):
    count = 0
    for i in range(len(grid)):
        for j in range(len(grid[0])):
            if grid[i][j] == '1':  # 땅 발견
                dfs(grid, i, j)     # 연결된 땅 모두 방문
                count += 1          # 섬 카운트
    return count

def dfs(grid, i, j):
    if i < 0 or j < 0 or i >= len(grid) or j >= len(grid[0]):
        return
    if grid[i][j] != '1':
        return
    grid[i][j] = '0'  # 방문 처리 (침몰)
    for di, dj in [(0,1),(0,-1),(1,0),(-1,0)]:
        dfs(grid, i + di, j + dj)  # 4방향 탐색`,
    examples: [
      { name: 'Number of Islands', difficulty: 'medium', hint: '각 땅에서 DFS로 연결된 모든 땅을 방문 처리하고 섬 카운트를 증가하세요' },
      { name: 'Path Sum', difficulty: 'easy', hint: '루트→리프 경로에서 남은 합을 줄여가며 리프에서 0인지 확인하세요' },
      { name: 'Permutations', difficulty: 'medium', hint: '사용 여부 배열과 현재 경로를 유지하며 백트래킹하세요' },
    ],
    commonMistakes: [
      '방문 처리를 하지 않아 무한 루프에 빠지는 실수',
      '백트래킹에서 상태 복원을 빠뜨리는 실수 (visited에서 제거 필요)',
      '격자 DFS에서 대각선 방향을 포함/미포함하는 것을 문제 조건과 다르게 하는 실수',
    ],
    relatedPatterns: ['bfs', 'tree-traversal', 'topological-sort'],
    tip: 'DFS vs BFS 선택 기준: "모든 경로 탐색, 존재 여부"는 DFS, "최단 거리, 레벨별"은 BFS. 면접에서 이 구분을 명확히 설명하면 좋습니다.',
  },

  // ── Search (graph category) ──────────────────────────────────
  {
    id: 'binary-search',
    name: '이진 탐색',
    nameEn: 'Binary Search',
    category: 'graph',
    difficulty: 'medium',
    description: '정렬된 데이터에서 탐색 범위를 절반씩 줄여가며 O(log n)에 답을 찾는 기법입니다. 단순 값 찾기뿐 아니라, 조건을 만족하는 최소/최대값을 찾는 "매개변수 탐색"이 코딩 테스트에서 핵심입니다.',
    whenToUse: [
      '정렬된 배열에서 특정 값의 위치를 찾아야 할 때',
      '"최소값의 최대화" 또는 "최대값의 최소화" 문제 (매개변수 탐색)',
      '단조 증가/감소 함수에서 경계값을 찾아야 할 때',
      '시간 복잡도가 O(log n)이어야 할 때',
    ],
    approach: [
      'left, right 범위를 설정 (배열 인덱스 또는 답의 범위)',
      'mid = (left + right) // 2 계산',
      '조건 함수에 mid를 넣어 판단',
      '조건을 만족하면 범위를 좁히고 (right = mid), 아니면 반대 (left = mid + 1)',
      'left == right가 될 때 답을 반환',
      '열린/닫힌 구간 선택에 따라 while 조건과 갱신 방법이 달라짐에 주의',
    ],
    timeComplexity: 'O(log n)',
    spaceComplexity: 'O(1)',
    pseudocode: `def binary_search(arr, target):
    left, right = 0, len(arr) - 1
    while left <= right:
        mid = (left + right) // 2
        if arr[mid] == target:
            return mid
        elif arr[mid] < target:
            left = mid + 1   # 오른쪽 절반 탐색
        else:
            right = mid - 1  # 왼쪽 절반 탐색
    return -1

# 매개변수 탐색: 조건을 만족하는 최소값
def parametric_search(lo, hi, condition):
    while lo < hi:
        mid = (lo + hi) // 2
        if condition(mid):  # 조건 만족
            hi = mid        # 더 작은 값 시도
        else:
            lo = mid + 1    # 더 큰 값 시도
    return lo`,
    examples: [
      { name: 'Search in Rotated Sorted Array', difficulty: 'medium', hint: '어느 쪽이 정렬되어 있는지 판단하고, 그 범위에 target이 있는지 확인하세요' },
      { name: 'Find Peak Element', difficulty: 'medium', hint: 'mid와 mid+1을 비교하여 오르막 방향으로 이동하세요' },
      { name: 'Koko Eating Bananas', difficulty: 'medium', hint: '속도를 매개변수로 두고, 주어진 시간 내 가능한 최소 속도를 이진 탐색하세요' },
    ],
    commonMistakes: [
      'left + right 오버플로우 (Python은 괜찮지만 Java/C++에서는 left + (right-left)//2 사용)',
      'while 조건을 left <= right vs left < right 중 잘못 선택하여 무한 루프 또는 누락',
      '매개변수 탐색에서 조건 함수의 단조성을 확인하지 않는 실수',
    ],
    relatedPatterns: ['two-pointers', 'dp-1d'],
    tip: '이진 탐색의 핵심은 "탐색 범위를 절반으로 줄일 수 있는 조건"을 찾는 것입니다. 매개변수 탐색은 카카오/네이버 코딩 테스트 단골 유형이니 반드시 연습하세요.',
  },
  {
    id: 'topological-sort',
    name: '위상 정렬',
    nameEn: 'Topological Sort',
    category: 'graph',
    difficulty: 'hard',
    description: 'DAG(방향 비순환 그래프)에서 선후 관계를 만족하는 순서를 결정하는 알고리즘입니다. 선수과목, 빌드 의존성, 작업 스케줄링 등 "순서가 정해진" 문제에서 사용됩니다.',
    whenToUse: [
      '선수 조건(prerequisite)이 있는 순서 결정 문제',
      '의존성 그래프에서 실행 순서를 정해야 할 때',
      '사이클 존재 여부를 확인해야 할 때 (위상 정렬 불가 = 사이클 존재)',
      'DAG에서 최장 경로를 구해야 할 때',
    ],
    approach: [
      '각 노드의 진입 차수(in-degree)를 계산',
      '진입 차수가 0인 노드를 큐에 삽입',
      '큐에서 노드를 꺼내 결과에 추가',
      '해당 노드에서 나가는 간선을 제거 (인접 노드의 진입 차수 감소)',
      '진입 차수가 0이 된 노드를 큐에 추가',
      '결과 길이가 노드 수와 다르면 사이클 존재',
    ],
    timeComplexity: 'O(V + E)',
    spaceComplexity: 'O(V + E)',
    pseudocode: `def topological_sort(num_nodes, prerequisites):
    graph = defaultdict(list)
    in_degree = [0] * num_nodes
    for dest, src in prerequisites:
        graph[src].append(dest)
        in_degree[dest] += 1
    # 진입 차수 0인 노드로 시작
    queue = deque([i for i in range(num_nodes) if in_degree[i] == 0])
    order = []
    while queue:
        node = queue.popleft()
        order.append(node)
        for neighbor in graph[node]:
            in_degree[neighbor] -= 1  # 간선 제거
            if in_degree[neighbor] == 0:
                queue.append(neighbor)
    # 사이클 체크
    return order if len(order) == num_nodes else []`,
    examples: [
      { name: 'Course Schedule', difficulty: 'medium', hint: '모든 과목을 수강 가능한지 = 위상 정렬 결과의 길이가 과목 수와 같은지' },
      { name: 'Alien Dictionary', difficulty: 'hard', hint: '인접 단어를 비교하여 문자 간 순서 관계를 추출하고 위상 정렬하세요' },
    ],
    commonMistakes: [
      '진입 차수 배열을 그래프 구성 시점에 제대로 업데이트하지 않는 실수',
      '사이클 체크를 빠뜨려 무한 루프나 잘못된 결과를 반환',
      'DFS 기반 위상 정렬에서 방문 상태를 3가지(미방문/진행중/완료)로 관리하지 않는 실수',
    ],
    relatedPatterns: ['bfs', 'dfs'],
    tip: 'BFS(Kahn) 방식이 구현이 쉽고 사이클 감지도 자연스럽습니다. 면접에서는 "진입 차수가 0인 노드부터 제거"라고 설명하며 시작하면 깔끔합니다.',
  },

  // ── Dynamic Programming ──────────────────────────────────────
  {
    id: 'dp-1d',
    name: '1차원 DP',
    nameEn: '1D Dynamic Programming',
    category: 'dp',
    difficulty: 'medium',
    description: '하나의 상태 변수(보통 인덱스 i)로 정의되는 DP입니다. 이전 결과를 활용하여 현재 값을 계산하며, 피보나치부터 최적화 문제까지 DP의 기본이 됩니다. 공간 최적화로 O(1)까지 줄일 수 있습니다.',
    whenToUse: [
      '직전 1~2개의 상태만으로 현재 상태를 결정할 수 있을 때',
      '"n번째 계단에 도달하는 방법 수" 같은 카운팅 문제',
      '배열에서 최대/최소 비용 경로를 구할 때',
      '"이전 선택에 따라 현재 선택이 제한되는" 문제',
    ],
    approach: [
      '상태 정의: dp[i]가 무엇을 의미하는지 명확히 정의',
      '점화식 도출: dp[i]를 dp[i-1], dp[i-2] 등으로 표현',
      '기저 조건 설정: dp[0], dp[1] 등 초기값 할당',
      '반복문으로 작은 문제부터 큰 문제까지 채우기 (Bottom-Up)',
      '공간 최적화: 이전 1~2개만 필요하면 변수로 대체',
    ],
    timeComplexity: 'O(n)',
    spaceComplexity: 'O(n) → O(1) 최적화 가능',
    pseudocode: `# 계단 오르기: 1칸 or 2칸씩 올라가는 방법 수
def climb_stairs(n):
    if n <= 2:
        return n
    prev2, prev1 = 1, 2  # dp[1]=1, dp[2]=2
    for i in range(3, n + 1):
        curr = prev1 + prev2  # dp[i] = dp[i-1] + dp[i-2]
        prev2, prev1 = prev1, curr
    return prev1

# 도둑 문제: 인접한 집을 털 수 없을 때 최대 금액
def house_robber(nums):
    prev2, prev1 = 0, 0
    for num in nums:
        curr = max(prev1, prev2 + num)  # 안 털기 vs 털기
        prev2, prev1 = prev1, curr
    return prev1`,
    examples: [
      { name: 'Climbing Stairs', difficulty: 'easy', hint: 'dp[i] = dp[i-1] + dp[i-2], 피보나치와 동일합니다' },
      { name: 'House Robber', difficulty: 'medium', hint: '각 집에서 "털기 vs 안 털기" 두 선택지의 최대값을 유지하세요' },
      { name: 'Coin Change', difficulty: 'medium', hint: 'dp[amount] = min(dp[amount], dp[amount-coin] + 1)로 최소 동전 수를 구하세요' },
    ],
    commonMistakes: [
      '기저 조건(dp[0])을 잘못 설정하여 전체 결과가 틀리는 실수',
      'Top-Down에서 메모이제이션을 빼먹어 시간 초과 발생',
      '공간 최적화 시 갱신 순서를 잘못 정해 덮어쓰기가 발생하는 실수',
    ],
    relatedPatterns: ['dp-2d', 'knapsack', 'greedy'],
    tip: 'DP 문제를 풀 때 "상태 정의 → 점화식 → 기저 조건" 3단계를 면접관에게 순서대로 설명하세요. 구현 전에 이 흐름을 보여주면 높은 점수를 받습니다.',
  },
  {
    id: 'dp-2d',
    name: '2차원 DP',
    nameEn: '2D Dynamic Programming',
    category: 'dp',
    difficulty: 'hard',
    description: '두 개의 상태 변수(i, j)로 정의되는 DP입니다. 격자 경로, 두 문자열 비교, 부분 구간 등의 문제에서 사용되며, 2차원 테이블을 채워가는 방식으로 풀이합니다.',
    whenToUse: [
      '격자(grid)에서 최단 경로나 경우의 수를 구할 때',
      '두 문자열 사이의 관계를 분석할 때 (LCS, 편집 거리)',
      '구간 [i, j]에 대한 최적값을 구할 때',
      '배낭 문제처럼 아이템과 용량 두 변수가 있을 때',
    ],
    approach: [
      '상태 정의: dp[i][j]의 의미를 두 변수로 명확히 정의',
      '점화식: dp[i][j]를 인접 상태(dp[i-1][j], dp[i][j-1] 등)로 표현',
      '기저 조건: 첫 행, 첫 열 또는 빈 문자열 케이스 초기화',
      '순회 방향 결정: 왼쪽→오른쪽, 위→아래 (의존 관계에 따라)',
      '테이블을 채우고 dp[m][n]에서 답을 추출',
      '공간 최적화: 이전 행만 필요하면 1차원 배열로 축소 가능',
    ],
    timeComplexity: 'O(m * n)',
    spaceComplexity: 'O(m * n) → O(min(m, n)) 최적화 가능',
    pseudocode: `# 최장 공통 부분 수열 (LCS)
def lcs(text1, text2):
    m, n = len(text1), len(text2)
    dp = [[0] * (n + 1) for _ in range(m + 1)]
    for i in range(1, m + 1):
        for j in range(1, n + 1):
            if text1[i-1] == text2[j-1]:
                dp[i][j] = dp[i-1][j-1] + 1  # 문자 일치
            else:
                dp[i][j] = max(dp[i-1][j], dp[i][j-1])  # 스킵
    return dp[m][n]`,
    examples: [
      { name: 'Unique Paths', difficulty: 'medium', hint: 'dp[i][j] = dp[i-1][j] + dp[i][j-1], 위쪽과 왼쪽에서 오는 경우의 수' },
      { name: 'Longest Common Subsequence', difficulty: 'medium', hint: '문자가 같으면 대각선+1, 다르면 위/왼 중 최대값' },
      { name: 'Edit Distance', difficulty: 'hard', hint: '삽입/삭제/교체 3가지 연산의 최소값 + 1을 점화식으로 세우세요' },
    ],
    commonMistakes: [
      '인덱스 오프바이원: dp 테이블 크기를 (m+1)*(n+1)로 잡아야 함',
      '순회 방향을 잘못 설정하여 아직 계산되지 않은 값을 참조하는 실수',
      'LCS에서 "부분 문자열"과 "부분 수열"을 혼동하는 실수 (연속 vs 비연속)',
    ],
    relatedPatterns: ['dp-1d', 'knapsack', 'string-matching'],
    tip: '2D DP의 점화식은 "테이블 한 칸을 어떻게 채우는가"를 그림으로 그려보면 쉽게 도출됩니다. 면접에서 작은 예시로 테이블을 직접 그리며 설명하세요.',
  },
  {
    id: 'knapsack',
    name: '배낭 문제',
    nameEn: 'Knapsack Problem',
    category: 'dp',
    difficulty: 'hard',
    description: '제한된 용량(무게, 금액 등) 내에서 가치를 최대화하는 선택 문제입니다. 0/1 배낭(각 아이템 한 번)과 완전 배낭(무한 사용)으로 나뉘며, 부분집합 합(Subset Sum)도 변형입니다.',
    whenToUse: [
      '제한된 자원 내에서 최대 가치를 구해야 할 때',
      '부분집합의 합이 특정 값이 되는지 판단할 때',
      '아이템을 선택/비선택하는 이진 결정 문제',
      '동전 교환(완전 배낭 변형)으로 최소 개수를 구할 때',
    ],
    approach: [
      '상태 정의: dp[i][w] = i번째 아이템까지 고려, 용량 w일 때의 최대 가치',
      '선택지: 현재 아이템을 넣거나(dp[i-1][w-weight] + value) 안 넣거나(dp[i-1][w])',
      '0/1 배낭: 역방향 순회 (w를 큰 값에서 작은 값으로)',
      '완전 배낭: 정방향 순회 (같은 아이템 여러 번 사용 가능)',
      '1차원 배열로 공간 최적화',
    ],
    timeComplexity: 'O(n * W)',
    spaceComplexity: 'O(W)',
    pseudocode: `# 0/1 배낭: 각 아이템 최대 1번
def knapsack_01(weights, values, capacity):
    dp = [0] * (capacity + 1)
    for i in range(len(weights)):
        # 역방향 순회 (같은 아이템 중복 사용 방지)
        for w in range(capacity, weights[i] - 1, -1):
            dp[w] = max(dp[w], dp[w - weights[i]] + values[i])
    return dp[capacity]

# 완전 배낭 (동전 교환): 아이템 무한 사용
def coin_change(coins, amount):
    dp = [float('inf')] * (amount + 1)
    dp[0] = 0
    for coin in coins:
        for w in range(coin, amount + 1):  # 정방향!
            dp[w] = min(dp[w], dp[w - coin] + 1)
    return dp[amount] if dp[amount] != float('inf') else -1`,
    examples: [
      { name: '0/1 Knapsack', difficulty: 'medium', hint: '각 아이템에 대해 "넣기 vs 안 넣기"를 결정하고, 역순으로 dp를 갱신하세요' },
      { name: 'Partition Equal Subset Sum', difficulty: 'medium', hint: '전체 합의 절반을 target으로 두고, 부분집합 합 문제로 변환하세요' },
      { name: 'Target Sum', difficulty: 'medium', hint: '양수 그룹과 음수 그룹으로 나누면 부분집합 합 문제가 됩니다' },
    ],
    commonMistakes: [
      '0/1 배낭에서 정방향 순회하여 같은 아이템을 중복 사용하는 치명적 실수',
      'dp 배열 초기화를 잘못하여 "불가능" 상태를 구분하지 못하는 실수',
      'Subset Sum 변환 시 전체 합이 홀수인 경우 불가능함을 처리하지 않는 실수',
    ],
    relatedPatterns: ['dp-1d', 'dp-2d', 'greedy'],
    tip: '0/1 배낭은 역순, 완전 배낭은 정순 순회 — 이 차이를 면접에서 설명할 수 있으면 DP를 깊이 이해하고 있다는 증거입니다.',
  },

  // ── Design/Technique ─────────────────────────────────────────
  {
    id: 'stack-queue',
    name: '스택/큐 활용',
    nameEn: 'Stack/Queue Pattern',
    category: 'design',
    difficulty: 'medium',
    description: '스택(LIFO)과 큐(FIFO)의 특성을 활용하여 괄호 매칭, 단조 스택(Monotonic Stack), 히스토리 관리 등을 효율적으로 처리하는 기법입니다. 특히 단조 스택은 "다음으로 큰/작은 원소" 문제의 핵심입니다.',
    whenToUse: [
      '괄호/태그의 매칭 여부를 확인해야 할 때',
      '"다음으로 큰 원소(Next Greater Element)"를 찾아야 할 때 (단조 스택)',
      '히스토그램에서 최대 직사각형 넓이를 구할 때',
      '실행 취소(Undo)/되돌리기 기능을 구현할 때',
    ],
    approach: [
      '스택을 초기화하고 배열/문자열을 순회',
      '괄호 매칭: 여는 괄호는 push, 닫는 괄호는 pop하여 짝 확인',
      '단조 스택: 현재 값이 스택 top보다 크면 pop하며 결과 기록',
      '인덱스를 스택에 저장하면 거리/간격 계산이 용이',
      '순회 후 스택에 남은 요소 처리 (결과 없음 = -1 등)',
    ],
    timeComplexity: 'O(n)',
    spaceComplexity: 'O(n)',
    pseudocode: `# 다음으로 따뜻한 날까지의 일수
def daily_temperatures(temps):
    n = len(temps)
    result = [0] * n
    stack = []  # 인덱스 저장 (단조 감소 스택)
    for i in range(n):
        while stack and temps[i] > temps[stack[-1]]:
            prev = stack.pop()
            result[prev] = i - prev  # 일수 차이
        stack.append(i)
    return result

# 괄호 유효성 검사
def is_valid(s):
    stack = []
    pairs = {')': '(', '}': '{', ']': '['}
    for ch in s:
        if ch in pairs:
            if not stack or stack[-1] != pairs[ch]:
                return False
            stack.pop()
        else:
            stack.append(ch)
    return len(stack) == 0`,
    examples: [
      { name: 'Valid Parentheses', difficulty: 'easy', hint: '여는 괄호는 push, 닫는 괄호는 pop하여 짝이 맞는지 확인하세요' },
      { name: 'Daily Temperatures', difficulty: 'medium', hint: '인덱스를 스택에 넣고, 더 따뜻한 날이 오면 pop하며 일수를 계산하세요' },
      { name: 'Sliding Window Maximum', difficulty: 'hard', hint: '단조 감소 덱(Deque)으로 윈도우 내 최대값의 인덱스를 유지하세요' },
    ],
    commonMistakes: [
      '빈 스택에서 pop을 시도하는 실수 (is_empty 체크 필요)',
      '단조 스택에서 값 대신 인덱스를 저장해야 하는 경우를 놓치는 실수',
      'Sliding Window Maximum에서 덱(Deque)이 아닌 일반 스택을 사용하는 실수',
    ],
    relatedPatterns: ['sliding-window', 'bfs'],
    tip: '"다음으로 큰 원소" 패턴은 스택으로 O(n)에 풀 수 있습니다. 면접에서 브루트포스 O(n²) → 스택 O(n) 최적화 과정을 보여주면 인상적입니다.',
  },
  {
    id: 'greedy',
    name: '그리디',
    nameEn: 'Greedy Algorithm',
    category: 'design',
    difficulty: 'medium',
    description: '매 순간 가장 최적인 선택을 하여 전체 최적해를 구하는 기법입니다. DP와 달리 이전 선택을 재고하지 않으며, "지역 최적 = 전역 최적"이 성립할 때만 사용 가능합니다. 증명이 중요합니다.',
    whenToUse: [
      '현재 선택이 미래 선택에 영향을 주지 않을 때 (탐욕 선택 속성)',
      '최소 개수의 동전, 최대 활동 수 등 최적화 문제',
      '정렬 후 앞에서부터 탐욕적으로 선택하는 것이 자연스러울 때',
      '문제가 "가장 많이", "가장 적게" 등을 요구할 때',
    ],
    approach: [
      '그리디 전략 결정: 어떤 기준으로 선택할지 정의',
      '그 전략이 최적해를 보장하는지 반례로 검증',
      '데이터를 그리디 기준으로 정렬',
      '앞에서부터 순서대로 탐욕적 선택 수행',
      '선택 조건을 만족하면 결과에 추가, 아니면 건너뛰기',
    ],
    timeComplexity: 'O(n log n) (정렬 포함)',
    spaceComplexity: 'O(1) ~ O(n)',
    pseudocode: `# 점프 게임: 각 위치에서 최대 점프 거리가 주어질 때 끝에 도달 가능?
def can_jump(nums):
    max_reach = 0  # 현재까지 도달 가능한 최대 위치
    for i in range(len(nums)):
        if i > max_reach:
            return False  # 여기까지 도달 불가
        max_reach = max(max_reach, i + nums[i])
    return True

# 활동 선택: 겹치지 않는 최대 활동 수
def activity_selection(activities):
    activities.sort(key=lambda x: x[1])  # 종료 시간 기준 정렬
    count, end = 0, 0
    for start, finish in activities:
        if start >= end:  # 이전 활동 이후 시작
            count += 1
            end = finish
    return count`,
    examples: [
      { name: 'Jump Game', difficulty: 'medium', hint: '현재까지의 최대 도달 거리를 갱신하며, i가 이를 넘으면 불가' },
      { name: 'Activity Selection', difficulty: 'medium', hint: '종료 시간이 빠른 순으로 정렬하고, 겹치지 않는 것만 선택하세요' },
      { name: 'Huffman Coding', difficulty: 'hard', hint: '빈도가 가장 낮은 두 노드를 합치는 과정을 최소 힙으로 반복하세요' },
    ],
    commonMistakes: [
      '그리디가 최적해를 보장하지 않는 문제에 그리디를 적용하는 실수 (DP가 필요한 경우)',
      '정렬 기준을 잘못 설정하는 실수 (시작 시간 vs 종료 시간)',
      '반례를 확인하지 않고 그리디 전략을 확정하는 실수',
    ],
    relatedPatterns: ['interval-merge', 'dp-1d', 'knapsack'],
    tip: '그리디 문제의 핵심은 "왜 이 전략이 최적인가"를 설명하는 것입니다. 면접에서 "교환 논증(exchange argument)"으로 간단히 증명할 수 있으면 최고입니다.',
  },
]
