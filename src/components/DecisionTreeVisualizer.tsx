'use client'

import { useState, useCallback, useRef, useEffect, useMemo } from 'react'
import {
  TreeDeciduous, Play, SkipForward, RotateCcw, ChevronDown, ChevronUp,
  Plus, Trash2, BookOpen, BarChart3, Table2,
} from 'lucide-react'

// ─── Types ───────────────────────────────────────────────────────────────────
type Row = Record<string, string>
type SplitCriterion = 'entropy' | 'gini'

interface TreeNode {
  id: number
  feature?: string
  value?: string
  label?: string
  classCounts: Record<string, number>
  samples: number
  impurity: number
  infoGain?: number
  children: TreeNode[]
  depth: number
  isLeaf: boolean
}

interface DataSet {
  name: string
  features: string[]
  labelCol: string
  rows: Row[]
}

// ─── Preset Datasets ─────────────────────────────────────────────────────────
const WEATHER_DATA: DataSet = {
  name: '날씨 데이터 (테니스)',
  features: ['전망', '온도', '습도', '바람'],
  labelCol: '운동',
  rows: [
    { '전망': '맑음', '온도': '높음', '습도': '높음', '바람': '약함', '운동': 'No' },
    { '전망': '맑음', '온도': '높음', '습도': '높음', '바람': '강함', '운동': 'No' },
    { '전망': '흐림', '온도': '높음', '습도': '높음', '바람': '약함', '운동': 'Yes' },
    { '전망': '비', '온도': '보통', '습도': '높음', '바람': '약함', '운동': 'Yes' },
    { '전망': '비', '온도': '낮음', '습도': '보통', '바람': '약함', '운동': 'Yes' },
    { '전망': '비', '온도': '낮음', '습도': '보통', '바람': '강함', '운동': 'No' },
    { '전망': '흐림', '온도': '낮음', '습도': '보통', '바람': '강함', '운동': 'Yes' },
    { '전망': '맑음', '온도': '보통', '습도': '높음', '바람': '약함', '운동': 'No' },
    { '전망': '맑음', '온도': '낮음', '습도': '보통', '바람': '약함', '운동': 'Yes' },
    { '전망': '비', '온도': '보통', '습도': '보통', '바람': '약함', '운동': 'Yes' },
    { '전망': '맑음', '온도': '보통', '습도': '보통', '바람': '강함', '운동': 'Yes' },
    { '전망': '흐림', '온도': '보통', '습도': '높음', '바람': '강함', '운동': 'Yes' },
    { '전망': '흐림', '온도': '높음', '습도': '보통', '바람': '약함', '운동': 'Yes' },
    { '전망': '비', '온도': '보통', '습도': '높음', '바람': '강함', '운동': 'No' },
  ],
}

const TITANIC_DATA: DataSet = {
  name: '타이타닉 간소화',
  features: ['등급', '나이', '성별'],
  labelCol: '생존',
  rows: [
    { '등급': '1등', '나이': '성인', '성별': '여', '생존': 'Yes' },
    { '등급': '1등', '나이': '성인', '성별': '남', '생존': 'Yes' },
    { '등급': '1등', '나이': '아이', '성별': '여', '생존': 'Yes' },
    { '등급': '1등', '나이': '아이', '성별': '남', '생존': 'Yes' },
    { '등급': '2등', '나이': '성인', '성별': '여', '생존': 'Yes' },
    { '등급': '2등', '나이': '성인', '성별': '남', '생존': 'No' },
    { '등급': '2등', '나이': '아이', '성별': '여', '생존': 'Yes' },
    { '등급': '2등', '나이': '아이', '성별': '남', '생존': 'Yes' },
    { '등급': '3등', '나이': '성인', '성별': '여', '생존': 'No' },
    { '등급': '3등', '나이': '성인', '성별': '남', '생존': 'No' },
    { '등급': '3등', '나이': '아이', '성별': '여', '생존': 'No' },
    { '등급': '3등', '나이': '아이', '성별': '남', '생존': 'No' },
    { '등급': '3등', '나이': '성인', '성별': '남', '생존': 'No' },
    { '등급': '3등', '나이': '성인', '성별': '여', '생존': 'Yes' },
  ],
}

