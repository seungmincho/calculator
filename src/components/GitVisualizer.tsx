'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { GitBranch, GitCommit, GitMerge, RotateCcw, Play, ChevronDown, ChevronUp, Terminal } from 'lucide-react'

// ── Types ──
interface Commit {
  id: string
  message: string
  parents: string[]
  branch: string // which branch created this commit
  timestamp: number
}

interface RepoState {
  commits: Map<string, Commit>
  branches: Map<string, string> // branchName → commitId
  head: string // current branch name
  commitCounter: number
}

interface LogEntry {
  command: string
  description: string
  type: 'info' | 'success' | 'error'
}

// ── Branch colors ──
const BRANCH_COLORS_LIGHT = [
  '#2563eb', '#dc2626', '#16a34a', '#9333ea', '#ea580c', '#0891b2', '#c026d3', '#854d0e',
]
const BRANCH_COLORS_DARK = [
  '#60a5fa', '#f87171', '#4ade80', '#c084fc', '#fb923c', '#22d3ee', '#e879f9', '#fbbf24',
]

function getBranchColor(branchName: string, allBranches: string[], isDark: boolean): string {
  const colors = isDark ? BRANCH_COLORS_DARK : BRANCH_COLORS_LIGHT
  const idx = allBranches.indexOf(branchName)
  return colors[idx % colors.length]
}

// ── ID generator ──
function shortId(counter: number): string {
  return counter.toString(16).padStart(7, '0')
}

// ── Initial state builder ──
function createInitialState(): RepoState {
  const commits = new Map<string, Commit>()
  const c1: Commit = { id: shortId(1), message: 'Initial commit', parents: [], branch: 'main', timestamp: 1 }
  const c2: Commit = { id: shortId(2), message: 'Add README', parents: [c1.id], branch: 'main', timestamp: 2 }
  const c3: Commit = { id: shortId(3), message: 'Add .gitignore', parents: [c2.id], branch: 'main', timestamp: 3 }
  commits.set(c1.id, c1)
  commits.set(c2.id, c2)
  commits.set(c3.id, c3)
  return {
    commits,
    branches: new Map([['main', c3.id]]),
    head: 'main',
    commitCounter: 3,
  }
}

// ── Presets ──
function createBranchConflictState(): RepoState {
  const commits = new Map<string, Commit>()
  const c1: Commit = { id: shortId(1), message: 'Initial commit', parents: [], branch: 'main', timestamp: 1 }
  const c2: Commit = { id: shortId(2), message: 'Add README', parents: [c1.id], branch: 'main', timestamp: 2 }
  const c3: Commit = { id: shortId(3), message: 'Update main', parents: [c2.id], branch: 'main', timestamp: 3 }
  const c4: Commit = { id: shortId(4), message: 'Feature: login', parents: [c2.id], branch: 'feature', timestamp: 4 }
  const c5: Commit = { id: shortId(5), message: 'Feature: auth', parents: [c4.id], branch: 'feature', timestamp: 5 }
  ;[c1, c2, c3, c4, c5].forEach(c => commits.set(c.id, c))
  return {
    commits,
    branches: new Map([['main', c3.id], ['feature', c5.id]]),
    head: 'main',
    commitCounter: 5,
  }
}

function createRebaseState(): RepoState {
  const commits = new Map<string, Commit>()
  const c1: Commit = { id: shortId(1), message: 'Initial commit', parents: [], branch: 'main', timestamp: 1 }
  const c2: Commit = { id: shortId(2), message: 'Base work', parents: [c1.id], branch: 'main', timestamp: 2 }
  const c3: Commit = { id: shortId(3), message: 'Main update A', parents: [c2.id], branch: 'main', timestamp: 3 }
  const c4: Commit = { id: shortId(4), message: 'Main update B', parents: [c3.id], branch: 'main', timestamp: 4 }
  const c5: Commit = { id: shortId(5), message: 'Feature X', parents: [c2.id], branch: 'feature', timestamp: 5 }
  const c6: Commit = { id: shortId(6), message: 'Feature Y', parents: [c5.id], branch: 'feature', timestamp: 6 }
  ;[c1, c2, c3, c4, c5, c6].forEach(c => commits.set(c.id, c))
  return {
    commits,
    branches: new Map([['main', c4.id], ['feature', c6.id]]),
    head: 'feature',
    commitCounter: 6,
  }
}

function createCherryPickState(): RepoState {
  const commits = new Map<string, Commit>()
  const c1: Commit = { id: shortId(1), message: 'Initial commit', parents: [], branch: 'main', timestamp: 1 }
  const c2: Commit = { id: shortId(2), message: 'Setup project', parents: [c1.id], branch: 'main', timestamp: 2 }
  const c3: Commit = { id: shortId(3), message: 'Hotfix: typo', parents: [c2.id], branch: 'hotfix', timestamp: 3 }
  const c4: Commit = { id: shortId(4), message: 'Hotfix: CSS bug', parents: [c3.id], branch: 'hotfix', timestamp: 4 }
  const c5: Commit = { id: shortId(5), message: 'Feature: UI', parents: [c2.id], branch: 'feature', timestamp: 5 }
  ;[c1, c2, c3, c4, c5].forEach(c => commits.set(c.id, c))
  return {
    commits,
    branches: new Map([['main', c2.id], ['hotfix', c4.id], ['feature', c5.id]]),
    head: 'main',
    commitCounter: 5,
  }
}

// ── Topological sort ──
function topoSort(commits: Map<string, Commit>): string[] {
  const visited = new Set<string>()
  const result: string[] = []
  function visit(id: string) {
    if (visited.has(id)) return
    visited.add(id)
    const c = commits.get(id)
    if (!c) return
    for (const p of c.parents) visit(p)
    result.push(id)
  }
  for (const id of commits.keys()) visit(id)
  return result
}

// ── Layout computation ──
interface NodeLayout {
  x: number
  y: number
  commitId: string
  branch: string
}

function computeLayout(
  state: RepoState
): { nodes: Map<string, NodeLayout>; lanes: Map<string, number> } {
  const sorted = topoSort(state.commits)
  const branchNames = Array.from(state.branches.keys())
  // Assign lane per branch
  const lanes = new Map<string, number>()
  branchNames.forEach((b, i) => lanes.set(b, i))
  // Also handle commits whose branch isn't in branches anymore
  const nodes = new Map<string, NodeLayout>()
  const H_SPACING = 80
  const V_SPACING = 60

  sorted.forEach((id, idx) => {
    const commit = state.commits.get(id)!
    let lane = lanes.get(commit.branch) ?? 0
    if (!lanes.has(commit.branch)) {
      const newLane = lanes.size
      lanes.set(commit.branch, newLane)
      lane = newLane
    }
    nodes.set(id, {
      x: 60 + idx * H_SPACING,
      y: 40 + lane * V_SPACING,
      commitId: id,
      branch: commit.branch,
    })
  })

  return { nodes, lanes }
}

// ── Canvas renderer ──
function renderGraph(
  canvas: HTMLCanvasElement,
  state: RepoState,
  highlightCommit: string | null,
  isDark: boolean
) {
  const dpr = window.devicePixelRatio || 1
  const { nodes, lanes } = computeLayout(state)
  const branchNames = Array.from(lanes.keys())

  // Compute canvas size
  let maxX = 200, maxY = 200
  nodes.forEach(n => {
    if (n.x + 60 > maxX) maxX = n.x + 60
    if (n.y + 60 > maxY) maxY = n.y + 60
  })

  const cssW = Math.max(maxX + 40, canvas.parentElement?.clientWidth ?? 600)
  const cssH = Math.max(maxY + 40, 200)
  canvas.style.width = cssW + 'px'
  canvas.style.height = cssH + 'px'
  canvas.width = cssW * dpr
  canvas.height = cssH * dpr

  const ctx = canvas.getContext('2d')!
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
  ctx.clearRect(0, 0, cssW, cssH)

  const bgColor = isDark ? '#1f2937' : '#ffffff'
  ctx.fillStyle = bgColor
  ctx.fillRect(0, 0, cssW, cssH)

  const NODE_R = 18

  // Draw edges
  nodes.forEach(node => {
    const commit = state.commits.get(node.commitId)!
    commit.parents.forEach(parentId => {
      const parentNode = nodes.get(parentId)
      if (!parentNode) return
      const color = getBranchColor(commit.branch, branchNames, isDark)
      ctx.strokeStyle = color
      ctx.lineWidth = 2.5
      ctx.beginPath()
      if (Math.abs(node.y - parentNode.y) < 2) {
        // Same lane — straight line
        ctx.moveTo(parentNode.x, parentNode.y)
        ctx.lineTo(node.x, node.y)
      } else {
        // Different lane — bezier curve
        const midX = (parentNode.x + node.x) / 2
        ctx.moveTo(parentNode.x, parentNode.y)
        ctx.bezierCurveTo(midX, parentNode.y, midX, node.y, node.x, node.y)
      }
      ctx.stroke()
    })
  })

  // Draw commit nodes
  nodes.forEach(node => {
    const commit = state.commits.get(node.commitId)!
    const color = getBranchColor(commit.branch, branchNames, isDark)
    const isHighlighted = node.commitId === highlightCommit

    ctx.beginPath()
    ctx.arc(node.x, node.y, NODE_R, 0, Math.PI * 2)
    ctx.fillStyle = color
    ctx.fill()

    if (isHighlighted) {
      ctx.strokeStyle = isDark ? '#fbbf24' : '#f59e0b'
      ctx.lineWidth = 4
      ctx.stroke()
    }

    // Check if HEAD points here
    const headBranch = state.head
    const headCommitId = state.branches.get(headBranch)
    if (node.commitId === headCommitId) {
      ctx.strokeStyle = isDark ? '#ffffff' : '#000000'
      ctx.lineWidth = 3
      ctx.stroke()
    }

    // Short hash label
    ctx.fillStyle = '#ffffff'
    ctx.font = 'bold 10px monospace'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(node.commitId.slice(0, 4), node.x, node.y)
  })

  // Draw branch labels
  const branchTips = new Map<string, string>()
  state.branches.forEach((commitId, branchName) => {
    branchTips.set(commitId, (branchTips.get(commitId) || '') + (branchTips.has(commitId) ? ', ' : '') + branchName)
  })

  // Per-branch label (one per branch, at tip commit)
  state.branches.forEach((commitId, branchName) => {
    const node = nodes.get(commitId)
    if (!node) return
    const color = getBranchColor(branchName, branchNames, isDark)
    const label = branchName + (branchName === state.head ? ' (HEAD)' : '')
    ctx.font = 'bold 11px system-ui, sans-serif'
    const textW = ctx.measureText(label).width
    const padX = 6, padY = 3
    const labelX = node.x - textW / 2 - padX
    const labelY = node.y - NODE_R - 18

    // Rounded rect
    const rr = 4
    ctx.beginPath()
    ctx.roundRect(labelX, labelY - padY, textW + padX * 2, 16 + padY, rr)
    ctx.fillStyle = color
    ctx.fill()

    ctx.fillStyle = '#ffffff'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(label, node.x, labelY + 5)
  })
}