const FRUIT_DATA: DataSet = {
  name: '과일 분류',
  features: ['색상', '크기', '무게'],
  labelCol: '과일',
  rows: [
    { '색상': '빨강', '크기': '큰', '무게': '무거움', '과일': '사과' },
    { '색상': '빨강', '크기': '작은', '무게': '가벼움', '과일': '사과' },
    { '색상': '주황', '크기': '큰', '무게': '무거움', '과일': '오렌지' },
    { '색상': '주황', '크기': '작은', '무게': '가벼움', '과일': '오렌지' },
    { '색상': '노랑', '크기': '큰', '무게': '무거움', '과일': '바나나' },
    { '색상': '노랑', '크기': '작은', '무게': '가벼움', '과일': '바나나' },
    { '색상': '빨강', '크기': '큰', '무게': '가벼움', '과일': '사과' },
    { '색상': '주황', '크기': '큰', '무게': '가벼움', '과일': '오렌지' },
    { '색상': '노랑', '크기': '큰', '무게': '가벼움', '과일': '바나나' },
    { '색상': '빨강', '크기': '작은', '무게': '무거움', '과일': '사과' },
    { '색상': '주황', '크기': '작은', '무게': '무거움', '과일': '오렌지' },
    { '색상': '노랑', '크기': '작은', '무게': '무거움', '과일': '바나나' },
  ],
}

const PRESETS: DataSet[] = [WEATHER_DATA, TITANIC_DATA, FRUIT_DATA]

// ─── Decision Tree Algorithm ─────────────────────────────────────────────────
function countClasses(rows: Row[], labelCol: string): Record<string, number> {
  const counts: Record<string, number> = {}
  for (const r of rows) {
    const c = r[labelCol]
    counts[c] = (counts[c] || 0) + 1
  }
  return counts
}

function entropy(rows: Row[], labelCol: string): number {
  const counts = countClasses(rows, labelCol)
  const total = rows.length
  if (total === 0) return 0
  let ent = 0
  for (const c of Object.values(counts)) {
    const p = c / total
    if (p > 0) ent -= p * Math.log2(p)
  }
  return ent
}

function giniIndex(rows: Row[], labelCol: string): number {
  const counts = countClasses(rows, labelCol)
  const total = rows.length
  if (total === 0) return 0
  let sum = 0
  for (const c of Object.values(counts)) {
    const p = c / total
    sum += p * p
  }
  return 1 - sum
}

function impurityFn(rows: Row[], labelCol: string, criterion: SplitCriterion): number {
  return criterion === 'entropy' ? entropy(rows, labelCol) : giniIndex(rows, labelCol)
}

function uniqueValues(rows: Row[], feature: string): string[] {
  return [...new Set(rows.map(r => r[feature]))]
}

function splitByFeature(rows: Row[], feature: string): Record<string, Row[]> {
  const groups: Record<string, Row[]> = {}
  for (const r of rows) {
    const v = r[feature]
    if (!groups[v]) groups[v] = []
    groups[v].push(r)
  }
  return groups
}

function bestSplit(
  rows: Row[], features: string[], labelCol: string, criterion: SplitCriterion,
): { feature: string; gain: number } | null {
  if (features.length === 0 || rows.length === 0) return null
  const parentImpurity = impurityFn(rows, labelCol, criterion)
  let best: { feature: string; gain: number } | null = null

  for (const feat of features) {
    const groups = splitByFeature(rows, feat)
    let weightedImpurity = 0
    for (const subset of Object.values(groups)) {
      weightedImpurity += (subset.length / rows.length) * impurityFn(subset, labelCol, criterion)
    }
    const gain = parentImpurity - weightedImpurity
    if (best === null || gain > best.gain) {
      best = { feature: feat, gain }
    }
  }
  return best
}

function majorityClass(rows: Row[], labelCol: string): string {
  const counts = countClasses(rows, labelCol)
  let maxC = ''
  let maxN = 0
  for (const [c, n] of Object.entries(counts)) {
    if (n > maxN) { maxC = c; maxN = n }
  }
  return maxC
}

let nodeIdCounter = 0

function buildTree(
  rows: Row[], features: string[], labelCol: string,
  criterion: SplitCriterion, maxDepth: number, depth: number,
): TreeNode {
  const id = nodeIdCounter++
  const classCounts = countClasses(rows, labelCol)
  const imp = impurityFn(rows, labelCol, criterion)
  const classValues = Object.keys(classCounts)

  // Leaf conditions
  if (classValues.length <= 1 || depth >= maxDepth || features.length === 0) {
    return {
      id, label: majorityClass(rows, labelCol), classCounts,
      samples: rows.length, impurity: imp, depth, isLeaf: true, children: [],
    }
  }

  const split = bestSplit(rows, features, labelCol, criterion)
  if (!split || split.gain <= 0) {
    return {
      id, label: majorityClass(rows, labelCol), classCounts,
      samples: rows.length, impurity: imp, depth, isLeaf: true, children: [],
    }
  }

  const groups = splitByFeature(rows, split.feature)
  const remainingFeatures = features.filter(f => f !== split.feature)
  const children: TreeNode[] = []

  for (const [val, subset] of Object.entries(groups)) {
    const child = buildTree(subset, remainingFeatures, labelCol, criterion, maxDepth, depth + 1)
    child.value = val
    children.push(child)
  }

  return {
    id, feature: split.feature, classCounts, samples: rows.length,
    impurity: imp, infoGain: split.gain, depth, isLeaf: false, children,
  }
}

// Step-by-step build: returns array of partial trees
function buildTreeSteps(
  rows: Row[], features: string[], labelCol: string,
  criterion: SplitCriterion, maxDepth: number,
): TreeNode[] {
  const steps: TreeNode[] = []
  nodeIdCounter = 0

  // Step 0: root only (as leaf)
  const rootCounts = countClasses(rows, labelCol)
  const rootImp = impurityFn(rows, labelCol, criterion)
  steps.push({
    id: 0, classCounts: rootCounts, samples: rows.length,
    impurity: rootImp, depth: 0, isLeaf: true, children: [],
    label: majorityClass(rows, labelCol),
  })

  // Now build iteratively level by level
  function expandNode(
    node: TreeNode, nodeRows: Row[], availFeatures: string[],
  ): boolean {
    if (node.isLeaf && Object.keys(node.classCounts).length > 1
        && node.depth < maxDepth && availFeatures.length > 0) {
      const split = bestSplit(nodeRows, availFeatures, labelCol, criterion)
      if (split && split.gain > 0) {
        node.feature = split.feature
        node.infoGain = split.gain
        node.isLeaf = false
        node.label = undefined
        const groups = splitByFeature(nodeRows, split.feature)
        const remaining = availFeatures.filter(f => f !== split.feature)
        node.children = []
        for (const [val, subset] of Object.entries(groups)) {
          nodeIdCounter++
          const childCounts = countClasses(subset, labelCol)
          const childImp = impurityFn(subset, labelCol, criterion)
          const child: TreeNode = {
            id: nodeIdCounter, value: val, classCounts: childCounts,
            samples: subset.length, impurity: childImp, depth: node.depth + 1,
            isLeaf: true, children: [], label: majorityClass(subset, labelCol),
          }
          node.children.push(child)
        }
        return true
      }
    }
    return false
  }

  // BFS expansion
  type QueueItem = { node: TreeNode; rows: Row[]; features: string[] }
  const queue: QueueItem[] = [{ node: steps[0], rows, features }]

  while (queue.length > 0) {
    const item = queue.shift()!
    const snap = JSON.parse(JSON.stringify(steps[0])) as TreeNode

    if (expandNode(item.node, item.rows, item.features)) {
      steps.push(JSON.parse(JSON.stringify(steps[0])) as TreeNode)
      // Enqueue children
      const groups = splitByFeature(item.rows, item.node.feature!)
      const remaining = item.features.filter(f => f !== item.node.feature)
      for (const child of item.node.children) {
        const subset = groups[child.value!] || []
        queue.push({ node: child, rows: subset, features: remaining })
      }
    }
  }

  return steps
}

// ─── Tree stats ──────────────────────────────────────────────────────────────
function treeDepth(node: TreeNode): number {
  if (node.isLeaf) return 0
  return 1 + Math.max(...node.children.map(treeDepth))
}

function nodeCount(node: TreeNode): number {
  return 1 + node.children.reduce((s, c) => s + nodeCount(c), 0)
}

function leafCount(node: TreeNode): number {
  if (node.isLeaf) return 1
  return node.children.reduce((s, c) => s + leafCount(c), 0)
}

function treeAccuracy(tree: TreeNode, rows: Row[], features: string[], labelCol: string): number {
  let correct = 0
  for (const row of rows) {
    let node = tree
    while (!node.isLeaf) {
      const val = row[node.feature!]
      const child = node.children.find(c => c.value === val)
      if (!child) break
      node = child
    }
    if (node.label === row[labelCol]) correct++
  }
  return rows.length > 0 ? correct / rows.length : 0
}

// ─── Canvas Drawing ──────────────────────────────────────────────────────────
const CLASS_COLORS: Record<string, string> = {}
const COLOR_PALETTE = [
  '#3b82f6', '#ef4444', '#22c55e', '#f59e0b', '#8b5cf6',
  '#ec4899', '#06b6d4', '#f97316', '#14b8a6', '#6366f1',
]
let colorIdx = 0

function getClassColor(cls: string): string {
  if (!CLASS_COLORS[cls]) {
    CLASS_COLORS[cls] = COLOR_PALETTE[colorIdx % COLOR_PALETTE.length]
    colorIdx++
  }
  return CLASS_COLORS[cls]
}

function resetClassColors() {
  for (const k of Object.keys(CLASS_COLORS)) delete CLASS_COLORS[k]
  colorIdx = 0
}

interface NodeLayout {
  node: TreeNode
  x: number
  y: number
  w: number
  h: number
}