// ── Main Component ──
export default function GitVisualizer() {
  const [repo, setRepo] = useState<RepoState>(createInitialState)
  const [commandInput, setCommandInput] = useState('')
  const [logs, setLogs] = useState<LogEntry[]>([
    { command: 'init', description: 'main 브랜치에 3개의 초기 커밋이 있는 저장소가 생성되었습니다.', type: 'info' },
  ])
  const [highlightCommit, setHighlightCommit] = useState<string | null>(null)
  const [isDark, setIsDark] = useState(false)
  const [showGuide, setShowGuide] = useState(false)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const logEndRef = useRef<HTMLDivElement>(null)

  // Dark mode detection
  useEffect(() => {
    const check = () => setIsDark(document.documentElement.classList.contains('dark'))
    check()
    const observer = new MutationObserver(check)
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })
    return () => observer.disconnect()
  }, [])

  // Re-render canvas on state change
  useEffect(() => {
    if (canvasRef.current) {
      renderGraph(canvasRef.current, repo, highlightCommit, isDark)
    }
  }, [repo, highlightCommit, isDark])

  // Resize handler
  useEffect(() => {
    const onResize = () => {
      if (canvasRef.current) renderGraph(canvasRef.current, repo, highlightCommit, isDark)
    }
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [repo, highlightCommit, isDark])

  // Scroll log to bottom
  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [logs])

  const addLog = useCallback((entry: LogEntry) => {
    setLogs(prev => [...prev, entry])
  }, [])

  // ── Command execution ──
  const executeCommand = useCallback((raw: string) => {
    const trimmed = raw.trim()
    if (!trimmed) return
    const parts = trimmed.split(/\s+/)
    const cmd = parts[0].toLowerCase()
    const arg = parts.slice(1).join(' ')

    setRepo(prev => {
      const next: RepoState = {
        commits: new Map(prev.commits),
        branches: new Map(prev.branches),
        head: prev.head,
        commitCounter: prev.commitCounter,
      }
      const headCommitId = next.branches.get(next.head)
      if (!headCommitId && cmd !== 'help') {
        addLog({ command: trimmed, description: `오류: HEAD가 가리키는 브랜치(${next.head})를 찾을 수 없습니다.`, type: 'error' })
        return prev
      }

      switch (cmd) {
        case 'commit': {
          const msg = arg || `Commit #${next.commitCounter + 1}`
          const newId = shortId(++next.commitCounter)
          const newCommit: Commit = {
            id: newId,
            message: msg,
            parents: [headCommitId!],
            branch: next.head,
            timestamp: next.commitCounter,
          }
          next.commits.set(newId, newCommit)
          next.branches.set(next.head, newId)
          setHighlightCommit(newId)
          addLog({ command: `commit "${msg}"`, description: `새 커밋 ${newId.slice(0, 7)}이 ${next.head} 브랜치에 생성되었습니다.`, type: 'success' })
          break
        }

        case 'branch': {
          if (!arg) {
            addLog({ command: trimmed, description: '사용법: branch <이름> — 새 브랜치를 생성합니다.', type: 'error' })
            return prev
          }
          if (next.branches.has(arg)) {
            addLog({ command: trimmed, description: `오류: '${arg}' 브랜치가 이미 존재합니다.`, type: 'error' })
            return prev
          }
          next.branches.set(arg, headCommitId!)
          addLog({ command: `branch ${arg}`, description: `'${arg}' 브랜치가 커밋 ${headCommitId!.slice(0, 4)}에 생성되었습니다. checkout ${arg}로 전환하세요.`, type: 'success' })
          break
        }

        case 'checkout': {
          if (!arg) {
            addLog({ command: trimmed, description: '사용법: checkout <브랜치명>', type: 'error' })
            return prev
          }
          if (!next.branches.has(arg)) {
            addLog({ command: trimmed, description: `오류: '${arg}' 브랜치가 존재하지 않습니다.`, type: 'error' })
            return prev
          }
          next.head = arg
          const targetId = next.branches.get(arg)!
          setHighlightCommit(targetId)
          addLog({ command: `checkout ${arg}`, description: `HEAD가 '${arg}' 브랜치(커밋 ${targetId.slice(0, 4)})로 전환되었습니다.`, type: 'success' })
          break
        }

        case 'merge': {
          if (!arg) {
            addLog({ command: trimmed, description: '사용법: merge <브랜치명> — 해당 브랜치를 현재 브랜치에 병합합니다.', type: 'error' })
            return prev
          }
          if (!next.branches.has(arg)) {
            addLog({ command: trimmed, description: `오류: '${arg}' 브랜치가 존재하지 않습니다.`, type: 'error' })
            return prev
          }
          if (arg === next.head) {
            addLog({ command: trimmed, description: '오류: 현재 브랜치를 자기 자신에 병합할 수 없습니다.', type: 'error' })
            return prev
          }
          const mergeSourceId = next.branches.get(arg)!
          // Check if already merged (source is ancestor of head)
          if (mergeSourceId === headCommitId) {
            addLog({ command: trimmed, description: `'${arg}' 브랜치가 이미 현재 브랜치에 포함되어 있습니다 (Already up to date).`, type: 'info' })
            return prev
          }
          // Fast-forward check: is headCommitId an ancestor of mergeSourceId?
          const isAncestor = (ancestorId: string, descendantId: string): boolean => {
            if (ancestorId === descendantId) return true
            const stack = [descendantId]
            const visited = new Set<string>()
            while (stack.length) {
              const id = stack.pop()!
              if (visited.has(id)) continue
              visited.add(id)
              if (id === ancestorId) return true
              const c = next.commits.get(id)
              if (c) stack.push(...c.parents)
            }
            return false
          }
          if (isAncestor(headCommitId!, mergeSourceId)) {
            // Fast-forward
            next.branches.set(next.head, mergeSourceId)
            setHighlightCommit(mergeSourceId)
            addLog({ command: `merge ${arg}`, description: `Fast-forward 병합: ${next.head}가 커밋 ${mergeSourceId.slice(0, 4)}로 이동했습니다. 히스토리가 직선으로 유지됩니다.`, type: 'success' })
          } else {
            // Create merge commit
            const newId = shortId(++next.commitCounter)
            const mergeCommit: Commit = {
              id: newId,
              message: `Merge '${arg}' into ${next.head}`,
              parents: [headCommitId!, mergeSourceId],
              branch: next.head,
              timestamp: next.commitCounter,
            }
            next.commits.set(newId, mergeCommit)
            next.branches.set(next.head, newId)
            setHighlightCommit(newId)
            addLog({ command: `merge ${arg}`, description: `병합 커밋 ${newId.slice(0, 4)} 생성: '${arg}'의 변경사항이 '${next.head}'에 합쳐졌습니다. 두 부모를 가진 커밋이 만들어집니다.`, type: 'success' })
          }
          break
        }

        case 'rebase': {
          if (!arg) {
            addLog({ command: trimmed, description: '사용법: rebase <대상브랜치> — 현재 브랜치를 대상 브랜치 위로 재배치합니다.', type: 'error' })
            return prev
          }
          if (!next.branches.has(arg)) {
            addLog({ command: trimmed, description: `오류: '${arg}' 브랜치가 존재하지 않습니다.`, type: 'error' })
            return prev
          }
          if (arg === next.head) {
            addLog({ command: trimmed, description: '오류: 현재 브랜치를 자기 자신 위로 rebase할 수 없습니다.', type: 'error' })
            return prev
          }
          const targetTipId = next.branches.get(arg)!
          // Find commits unique to current branch (not reachable from target)
          const reachableFromTarget = new Set<string>()
          const stack = [targetTipId]
          while (stack.length) {
            const id = stack.pop()!
            if (reachableFromTarget.has(id)) continue
            reachableFromTarget.add(id)
            const c = next.commits.get(id)
            if (c) stack.push(...c.parents)
          }
          // Walk current branch backwards, collect commits not in target
          const currentCommits: Commit[] = []
          let walkId: string | null = headCommitId!
          while (walkId && !reachableFromTarget.has(walkId)) {
            const cur: Commit = next.commits.get(walkId)!
            currentCommits.unshift(cur)
            walkId = cur.parents.length > 0 ? cur.parents[0] : null
          }
          if (currentCommits.length === 0) {
            addLog({ command: `rebase ${arg}`, description: `현재 브랜치에 rebase할 고유 커밋이 없습니다 (Already up to date).`, type: 'info' })
            return prev
          }
          // Re-create commits on top of target
          let parentId = targetTipId
          let lastId = targetTipId
          for (const oldCommit of currentCommits) {
            const newId = shortId(++next.commitCounter)
            const newCommit: Commit = {
              id: newId,
              message: oldCommit.message,
              parents: [parentId],
              branch: next.head,
              timestamp: next.commitCounter,
            }
            next.commits.set(newId, newCommit)
            parentId = newId
            lastId = newId
          }
          next.branches.set(next.head, lastId)
          setHighlightCommit(lastId)
          addLog({
            command: `rebase ${arg}`,
            description: `${currentCommits.length}개의 커밋이 '${arg}' 브랜치 끝(${targetTipId.slice(0, 4)})으로 재배치되었습니다. 히스토리가 깔끔한 직선으로 정리됩니다. (원래 커밋은 그래프에 남아있습니다)`,
            type: 'success',
          })
          break
        }

        case 'cherry-pick': {
          if (!arg) {
            addLog({ command: trimmed, description: '사용법: cherry-pick <커밋ID> — 특정 커밋을 현재 브랜치에 복사합니다.', type: 'error' })
            return prev
          }
          // Find commit by partial or full id
          let targetCommit: Commit | undefined
          for (const [id, c] of next.commits) {
            if (id === arg || id.startsWith(arg)) {
              targetCommit = c
              break
            }
          }
          if (!targetCommit) {
            addLog({ command: trimmed, description: `오류: 커밋 '${arg}'를 찾을 수 없습니다.`, type: 'error' })
            return prev
          }
          const newId = shortId(++next.commitCounter)
          const cherry: Commit = {
            id: newId,
            message: targetCommit.message + ' (cherry-picked)',
            parents: [headCommitId!],
            branch: next.head,
            timestamp: next.commitCounter,
          }
          next.commits.set(newId, cherry)
          next.branches.set(next.head, newId)
          setHighlightCommit(newId)
          addLog({
            command: `cherry-pick ${arg}`,
            description: `커밋 ${targetCommit.id.slice(0, 4)}("${targetCommit.message}")가 '${next.head}' 브랜치에 복사되었습니다 → 새 커밋 ${newId.slice(0, 4)}.`,
            type: 'success',
          })
          break
        }

        case 'reset': {
          if (!arg) {
            addLog({ command: trimmed, description: '사용법: reset <커밋ID> — 현재 브랜치 포인터를 해당 커밋으로 되돌립니다.', type: 'error' })
            return prev
          }
          let targetId: string | undefined
          for (const id of next.commits.keys()) {
            if (id === arg || id.startsWith(arg)) {
              targetId = id
              break
            }
          }
          if (!targetId) {
            addLog({ command: trimmed, description: `오류: 커밋 '${arg}'를 찾을 수 없습니다.`, type: 'error' })
            return prev
          }
          next.branches.set(next.head, targetId)
          setHighlightCommit(targetId)
          addLog({
            command: `reset ${arg}`,
            description: `'${next.head}' 브랜치가 커밋 ${targetId.slice(0, 4)}로 되돌아갔습니다. 이후 커밋들은 그래프에 남아있지만 브랜치에서 분리되었습니다.`,
            type: 'success',
          })
          break
        }

        default:
          addLog({
            command: trimmed,
            description: `알 수 없는 명령: '${cmd}'. 사용 가능한 명령: commit, branch, checkout, merge, rebase, cherry-pick, reset`,
            type: 'error',
          })
          return prev
      }

      return next
    })

    setCommandInput('')
  }, [addLog])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      executeCommand(commandInput)
    }
  }

  const loadPreset = (name: string) => {
    let state: RepoState
    let desc: string
    switch (name) {
      case 'basic':
        state = createInitialState()
        desc = 'main 브랜치에 3개의 초기 커밋이 있는 기본 저장소입니다.'
        break
      case 'conflict':
        state = createBranchConflictState()
        desc = 'main과 feature 브랜치가 분기된 상태입니다. merge 또는 rebase를 시도해보세요.'
        break
      case 'rebase':
        state = createRebaseState()
        desc = 'feature 브랜치가 체크아웃된 상태입니다. "rebase main"을 실행해보세요.'
        break
      case 'cherry':
        state = createCherryPickState()
        desc = 'main, hotfix, feature 3개 브랜치가 있습니다. "cherry-pick <커밋ID>"로 특정 커밋을 복사해보세요.'
        break
      default:
        return
    }
    setRepo(state)
    setHighlightCommit(null)
    setLogs([{ command: `preset: ${name}`, description: desc, type: 'info' }])
  }

  // Quick command buttons
  const quickCommands = [
    { label: 'commit', cmd: 'commit' },
    { label: 'branch', cmd: 'branch ', prompt: true },
    { label: 'checkout', cmd: 'checkout ', prompt: true },
    { label: 'merge', cmd: 'merge ', prompt: true },
    { label: 'rebase', cmd: 'rebase ', prompt: true },
    { label: 'cherry-pick', cmd: 'cherry-pick ', prompt: true },
    { label: 'reset', cmd: 'reset ', prompt: true },
  ]

  const branchList = Array.from(repo.branches.entries())
  const commitList = topoSort(repo.commits).reverse().map(id => repo.commits.get(id)!)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 bg-emerald-100 dark:bg-emerald-900/50 rounded-lg">
            <GitBranch className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Git 시각화
          </h1>
        </div>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          branch, merge, rebase, cherry-pick을 인터랙티브 커밋 그래프로 직접 실행하며 이해하세요
        </p>
      </div>

      {/* Preset buttons */}
      <div className="flex flex-wrap gap-2">
        <span className="text-sm text-gray-500 dark:text-gray-400 self-center mr-1">시나리오:</span>
        {[
          { key: 'basic', label: '기본' },
          { key: 'conflict', label: '브랜치 분기' },
          { key: 'rebase', label: '리베이스 전' },
          { key: 'cherry', label: '체리픽 시나리오' },
        ].map(p => (
          <button
            key={p.key}
            onClick={() => loadPreset(p.key)}
            className="px-3 py-1.5 text-sm rounded-lg bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-emerald-50 dark:hover:bg-emerald-900/30 hover:border-emerald-300 dark:hover:border-emerald-700 transition-colors"
          >
            {p.label}
          </button>
        ))}
        <button
          onClick={() => { setRepo(createInitialState()); setHighlightCommit(null); setLogs([{ command: 'reset', description: '저장소가 초기화되었습니다.', type: 'info' }]) }}
          className="px-3 py-1.5 text-sm rounded-lg bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/50 transition-colors flex items-center gap-1"
        >
          <RotateCcw className="w-3.5 h-3.5" /> 초기화
        </button>
      </div>

      {/* Main layout */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Canvas area (2/3) */}
        <div className="lg:col-span-2">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-4 overflow-x-auto">
            <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-2 flex items-center gap-1.5">
              <GitCommit className="w-4 h-4" /> 커밋 그래프
            </h2>
            <div className="min-h-[200px] border border-gray-100 dark:border-gray-700 rounded-lg overflow-auto">
              <canvas ref={canvasRef} />
            </div>
          </div>
        </div>

        {/* Sidebar (1/3) */}
        <div className="space-y-4">
          {/* Command input */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-4">
            <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-2 flex items-center gap-1.5">
              <Terminal className="w-4 h-4" /> 명령어 입력
            </h3>
            <div className="flex gap-2 mb-3">
              <input
                type="text"
                value={commandInput}
                onChange={e => setCommandInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="예: commit 버그 수정"
                className="flex-1 px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:outline-none font-mono"
              />
              <button
                onClick={() => executeCommand(commandInput)}
                className="px-3 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-lg hover:from-emerald-700 hover:to-teal-700 transition-colors"
              >
                <Play className="w-4 h-4" />
              </button>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {quickCommands.map(qc => (
                <button
                  key={qc.label}
                  onClick={() => {
                    if (qc.prompt) {
                      setCommandInput(qc.cmd)
                    } else {
                      executeCommand(qc.cmd)
                    }
                  }}
                  className="px-2 py-1 text-xs rounded bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 hover:text-emerald-700 dark:hover:text-emerald-300 transition-colors font-mono"
                >
                  {qc.label}
                </button>
              ))}
            </div>
          </div>

          {/* Branch list */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-4">
            <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-2 flex items-center gap-1.5">
              <GitBranch className="w-4 h-4" /> 브랜치 ({branchList.length})
            </h3>
            <div className="space-y-1.5">
              {branchList.map(([name, commitId]) => (
                <button
                  key={name}
                  onClick={() => executeCommand(`checkout ${name}`)}
                  className={`w-full text-left px-3 py-1.5 rounded-lg text-sm flex items-center justify-between transition-colors ${
                    name === repo.head
                      ? 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 font-semibold'
                      : 'hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300'
                  }`}
                >
                  <span className="flex items-center gap-1.5">
                    {name === repo.head && <span className="text-xs">HEAD</span>}
                    {name}
                  </span>
                  <span className="text-xs font-mono text-gray-400">{commitId.slice(0, 4)}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Operation log */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-4">
            <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-2 flex items-center gap-1.5">
              <GitMerge className="w-4 h-4" /> 실행 로그
            </h3>
            <div className="max-h-48 overflow-y-auto space-y-2 text-sm">
              {logs.map((log, i) => (
                <div key={i} className={`p-2 rounded-lg ${
                  log.type === 'error' ? 'bg-red-50 dark:bg-red-900/20' :
                  log.type === 'success' ? 'bg-emerald-50 dark:bg-emerald-900/20' :
                  'bg-blue-50 dark:bg-blue-900/20'
                }`}>
                  <div className="font-mono text-xs text-gray-500 dark:text-gray-400">$ {log.command}</div>
                  <div className={`text-xs mt-0.5 ${
                    log.type === 'error' ? 'text-red-600 dark:text-red-400' :
                    log.type === 'success' ? 'text-emerald-700 dark:text-emerald-300' :
                    'text-blue-700 dark:text-blue-300'
                  }`}>
                    {log.description}
                  </div>
                </div>
              ))}
              <div ref={logEndRef} />
            </div>
          </div>

          {/* Commit log */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-4">
            <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-2">
              커밋 목록 ({commitList.length})
            </h3>
            <div className="max-h-40 overflow-y-auto space-y-1">
              {commitList.map(c => (
                <button
                  key={c.id}
                  onClick={() => setHighlightCommit(h => h === c.id ? null : c.id)}
                  className={`w-full text-left px-2 py-1 rounded text-xs transition-colors ${
                    highlightCommit === c.id
                      ? 'bg-amber-50 dark:bg-amber-900/30 text-amber-800 dark:text-amber-300'
                      : 'hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300'
                  }`}
                >
                  <span className="font-mono text-gray-400 mr-1.5">{c.id.slice(0, 7)}</span>
                  <span>{c.message}</span>
                  <span className="text-gray-400 ml-1">({c.branch})</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Guide section */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden">
        <button
          onClick={() => setShowGuide(g => !g)}
          className="w-full px-6 py-4 flex items-center justify-between text-left hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
        >
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Git 가이드
          </h2>
          {showGuide ? <ChevronUp className="w-5 h-5 text-gray-400" /> : <ChevronDown className="w-5 h-5 text-gray-400" />}
        </button>

        {showGuide && (
          <div className="px-6 pb-6 space-y-8">
            {/* Git이란? */}
            <div>
              <h3 className="text-base font-bold text-gray-900 dark:text-white mb-2">Git이란?</h3>
              <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
                Git은 소스 코드의 변경 이력을 추적하고 관리하는 분산 버전 관리 시스템(DVCS)입니다.
                Linus Torvalds가 Linux 커널 개발을 위해 2005년에 만들었으며, 현재 세계에서 가장 널리 쓰이는 VCS입니다.
                각 개발자가 전체 히스토리의 복사본을 로컬에 가지고 있어 오프라인에서도 작업할 수 있고,
                브랜치를 통해 여러 기능을 동시에 개발한 뒤 병합(merge)하는 워크플로를 지원합니다.
              </p>
            </div>

            {/* 명령어 참조 */}
            <div>
              <h3 className="text-base font-bold text-gray-900 dark:text-white mb-3">주요 명령어</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200 dark:border-gray-700">
                      <th className="text-left py-2 pr-4 text-gray-500 dark:text-gray-400 font-medium">명령어</th>
                      <th className="text-left py-2 pr-4 text-gray-500 dark:text-gray-400 font-medium">사용법</th>
                      <th className="text-left py-2 text-gray-500 dark:text-gray-400 font-medium">설명</th>
                    </tr>
                  </thead>
                  <tbody className="text-gray-700 dark:text-gray-300">
                    {[
                      ['commit', 'commit [메시지]', '현재 브랜치에 새 커밋을 생성합니다'],
                      ['branch', 'branch <이름>', 'HEAD 위치에 새 브랜치를 생성합니다'],
                      ['checkout', 'checkout <브랜치>', 'HEAD를 해당 브랜치로 전환합니다'],
                      ['merge', 'merge <브랜치>', '해당 브랜치를 현재 브랜치에 병합합니다'],
                      ['rebase', 'rebase <브랜치>', '현재 브랜치 커밋을 대상 브랜치 위로 재배치합니다'],
                      ['cherry-pick', 'cherry-pick <ID>', '특정 커밋을 현재 브랜치에 복사합니다'],
                      ['reset', 'reset <ID>', '브랜치 포인터를 해당 커밋으로 되돌립니다'],
                    ].map(([cmd, usage, desc]) => (
                      <tr key={cmd} className="border-b border-gray-100 dark:border-gray-700/50">
                        <td className="py-2 pr-4 font-mono font-semibold text-emerald-600 dark:text-emerald-400">{cmd}</td>
                        <td className="py-2 pr-4 font-mono text-xs">{usage}</td>
                        <td className="py-2">{desc}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* merge vs rebase */}
            <div>
              <h3 className="text-base font-bold text-gray-900 dark:text-white mb-3">merge vs rebase</h3>
              <div className="grid md:grid-cols-2 gap-4">
                <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                  <h4 className="font-semibold text-blue-700 dark:text-blue-300 mb-2">merge</h4>
                  <ul className="text-sm text-gray-700 dark:text-gray-300 space-y-1.5">
                    <li>- 병합 커밋을 생성 (부모 2개)</li>
                    <li>- 히스토리를 있는 그대로 보존</li>
                    <li>- 브랜치가 분기/합류한 과정이 보임</li>
                    <li>- 안전: 기존 커밋을 수정하지 않음</li>
                    <li>- 협업 시 기본 전략으로 권장</li>
                  </ul>
                </div>
                <div className="p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                  <h4 className="font-semibold text-purple-700 dark:text-purple-300 mb-2">rebase</h4>
                  <ul className="text-sm text-gray-700 dark:text-gray-300 space-y-1.5">
                    <li>- 커밋을 새 위치에 재생성</li>
                    <li>- 깔끔한 직선 히스토리</li>
                    <li>- 불필요한 병합 커밋 없음</li>
                    <li>- 주의: 공유된 커밋에는 사용 금지</li>
                    <li>- 개인 브랜치 정리 시 적합</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* FAQ */}
            <div>
              <h3 className="text-base font-bold text-gray-900 dark:text-white mb-3">자주 묻는 질문</h3>
              <div className="space-y-3">
                {[
                  {
                    q: '이미 push한 커밋에 rebase를 하면 어떻게 되나요?',
                    a: 'rebase는 커밋의 해시를 변경하므로, 다른 팀원이 같은 브랜치를 기반으로 작업하고 있다면 충돌이 발생합니다. 공유된 브랜치에는 merge를 사용하고, rebase는 아직 push하지 않은 로컬 브랜치에서만 사용하세요.',
                  },
                  {
                    q: 'fast-forward merge란 무엇인가요?',
                    a: '현재 브랜치의 커밋이 병합 대상 브랜치의 조상(ancestor)일 때, 별도 병합 커밋 없이 브랜치 포인터만 앞으로 이동하는 것입니다. 히스토리가 직선으로 유지되며 가장 깔끔한 병합 방식입니다.',
                  },
                  {
                    q: 'HEAD란 무엇인가요?',
                    a: 'HEAD는 현재 체크아웃된 브랜치(또는 커밋)를 가리키는 특별한 포인터입니다. 새 커밋을 만들면 HEAD가 가리키는 브랜치가 새 커밋을 가리키도록 업데이트됩니다.',
                  },
                ].map((faq, i) => (
                  <div key={i} className="border-l-4 border-emerald-400 dark:border-emerald-600 pl-4">
                    <p className="font-semibold text-gray-900 dark:text-white text-sm mb-1">Q. {faq.q}</p>
                    <p className="text-gray-700 dark:text-gray-300 text-sm leading-relaxed">{faq.a}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