function layoutTree(root: TreeNode, canvasW: number): NodeLayout[] {
  const layouts: NodeLayout[] = []
  const nodeW = 140
  const nodeH = 60
  const levelH = 100
  const padding = 20

  // Count leaves per subtree for proportional spacing
  function leafSpan(n: TreeNode): number {
    if (n.isLeaf) return 1
    return n.children.reduce((s, c) => s + leafSpan(c), 0)
  }

  function layout(n: TreeNode, left: number, right: number, depth: number) {
    const x = (left + right) / 2
    const y = padding + depth * levelH
    layouts.push({ node: n, x, y, w: nodeW, h: nodeH })

    if (!n.isLeaf && n.children.length > 0) {
      const totalLeaves = leafSpan(n)
      let cursor = left
      for (const child of n.children) {
        const span = leafSpan(child)
        const childRight = cursor + (right - left) * (span / totalLeaves)
        layout(child, cursor, childRight, depth + 1)
        cursor = childRight
      }
    }
  }

  layout(root, 0, canvasW, 0)
  return layouts
}

function drawTree(
  ctx: CanvasRenderingContext2D, layouts: NodeLayout[],
  dpr: number, isDark: boolean, highlightId: number | null,
) {
  const scale = dpr
  ctx.save()
  ctx.scale(scale, scale)

  // Clear
  ctx.clearRect(0, 0, ctx.canvas.width / scale, ctx.canvas.height / scale)

  // Draw edges first
  for (const l of layouts) {
    if (!l.node.isLeaf) {
      for (const child of l.node.children) {
        const childLayout = layouts.find(cl => cl.node.id === child.id)
        if (childLayout) {
          ctx.beginPath()
          ctx.moveTo(l.x, l.y + l.h / 2)
          ctx.lineTo(childLayout.x, childLayout.y - childLayout.h / 2)
          ctx.strokeStyle = isDark ? '#6b7280' : '#9ca3af'
          ctx.lineWidth = 1.5
          ctx.stroke()

          // Edge label (value)
          if (child.value) {
            const mx = (l.x + childLayout.x) / 2
            const my = (l.y + l.h / 2 + childLayout.y - childLayout.h / 2) / 2
            ctx.font = '11px sans-serif'
            ctx.textAlign = 'center'
            ctx.fillStyle = isDark ? '#d1d5db' : '#4b5563'
            const metrics = ctx.measureText(child.value)
            const pad = 4
            ctx.fillStyle = isDark ? 'rgba(31,41,55,0.85)' : 'rgba(255,255,255,0.85)'
            ctx.fillRect(mx - metrics.width / 2 - pad, my - 7 - pad, metrics.width + pad * 2, 14 + pad * 2)
            ctx.fillStyle = isDark ? '#93c5fd' : '#2563eb'
            ctx.fillText(child.value, mx, my + 4)
          }
        }
      }
    }
  }

  // Draw nodes
  for (const l of layouts) {
    const { node, x, y, w, h } = l
    const rx = x - w / 2
    const ry = y - h / 2
    const radius = 8
    const isHighlighted = highlightId !== null && node.id === highlightId

    // Background
    ctx.beginPath()
    ctx.roundRect(rx, ry, w, h, radius)

    if (node.isLeaf) {
      const majorClass = node.label || ''
      const color = getClassColor(majorClass)
      ctx.fillStyle = isHighlighted
        ? (isDark ? color + 'cc' : color + '33')
        : (isDark ? color + '44' : color + '1a')
      ctx.fill()
      ctx.strokeStyle = color
      ctx.lineWidth = isHighlighted ? 3 : 1.5
      ctx.stroke()
    } else {
      ctx.fillStyle = isHighlighted
        ? (isDark ? '#374151' : '#fef9c3')
        : (isDark ? '#1f2937' : '#ffffff')
      ctx.fill()
      ctx.strokeStyle = isHighlighted
        ? '#f59e0b'
        : (isDark ? '#4b5563' : '#d1d5db')
      ctx.lineWidth = isHighlighted ? 3 : 1.5
      ctx.stroke()
    }

    // Highlight glow
    if (isHighlighted) {
      ctx.save()
      ctx.shadowColor = '#f59e0b'
      ctx.shadowBlur = 12
      ctx.beginPath()
      ctx.roundRect(rx, ry, w, h, radius)
      ctx.stroke()
      ctx.restore()
    }

    // Text
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    if (node.isLeaf) {
      ctx.font = 'bold 13px sans-serif'
      ctx.fillStyle = isDark ? '#f9fafb' : '#111827'
      ctx.fillText(node.label || '?', x, y - 8)
      ctx.font = '10px sans-serif'
      ctx.fillStyle = isDark ? '#9ca3af' : '#6b7280'
      const countsStr = Object.entries(node.classCounts).map(([k, v]) => `${k}:${v}`).join(' ')
      ctx.fillText(countsStr, x, y + 8)
      ctx.fillText(`n=${node.samples}`, x, y + 20)
    } else {
      ctx.font = 'bold 12px sans-serif'
      ctx.fillStyle = isDark ? '#f9fafb' : '#111827'
      ctx.fillText(node.feature || '', x, y - 10)
      ctx.font = '10px sans-serif'
      ctx.fillStyle = isDark ? '#9ca3af' : '#6b7280'
      ctx.fillText(`불순도: ${node.impurity.toFixed(3)}`, x, y + 4)
      if (node.infoGain !== undefined) {
        ctx.fillStyle = isDark ? '#86efac' : '#16a34a'
        ctx.fillText(`이득: ${node.infoGain.toFixed(3)}`, x, y + 18)
      }
    }
  }

  ctx.restore()
}

// ─── Guide content ───────────────────────────────────────────────────────────
interface GuideItem {
  title: string
  content: string[] | { q: string; a: string }[]
}

const GUIDE_SECTIONS: GuideItem[] = [
  {
    title: '의사결정 트리란?',
    content: [
      '의사결정 트리(Decision Tree)는 데이터를 특성(feature)에 따라 순차적으로 분할하여 분류하거나 예측하는 지도학습 알고리즘입니다.',
      '나무를 뒤집은 구조로, 루트 노드에서 시작하여 각 분기(branch)를 따라 내려가며 최종 잎(leaf) 노드에서 결과를 반환합니다.',
      'ID3, C4.5, CART 등의 알고리즘이 대표적이며, Random Forest와 Gradient Boosting의 기초가 됩니다.',
    ],
  },
  {
    title: '엔트로피 vs 지니 계수',
    content: [
      '엔트로피(Entropy): 정보 이론 기반, H = -Σ p(i)·log₂(p(i)). 불확실성이 클수록 값이 높음 (최대 log₂(클래스 수)).',
      '지니 계수(Gini Index): G = 1 - Σ p(i)². 계산이 빠르고, scikit-learn의 기본 기준. 최대값 1 - 1/클래스수.',
      '정보 이득(Information Gain) = 부모 불순도 - Σ(자식 비율 × 자식 불순도). 이 값이 가장 큰 특성으로 분할.',
      '실무에서 두 기준의 결과 차이는 2% 미만 — 보통 지니 계수를 사용합니다.',
    ],
  },
  {
    title: '과적합 방지 (가지치기)',
    content: [
      '사전 가지치기(Pre-pruning): 최대 깊이, 최소 샘플 수, 최소 정보 이득 등을 제한하여 트리가 과도하게 자라는 것을 방지.',
      '사후 가지치기(Post-pruning): 완전한 트리를 먼저 만든 후, 검증 데이터 기반으로 불필요한 가지를 제거.',
      '이 도구에서 "최대 깊이" 슬라이더를 조절하여 깊이 1~5에 따른 트리 변화를 직접 비교해 보세요.',
      '앙상블 방법(Random Forest, XGBoost)은 다수의 트리를 결합하여 과적합을 자연스럽게 줄입니다.',
    ],
  },
  {
    title: '사용 방법',
    content: [
      '1. 프리셋 데이터를 선택하거나 직접 테이블을 편집하세요.',
      '2. 분할 기준(엔트로피/지니)과 최대 깊이를 설정합니다.',
      '3. "트리 생성" 버튼으로 전체 트리를 한 번에 구축합니다.',
      '4. "1단계" 버튼으로 노드가 하나씩 분할되는 과정을 관찰합니다.',
      '5. 트리 시각화에서 각 노드의 불순도, 정보 이득, 샘플 수를 확인하세요.',
    ],
  },
]

const FAQ_ITEMS = [
  { q: '의사결정 트리는 수치형 데이터도 처리할 수 있나요?', a: '네. CART 알고리즘은 수치형 특성에 대해 "나이 > 30"과 같은 이진 분할을 수행합니다. 이 도구는 범주형(categorical) 데이터에 초점을 맞추고 있으며, 수치형 데이터는 범주로 변환 후 사용하세요.' },
  { q: 'Random Forest와의 차이점은?', a: 'Random Forest는 여러 개의 의사결정 트리를 부트스트랩 샘플과 랜덤 특성 선택으로 만들고 다수결로 결과를 정합니다. 단일 트리보다 과적합이 적고 정확도가 높지만, 해석이 어렵습니다.' },
  { q: '지니 계수 0은 무엇을 의미하나요?', a: '모든 샘플이 동일한 클래스에 속한다는 뜻입니다 (완전히 순수한 노드). 더 이상 분할할 필요가 없으므로 잎 노드가 됩니다.' },
]

// ─── Main Component ──────────────────────────────────────────────────────────
export default function DecisionTreeVisualizer() {
  const [dataset, setDataset] = useState<DataSet>(WEATHER_DATA)
  const [rows, setRows] = useState<Row[]>(WEATHER_DATA.rows)
  const [features, setFeatures] = useState<string[]>(WEATHER_DATA.features)
  const [labelCol, setLabelCol] = useState(WEATHER_DATA.labelCol)
  const [criterion, setCriterion] = useState<SplitCriterion>('entropy')
  const [maxDepth, setMaxDepth] = useState(3)
  const [tree, setTree] = useState<TreeNode | null>(null)
  const [steps, setSteps] = useState<TreeNode[]>([])
  const [stepIdx, setStepIdx] = useState(-1)
  const [highlightId, setHighlightId] = useState<number | null>(null)
  const [showTable, setShowTable] = useState(true)
  const [showGuide, setShowGuide] = useState(false)
  const [openGuideIdx, setOpenGuideIdx] = useState<number | null>(null)

  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  const selectPreset = useCallback((idx: number) => {
    const ds = PRESETS[idx]
    setDataset(ds)
    setRows([...ds.rows])
    setFeatures([...ds.features])
    setLabelCol(ds.labelCol)
    setTree(null)
    setSteps([])
    setStepIdx(-1)
    setHighlightId(null)
    resetClassColors()
  }, [])

  const handleBuild = useCallback(() => {
    resetClassColors()
    nodeIdCounter = 0
    const t = buildTree(rows, features, labelCol, criterion, maxDepth, 0)
    setTree(t)
    setSteps([])
    setStepIdx(-1)
    setHighlightId(null)
  }, [rows, features, labelCol, criterion, maxDepth])

  const handleStepBuild = useCallback(() => {
    if (steps.length === 0) {
      resetClassColors()
      nodeIdCounter = 0
      const s = buildTreeSteps(rows, features, labelCol, criterion, maxDepth)
      setSteps(s)
      setStepIdx(0)
      setTree(s[0])
      setHighlightId(0)
    } else {
      const next = Math.min(stepIdx + 1, steps.length - 1)
      setStepIdx(next)
      setTree(steps[next])
      // Highlight the newest nodes
      const currentNodes = new Set<number>()
      function collectIds(n: TreeNode) { currentNodes.add(n.id); n.children.forEach(collectIds) }
      collectIds(steps[next])
      if (next > 0) {
        const prevNodes = new Set<number>()
        function collectPrevIds(n: TreeNode) { prevNodes.add(n.id); n.children.forEach(collectPrevIds) }
        collectPrevIds(steps[next - 1])
        for (const id of currentNodes) {
          if (!prevNodes.has(id)) { setHighlightId(id); break }
        }
      }
    }
  }, [steps, stepIdx, rows, features, labelCol, criterion, maxDepth])

  const handleReset = useCallback(() => {
    setTree(null)
    setSteps([])
    setStepIdx(-1)
    setHighlightId(null)
  }, [])

  const updateCell = useCallback((rowIdx: number, col: string, value: string) => {
    setRows(prev => {
      const next = [...prev]
      next[rowIdx] = { ...next[rowIdx], [col]: value }
      return next
    })
  }, [])

  const addRow = useCallback(() => {
    const newRow: Row = {}
    for (const f of features) newRow[f] = ''
    newRow[labelCol] = ''
    setRows(prev => [...prev, newRow])
  }, [features, labelCol])

  const removeRow = useCallback((idx: number) => {
    setRows(prev => prev.filter((_, i) => i !== idx))
  }, [])

  // Stats
  const stats = useMemo(() => {
    if (!tree) return null
    return {
      depth: treeDepth(tree),
      nodes: nodeCount(tree),
      leaves: leafCount(tree),
      accuracy: treeAccuracy(tree, rows, features, labelCol),
    }
  }, [tree, rows, features, labelCol])

  const allCols = useMemo(() => [...features, labelCol], [features, labelCol])

  // Canvas rendering
  const isDark = typeof window !== 'undefined'
    ? document.documentElement.classList.contains('dark')
    : false

  useEffect(() => {
    if (!tree || !canvasRef.current || !containerRef.current) return
    const canvas = canvasRef.current
    const container = containerRef.current
    const dpr = window.devicePixelRatio || 1
    const w = container.clientWidth
    const depth = treeDepth(tree)
    const h = Math.max(300, (depth + 1) * 100 + 80)

    canvas.width = w * dpr
    canvas.height = h * dpr
    canvas.style.width = `${w}px`
    canvas.style.height = `${h}px`

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const layouts = layoutTree(tree, w)
    drawTree(ctx, layouts, dpr, isDark, highlightId)
  }, [tree, highlightId, isDark])

  // Re-render on resize
  useEffect(() => {
    const handleResize = () => {
      if (!tree || !canvasRef.current || !containerRef.current) return
      const canvas = canvasRef.current
      const container = containerRef.current
      const dpr = window.devicePixelRatio || 1
      const w = container.clientWidth
      const depth = treeDepth(tree)
      const h = Math.max(300, (depth + 1) * 100 + 80)

      canvas.width = w * dpr
      canvas.height = h * dpr
      canvas.style.width = `${w}px`
      canvas.style.height = `${h}px`

      const ctx = canvas.getContext('2d')
      if (!ctx) return
      const layouts = layoutTree(tree, w)
      drawTree(ctx, layouts, dpr, isDark, highlightId)
    }
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [tree, highlightId, isDark])

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-2.5 bg-green-100 dark:bg-green-900 rounded-xl">
          <TreeDeciduous className="w-7 h-7 text-green-600 dark:text-green-400" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            의사결정 트리 시각화
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            분류 알고리즘을 단계별로 구축하고 시각화합니다
          </p>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* ── Left Panel: Controls ── */}
        <div className="lg:col-span-1 space-y-4">
          {/* Preset selector */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-5 space-y-4">
            <h2 className="font-semibold text-gray-900 dark:text-white">데이터셋</h2>
            <div className="grid grid-cols-1 gap-2">
              {PRESETS.map((p, i) => (
                <button key={p.name} onClick={() => selectPreset(i)}
                  className={`text-left px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    dataset.name === p.name
                      ? 'bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 ring-1 ring-green-400'
                      : 'bg-gray-50 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600'
                  }`}>
                  {p.name}
                </button>
              ))}
            </div>
          </div>

          {/* Split criterion & max depth */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-5 space-y-4">
            <h2 className="font-semibold text-gray-900 dark:text-white">설정</h2>
            <div>
              <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">분할 기준</label>
              <div className="flex gap-2">
                {(['entropy', 'gini'] as SplitCriterion[]).map(c => (
                  <button key={c} onClick={() => setCriterion(c)}
                    className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      criterion === c
                        ? 'bg-green-600 text-white'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                    }`}>
                    {c === 'entropy' ? '엔트로피' : '지니 계수'}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">
                최대 깊이: <span className="font-bold text-green-600">{maxDepth}</span>
              </label>
              <input type="range" min={1} max={5} value={maxDepth}
                onChange={e => setMaxDepth(Number(e.target.value))}
                className="w-full accent-green-600" />
              <div className="flex justify-between text-xs text-gray-400">
                <span>1</span><span>2</span><span>3</span><span>4</span><span>5</span>
              </div>
            </div>
          </div>

          {/* Action buttons */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-5 space-y-3">
            <button onClick={handleBuild}
              className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-lg px-4 py-3 font-medium hover:from-green-700 hover:to-emerald-700 transition-colors">
              <Play className="w-4 h-4" /> 트리 생성
            </button>
            <button onClick={handleStepBuild}
              className="w-full flex items-center justify-center gap-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg px-4 py-3 font-medium transition-colors">
              <SkipForward className="w-4 h-4" />
              {steps.length > 0 && stepIdx < steps.length - 1
                ? `1단계 (${stepIdx + 1}/${steps.length - 1})`
                : '1단계'}
            </button>
            <button onClick={handleReset}
              className="w-full flex items-center justify-center gap-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg px-4 py-3 font-medium transition-colors">
              <RotateCcw className="w-4 h-4" /> 초기화
            </button>
          </div>

          {/* Stats */}
          {stats && (
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-5">
              <h2 className="font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                <BarChart3 className="w-4 h-4" /> 통계
              </h2>
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-green-50 dark:bg-green-950 rounded-lg p-3 text-center">
                  <div className="text-xl font-bold text-green-600">{stats.depth}</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">깊이</div>
                </div>
                <div className="bg-blue-50 dark:bg-blue-950 rounded-lg p-3 text-center">
                  <div className="text-xl font-bold text-blue-600">{stats.nodes}</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">노드 수</div>
                </div>
                <div className="bg-purple-50 dark:bg-purple-950 rounded-lg p-3 text-center">
                  <div className="text-xl font-bold text-purple-600">{stats.leaves}</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">잎 노드</div>
                </div>
                <div className="bg-amber-50 dark:bg-amber-950 rounded-lg p-3 text-center">
                  <div className="text-xl font-bold text-amber-600">{(stats.accuracy * 100).toFixed(1)}%</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">정확도</div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ── Right Panel: Canvas + Table ── */}
        <div className="lg:col-span-2 space-y-4">
          {/* Tree Canvas */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-4" ref={containerRef}>
            <h2 className="font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
              <TreeDeciduous className="w-4 h-4" /> 트리 시각화
            </h2>
            {tree ? (
              <div className="overflow-x-auto">
                <canvas ref={canvasRef} className="w-full" />
              </div>
            ) : (
              <div className="flex items-center justify-center h-64 text-gray-400 dark:text-gray-500 border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-lg">
                <div className="text-center">
                  <TreeDeciduous className="w-12 h-12 mx-auto mb-2 opacity-30" />
                  <p>&ldquo;트리 생성&rdquo; 또는 &ldquo;1단계&rdquo; 버튼을 눌러 시작하세요</p>
                </div>
              </div>
            )}

            {/* Legend */}
            {tree && (
              <div className="mt-3 flex flex-wrap gap-3">
                {Object.entries(CLASS_COLORS).map(([cls, color]) => (
                  <div key={cls} className="flex items-center gap-1.5 text-xs text-gray-600 dark:text-gray-400">
                    <span className="w-3 h-3 rounded" style={{ backgroundColor: color }} />
                    {cls}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Data Table */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-4">
            <button onClick={() => setShowTable(!showTable)}
              className="flex items-center gap-2 w-full text-left font-semibold text-gray-900 dark:text-white mb-2">
              <Table2 className="w-4 h-4" />
              데이터 테이블 ({rows.length}행)
              {showTable ? <ChevronUp className="w-4 h-4 ml-auto" /> : <ChevronDown className="w-4 h-4 ml-auto" />}
            </button>
            {showTable && (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-200 dark:border-gray-700">
                        <th className="px-2 py-1.5 text-left text-gray-500 dark:text-gray-400 text-xs">#</th>
                        {allCols.map(col => (
                          <th key={col} className={`px-2 py-1.5 text-left text-xs ${
                            col === labelCol
                              ? 'text-green-600 dark:text-green-400 font-bold'
                              : 'text-gray-500 dark:text-gray-400'
                          }`}>
                            {col}{col === labelCol && ' (라벨)'}
                          </th>
                        ))}
                        <th className="px-1 py-1.5" />
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((row, ri) => (
                        <tr key={ri} className="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700">
                          <td className="px-2 py-1 text-gray-400 text-xs">{ri + 1}</td>
                          {allCols.map(col => (
                            <td key={col} className="px-1 py-1">
                              <input
                                type="text" value={row[col] || ''}
                                onChange={e => updateCell(ri, col, e.target.value)}
                                className="w-full px-1.5 py-0.5 text-sm border border-transparent hover:border-gray-300 dark:hover:border-gray-600 rounded bg-transparent text-gray-900 dark:text-white focus:border-green-500 focus:ring-1 focus:ring-green-500 outline-none"
                              />
                            </td>
                          ))}
                          <td className="px-1 py-1">
                            <button onClick={() => removeRow(ri)}
                              className="p-1 text-gray-400 hover:text-red-500 transition-colors">
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <button onClick={addRow}
                  className="mt-2 flex items-center gap-1 text-sm text-green-600 dark:text-green-400 hover:text-green-700 dark:hover:text-green-300">
                  <Plus className="w-4 h-4" /> 행 추가
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* ── Guide Section ── */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
        <button onClick={() => setShowGuide(!showGuide)}
          className="flex items-center gap-2 w-full text-left">
          <BookOpen className="w-5 h-5 text-green-600" />
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">가이드</h2>
          {showGuide
            ? <ChevronUp className="w-5 h-5 ml-auto text-gray-400" />
            : <ChevronDown className="w-5 h-5 ml-auto text-gray-400" />}
        </button>

        {showGuide && (
          <div className="mt-6 space-y-4">
            {GUIDE_SECTIONS.map((section, idx) => (
              <div key={idx} className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
                <button
                  onClick={() => setOpenGuideIdx(openGuideIdx === idx ? null : idx)}
                  className="flex items-center justify-between w-full px-4 py-3 bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors">
                  <span className="font-medium text-gray-900 dark:text-white">{section.title}</span>
                  {openGuideIdx === idx
                    ? <ChevronUp className="w-4 h-4 text-gray-400" />
                    : <ChevronDown className="w-4 h-4 text-gray-400" />}
                </button>
                {openGuideIdx === idx && (
                  <div className="px-4 py-3 space-y-2">
                    {(section.content as string[]).map((item, i) => (
                      <p key={i} className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
                        {item}
                      </p>
                    ))}
                  </div>
                )}
              </div>
            ))}

            {/* FAQ */}
            <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
              <button
                onClick={() => setOpenGuideIdx(openGuideIdx === 99 ? null : 99)}
                className="flex items-center justify-between w-full px-4 py-3 bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors">
                <span className="font-medium text-gray-900 dark:text-white">자주 묻는 질문</span>
                {openGuideIdx === 99
                  ? <ChevronUp className="w-4 h-4 text-gray-400" />
                  : <ChevronDown className="w-4 h-4 text-gray-400" />}
              </button>
              {openGuideIdx === 99 && (
                <div className="px-4 py-3 space-y-4">
                  {FAQ_ITEMS.map((faq, i) => (
                    <div key={i}>
                      <p className="font-medium text-sm text-gray-900 dark:text-white mb-1">Q. {faq.q}</p>
                      <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">{faq.a}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
