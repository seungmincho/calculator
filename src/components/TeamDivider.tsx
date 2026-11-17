'use client'

import { useState, useCallback, useEffect, useLayoutEffect, useRef, useMemo } from 'react'
import { useTranslations } from '@/lib/i18n'
import '@/lib/i18n/ns/teamDivider'
import { Copy, Check, Users, Shuffle, Plus, Trash2 } from 'lucide-react'
import GuideSection from '@/components/GuideSection'
import MobileResultLink from '@/components/MobileResultLink'
import { glassCard, glassInset, glassInput } from '@/lib/glass'
import InteractiveTeamBoard from '@/components/InteractiveTeamBoard'
import ShareResult from '@/components/ShareResult'
import { distributeTeams, moveTeamMember, swapTeamMembers, parseTeamBoard, encodeTeamBoard } from '@/utils/teamBoard'
import { useHydrated } from '@/hooks/useHydrated'
import { TEAM_ROSTERS_KEY, MAX_TEAM_ROSTERS, readTeamRosters, teamRosterStorageError, withTeamRosterLock, writeTeamRosters, type TeamRoster, type TeamRosterRead } from '@/utils/teamRosters'
import { createTeamRotation, countRepeatedTeammatePairs, countTeammatePairs, hasMatchingTeamRoster, MAX_ROTATION_CANDIDATES } from '@/utils/teamRotation'
import TeamRosterBackup from '@/components/TeamRosterBackup'
import { attendingTeamMembers, setTeamAttendance } from '@/utils/teamAttendance'
import TeamResultCopyRecovery from '@/components/TeamResultCopyRecovery'
import { commitTeamHistory, createTeamHistory, createTeamRevealGuard, redoTeamHistory, undoTeamHistory, type TeamBoardHistory, type TeamEditSnapshot } from '@/utils/teamBoardHistory'
import { copyTeamResultText, createTeamResultDownloads, createTeamResultGuard, createTeamResultSnapshot } from '@/utils/teamResultActions'

const DEFAULT_SKILL = 3
const EMPTY_TEAMS: string[][] = []
const EMPTY_LOCKED: string[] = []
type RevealRun = { generation: number; timer: ReturnType<typeof setInterval> }

type Mode = 'random' | 'balanced' | 'captain'

interface Preset {
  key: string
  names: string[]
}

interface RotationComparison {
  previous: string[][]
  baselineSkillGap: number | null
  skills: Record<string, number>
  balanceLimited: boolean
  edited: boolean
}

export default function TeamDivider() {
  const t = useTranslations('teamDivider')

  const presets: Preset[] = [
    { key: 'sports', names: (t.raw('presets.sports.names') as string[]) },
    { key: 'study', names: (t.raw('presets.study.names') as string[]) },
    { key: 'company', names: (t.raw('presets.company.names') as string[]) },
    { key: 'game', names: (t.raw('presets.game.names') as string[]) },
  ]

  const [names, setNames] = useState<string[]>(() => Array.from({ length: 6 }, (_, i) => t('rosters.member', { number: i + 1 })))
  const [absentNames, setAbsentNames] = useState<Set<string>>(() => new Set())
  const [newName, setNewName] = useState('')
  const [bulkText, setBulkText] = useState('')
  const [showBulk, setShowBulk] = useState(false)
  const [teamCount, setTeamCount] = useState(2)
  const [mode, setMode] = useState<Mode>('random')
  const [skills, setSkills] = useState<Record<string, number>>({})
  const skillOf = useCallback((name: string) => Object.hasOwn(skills, name) ? skills[name] : DEFAULT_SKILL, [skills])
  const [boardHistory, setBoardHistory] = useState<TeamBoardHistory>(() => createTeamHistory())
  const [draftTeams, setDraftTeams] = useState<string[][]>([])
  const [boardEpoch, setBoardEpoch] = useState(0)
  const [isDividing, setIsDividing] = useState(false)
  const [copied, setCopied] = useState(false)
  const [draftPool, setDraftPool] = useState<string[]>([])
  const [currentCaptainTeam, setCurrentCaptainTeam] = useState(0)
  const [isDrafting, setIsDrafting] = useState(false)
  const [selected, setSelected] = useState<string | null>(null)
  const board = useMemo<{ teams: string[][]; locked: string[]; mode: Mode; comparison: RotationComparison | null } | null>(() => {
    const current = boardHistory.present
    return current ? { teams: current.teams.map(team => [...team]), locked: [...current.locked], mode: current.mode,
      comparison: current.comparison ? { ...current.comparison, previous: current.comparison.previous.map(team => [...team]), skills: { ...current.comparison.skills } } : null } : null
  }, [boardHistory.present])
  const teams = isDrafting ? draftTeams : board?.teams ?? EMPTY_TEAMS
  const locked = board?.locked ?? EMPTY_LOCKED
  const resultMode = isDrafting ? 'captain' : board?.mode ?? 'random'
  const rotationComparison = board?.comparison ?? null
  const [boardNotice, setBoardNotice] = useState('')
  const [animateDeal, setAnimateDeal] = useState(true)
  const [revealCount, setRevealCount] = useState(Infinity)
  const [revealRun, setRevealRun] = useState<RevealRun | null>(null)
  const [copyPending, setCopyPending] = useState(false)
  const [copyRecovery, setCopyRecovery] = useState<{ text: string; request: number } | null>(null)
  const [downloadError, setDownloadError] = useState(false)
  const mounted = useRef(false), historyRef = useRef(boardHistory), epochRef = useRef(boardEpoch)
  const revealGuard = useRef(createTeamRevealGuard<ReturnType<typeof setInterval>>())
  const copyGuard = useRef(createTeamResultGuard()), resultTextRef = useRef('')
  const copyTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const downloads = useRef<ReturnType<typeof createTeamResultDownloads> | null>(null)
  const undoRef = useRef<HTMLButtonElement>(null), redoRef = useRef<HTMLButtonElement>(null)
  const historyFocus = useRef<'undo' | 'redo' | null>(null)
  const [rosterView, setRosterView] = useState<TeamRosterRead | null>(null)
  const rosters = rosterView?.ok ? rosterView.rosters : []
  const [rosterWriting, setRosterWriting] = useState(false)
  const rosterWritingRef = useRef(false)
  const [rostersReady, setRostersReady] = useState(false)
  const [rosterTitle, setRosterTitle] = useState('')
  const [selectedRoster, setSelectedRoster] = useState('')
  const [rosterMessage, setRosterMessage] = useState('')
  const [rosterError, setRosterError] = useState('')
  const [confirmRosterDelete, setConfirmRosterDelete] = useState(false)
  const rosterBusy = !rostersReady || !rosterView?.ok || rosterWriting || isDividing || isDrafting
  const hydrated = useHydrated()

  if (hydrated && !rostersReady) {
    try { setRosterView(readTeamRosters(localStorage)) }
    catch (cause) { setRosterView({ ok: false, error: teamRosterStorageError(cause) }) }
    setRostersReady(true)
    const shared = window.location.hash.startsWith('#board=') ? parseTeamBoard(window.location.hash.slice(7)) : null
    if (shared) { setBoardHistory(createTeamHistory({ teams: shared.teams, locked: [], mode: shared.mode, comparison: null })); setNames(shared.teams.flat()); setSkills(shared.skills); setTeamCount(shared.teams.length); setMode(shared.mode) }
  }

  const invalidateCopy = useCallback(() => {
    copyGuard.current.invalidate()
    if (copyTimer.current !== null) clearTimeout(copyTimer.current)
    copyTimer.current = null; setCopied(false); setCopyPending(false); setCopyRecovery(null)
  }, [])
  useLayoutEffect(() => {
    mounted.current = true
    const reveal = revealGuard.current, copy = copyGuard.current
    return () => {
      mounted.current = false; copy.invalidate()
      const timer = reveal.invalidate(); if (timer !== null) clearInterval(timer)
      if (copyTimer.current !== null) clearTimeout(copyTimer.current)
      downloads.current?.dispose(); downloads.current = null
    }
  }, [])
  useLayoutEffect(() => { historyRef.current = boardHistory }, [boardHistory])
  useLayoutEffect(() => {
    if (!historyFocus.current) return
    const requested = historyFocus.current === 'undo' ? undoRef.current : redoRef.current
    const alternative = historyFocus.current === 'undo' ? redoRef.current : undoRef.current
    historyFocus.current = null
    const target = requested && !requested.disabled ? requested : alternative && !alternative.disabled ? alternative : null
    target?.focus({ preventScroll: true })
  }, [boardHistory])
  const currentBoardEvent = () => mounted.current && epochRef.current === boardEpoch
  const prepareBoardChange = () => {
    const timer = revealGuard.current.invalidate(); if (timer !== null) clearInterval(timer)
    invalidateCopy(); setDownloadError(false); setSelected(null); setBoardNotice('')
    setRevealRun(null); setIsDividing(false); setRevealCount(Infinity)
    const epoch = ++epochRef.current; setBoardEpoch(epoch)
  }
  const installHistory = (next: TeamBoardHistory) => {
    prepareBoardChange(); historyRef.current = next; setBoardHistory(next)
    setDraftTeams([]); setDraftPool([]); setCurrentCaptainTeam(0); setIsDrafting(false)
  }
  const resetBoard = () => { installHistory(createTeamHistory()) }
  const finishReveal = (run: RevealRun | null) => {
    if (!mounted.current || !run) return
    const timer = revealGuard.current.finish(run.generation, run.timer)
    if (timer === null) return
    clearInterval(timer); setRevealRun(null); setRevealCount(Infinity); setIsDividing(false)
  }
  const commitBoard = (next: TeamEditSnapshot, reveal = false) => {
    const updated = commitTeamHistory(historyRef.current, next)
    if (updated === historyRef.current) return false
    installHistory(updated)
    if (!reveal || !animateDeal || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return true
    const started = revealGuard.current.start()
    if (started.previousTimer !== null) clearInterval(started.previousTimer)
    const count = next.teams.flat().length
    let revealed = 0
    const timer = setInterval(() => {
      if (!mounted.current || !revealGuard.current.owns(started.generation, timer)) return
      revealed += Math.max(1, Math.ceil(count / 18)); setRevealCount(revealed)
      if (revealed >= count) finishReveal({ generation: started.generation, timer })
    }, 80)
    if (!revealGuard.current.attach(started.generation, timer)) { clearInterval(timer); return true }
    setRevealRun({ generation: started.generation, timer }); setRevealCount(0); setIsDividing(true)
    return true
  }
  const moveMember = (name: string, target: number) => {
    if (!currentBoardEvent() || isDividing || isDrafting || !board) return
    const next = moveTeamMember(teams, name, target, locked)
    if (!next) return
    commitBoard({ ...board, teams: next, comparison: rotationComparison ? { ...rotationComparison, edited: true } : null })
    setBoardNotice(t('board.moved', { name, number: target + 1 }))
  }
  const selectMember = (name: string) => {
    if (!currentBoardEvent() || isDividing || isDrafting || !board || locked.includes(name) || !teams.flat().includes(name)) return
    if (selected === name) { setSelected(null); return }
    if (selected) {
      const next = swapTeamMembers(teams, selected, name, locked)
      if (next) { commitBoard({ ...board, teams: next, comparison: rotationComparison ? { ...rotationComparison, edited: true } : null }); setBoardNotice(t('board.swapped', { first: selected, second: name })); return }
    }
    setSelected(name)
  }
  const lockMember = (name: string) => {
    if (!currentBoardEvent() || isDividing || isDrafting || !board || !teams.flat().includes(name)) return
    commitBoard({ ...board, locked: locked.includes(name) ? locked.filter(member => member !== name) : [...locked, name] })
  }
  const undoBoard = () => {
    if (!currentBoardEvent() || isDividing || isDrafting) return
    const previous = undoTeamHistory(historyRef.current)
    if (previous === historyRef.current) return
    historyFocus.current = 'undo'; installHistory(previous); setBoardNotice(t('board.undone'))
  }
  const redoBoard = () => {
    if (!currentBoardEvent() || isDividing || isDrafting) return
    const next = redoTeamHistory(historyRef.current)
    if (next === historyRef.current) return
    historyFocus.current = 'redo'; installHistory(next); setBoardNotice(t('history.redone'))
  }

  useEffect(() => {
    const sync = (event: StorageEvent) => {
      if (event.key !== TEAM_ROSTERS_KEY && event.key !== null) return
      try { setRosterView(readTeamRosters(localStorage)); setSelectedRoster(''); setConfirmRosterDelete(false); setRosterError('backup.errors.conflict') }
      catch (cause) { setRosterView({ ok: false, error: teamRosterStorageError(cause) }) }
    }
    window.addEventListener('storage', sync)
    return () => window.removeEventListener('storage', sync)
  }, [])

  const refreshRosters = () => {
    try { setRosterView(readTeamRosters(localStorage)) }
    catch (cause) { setRosterView({ ok: false, error: teamRosterStorageError(cause) }) }
    setRosterError(''); setRosterMessage(''); setSelectedRoster(''); setConfirmRosterDelete(false)
  }

  const persistRosters = async (next: TeamRoster[], message: string) => {
    if (!rosterView?.ok || rosterWritingRef.current) return false
    const expected = rosterView
    rosterWritingRef.current = true; setRosterWriting(true)
    try {
      const result = await withTeamRosterLock(() => writeTeamRosters(next, expected.raw, window.localStorage))
      if (!result.ok) { setRosterError(`backup.errors.${result.error}`); setRosterMessage(''); return false }
      setRosterView({ ok: true, raw: result.raw, rosters: result.rosters }); setRosterMessage(message); setRosterError(''); return true
    }
    catch (cause) { setRosterError(`backup.errors.${teamRosterStorageError(cause)}`); setRosterMessage(''); return false }
    finally { rosterWritingRef.current = false; setRosterWriting(false) }
  }

  const saveRoster = async (replace = false) => {
    if (rosterBusy) return
    setRosterMessage(''); setRosterError('')
    const existing = rosters.find(r => r.id === selectedRoster)
    const title = replace ? existing?.title : rosterTitle.trim()
    if (!title) { setRosterError('rosters.nameRequired'); return }
    const members = names.map(n => n.trim()).filter(Boolean)
    if (members.length < teamCount || members.length > 200 || members.some(n => n.length > 80) || new Set(members).size !== members.length) { setRosterError('rosters.invalidMembers'); return }
    if (!replace && rosters.length >= MAX_TEAM_ROSTERS) { setRosterError('rosters.full'); return }
    if (!replace && rosters.some(r => r.title.toLocaleLowerCase() === title.toLocaleLowerCase())) { setRosterError('rosters.duplicate'); return }
    const next: TeamRoster = { id: replace && existing ? existing.id : crypto.randomUUID(), title, names: members, skills: Object.fromEntries(members.map(n => [n, skillOf(n)])), teamCount, mode, updatedAt: Date.now(), ...(replace && existing?.importOrigin ? { importOrigin: { ...existing.importOrigin } } : {}) }
    if (await persistRosters([next, ...rosters.filter(r => r.id !== next.id)], 'rosters.saved')) { setSelectedRoster(next.id); setRosterTitle(''); setConfirmRosterDelete(false) }
  }

  const loadRoster = () => {
    const roster = rosters.find(r => r.id === selectedRoster)
    if (!roster || rosterBusy) return
    try { if (!rosterView?.ok || localStorage.getItem(TEAM_ROSTERS_KEY) !== rosterView.raw) { setRosterError('backup.errors.conflict'); return } }
    catch (cause) { setRosterError(`backup.errors.${teamRosterStorageError(cause)}`); return }
    resetBoard()
    setNames([...roster.names]); setAbsentNames(new Set()); setSkills({ ...roster.skills }); setTeamCount(roster.teamCount); setMode(roster.mode)
    setNewName(''); setBulkText(''); setShowBulk(false); setConfirmRosterDelete(false)
    setRosterMessage('rosters.loaded'); setRosterError('')
  }

  const removeRoster = async () => {
    if (!selectedRoster || rosterBusy) return
    if (await persistRosters(rosters.filter(r => r.id !== selectedRoster), 'rosters.deleted')) { setSelectedRoster(''); setConfirmRosterDelete(false) }
  }

  const validNames = useMemo(() => attendingTeamMembers(names, absentNames), [names, absentNames])

  const changeAttendance = (name: string, attending: boolean) => {
    if (isDividing || isDrafting || !names.includes(name) || absentNames.has(name) === !attending) return
    resetBoard()
    setAbsentNames(previous => setTeamAttendance(previous, name, attending))
  }
  const changeAllAttendance = (attending: boolean) => {
    if (isDividing || isDrafting) return
    resetBoard()
    setAbsentNames(attending ? new Set() : new Set(names))
  }

  const shuffle = <T,>(arr: T[]): T[] => {
    const a = [...arr]
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]]
    }
    return a
  }

  const handleDivide = () => {
    if (!currentBoardEvent() || isDividing || isDrafting || validNames.length < teamCount) return
    if (mode === 'captain') {
      const captains = validNames.slice(0, teamCount)
      const pool = shuffle(validNames.slice(teamCount))
      const initial: string[][] = captains.map(c => [c])
      if (!pool.length) installHistory(createTeamHistory({ teams: initial, locked: [], mode: 'captain', comparison: null }))
      else {
        installHistory(createTeamHistory()); setDraftTeams(initial); setDraftPool(pool); setCurrentCaptainTeam(0); setIsDrafting(true)
      }
      return
    }
    commitBoard({ teams: distributeTeams(validNames, teamCount, skills, mode === 'balanced', teams, locked), locked, mode, comparison: null }, true)
  }

  const handleRotate = () => {
    if (!currentBoardEvent() || isDividing || isDrafting || mode === 'captain') return
    const next = createTeamRotation(validNames, teamCount, skills, mode, teams, locked)
    if (!next) { setBoardNotice(t('rotation.rosterMismatch')); return }
    commitBoard({ teams: next.teams, locked, mode, comparison: { previous: teams.map(team => [...team]), baselineSkillGap: next.baselineSkillGap, skills: Object.fromEntries(validNames.map(name => [name, skillOf(name)])), balanceLimited: next.balanceLimited, edited: false } }, true)
  }

  const handleDraftPick = (name: string) => {
    if (!currentBoardEvent() || !isDrafting || !draftPool.includes(name)) return
    const next = teams.map((team, i) => i === currentCaptainTeam ? [...team, name] : team)
    const nextPool = draftPool.filter(n => n !== name)
    if (!nextPool.length) installHistory(createTeamHistory({ teams: next, locked: [], mode: 'captain', comparison: null }))
    else { prepareBoardChange(); setDraftTeams(next); setDraftPool(nextPool); setCurrentCaptainTeam((currentCaptainTeam + 1) % teamCount) }
  }

  const handleAddName = () => {
    const trimmed = newName.trim()
    if (trimmed && !names.includes(trimmed) && names.length < 200 && trimmed.length <= 80) {
      resetBoard()
      setNames(prev => [...prev, trimmed])
      setAbsentNames(previous => setTeamAttendance(previous, trimmed, true))
    }
    setNewName('')
  }

  const handleBulkImport = () => {
    const parsed = [...new Set(bulkText.split(/[\n,]/).map(n => n.trim().slice(0, 80)).filter(Boolean))].slice(0, 200)
    if (parsed.length > 0) { resetBoard(); setNames(parsed); setAbsentNames(new Set()) }
    setBulkText('')
    setShowBulk(false)
  }

  const handlePreset = (preset: Preset) => {
    resetBoard()
    setNames(preset.names)
    setAbsentNames(new Set())
    setSkills({})
  }

  const exportSnapshot = useMemo(() => board ? createTeamResultSnapshot(board, skills, { teamLabel: t('teamLabel'), memberUnit: t('memberUnit'), skillSum: sum => t('skillSum', { sum }) }) : null, [board, skills, t])
  const resultText = exportSnapshot?.text ?? ''
  const [previousResultText, setPreviousResultText] = useState(resultText)
  if (previousResultText !== resultText) { setPreviousResultText(resultText); setCopied(false); setCopyPending(false); setCopyRecovery(null) }
  useLayoutEffect(() => {
    resultTextRef.current = resultText; copyGuard.current.invalidate()
    if (copyTimer.current !== null) clearTimeout(copyTimer.current)
    copyTimer.current = null
  }, [resultText])
  const canExport = teams.length > 0 && !isDrafting && !isDividing
  const copyResult = async () => {
    if (!currentBoardEvent() || !canExport || !exportSnapshot) return
    const actions = copyGuard.current, token = actions.begin(), text = exportSnapshot.text
    const current = () => mounted.current && epochRef.current === boardEpoch && actions.isCurrent(token) && resultTextRef.current === text
    if (copyTimer.current !== null) clearTimeout(copyTimer.current)
    copyTimer.current = null; setCopied(false); setCopyPending(true)
    const outcome = await copyTeamResultText(text, current)
    if (!current() || outcome === 'stale') return
    setCopyPending(false)
    if (outcome === 'copied') {
      setCopyRecovery(null); setCopied(true)
      copyTimer.current = setTimeout(() => { if (current()) { setCopied(false); copyTimer.current = null } }, 2000)
    } else setCopyRecovery({ text, request: token.request })
  }
  const downloadResult = () => {
    if (!currentBoardEvent() || !canExport || !exportSnapshot) return
    const snapshot = exportSnapshot
    downloads.current ??= createTeamResultDownloads()
    const outcome = downloads.current.download(snapshot, () => mounted.current && epochRef.current === boardEpoch && resultTextRef.current === snapshot.text)
    if (outcome !== 'stale') setDownloadError(outcome === 'failed')
  }

  const teamSizes = teams.map(team => team.length)
  const teamScores = teams.map(team => team.reduce((sum, name) => sum + skillOf(name), 0))
  const repeatedPairs = useMemo(() => rotationComparison ? countRepeatedTeammatePairs(teams, rotationComparison.previous) : null, [teams, rotationComparison])
  const previousPairs = useMemo(() => rotationComparison ? countTeammatePairs(rotationComparison.previous) : null, [rotationComparison])
  const rotationRosterMatches = useMemo(() => hasMatchingTeamRoster(validNames, teamCount, teams), [validNames, teamCount, teams])
  const rotationSkillsMatch = rotationComparison ? teams.flat().every(name => skillOf(name) === rotationComparison.skills[name]) : false
  const shareCode = teams.length && !isDrafting && !isDividing ? encodeTeamBoard({ teams, skills: Object.fromEntries(teams.flat().map(name => [name, skillOf(name)])), mode: resultMode }) : null
  const shareUrl = hydrated && shareCode ? `${window.location.origin}/team-divider/#board=${shareCode}` : undefined

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-fg">{t('title')}</h1>
        <p className="text-sm text-muted mt-1">{t('description')}</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left panel */}
        <fieldset disabled={isDividing || isDrafting} className="lg:col-span-1 space-y-4 min-w-0">
          {teams.length > 0 && <MobileResultLink href="#team-divider-result" label={t('rosters.resultLabel')} value={t('rosters.resultSummary', { teams: teams.length, members: teams.flat().length })} />}
          <section className="ui-card p-4 space-y-3" aria-labelledby="team-rosters-title">
            <h2 id="team-rosters-title" className="text-sm font-semibold text-fg">{t('rosters.title')}</h2>
            <p className="text-xs text-muted">{t('rosters.hint')}</p>
            <label className="block text-sm text-body">{t('rosters.name')}
              <input value={rosterTitle} onChange={e => setRosterTitle(e.target.value)} maxLength={40} placeholder={t('rosters.placeholder')} className="ui-field mt-1 px-3 py-3 text-base" disabled={rosterBusy} />
            </label>
            <button onClick={() => saveRoster()} disabled={rosterBusy || !rosterTitle.trim()} className="ui-btn-soft min-h-11 w-full px-3 py-2 text-sm disabled:opacity-40">{t('rosters.save')}</button>
            {rosters.length > 0 && <>
              <label className="block text-sm text-body">{t('rosters.savedList', { count: rosters.length })}
                <select className="ui-field mt-1 px-3 py-3 text-base" value={selectedRoster} onChange={e => { setSelectedRoster(e.target.value); setConfirmRosterDelete(false); setRosterMessage('') }} disabled={rosterBusy}>
                  <option value="">{t('rosters.choose')}</option>
                  {rosters.map(r => <option key={r.id} value={r.id}>{r.title} · {t('rosters.members', { count: r.names.length })}</option>)}
                </select>
              </label>
              <div className="flex flex-wrap gap-2">
                <button onClick={loadRoster} disabled={rosterBusy || !selectedRoster} className="ui-btn min-h-11 px-3 py-2 text-sm disabled:opacity-40">{t('rosters.load')}</button>
                <button onClick={() => saveRoster(true)} disabled={rosterBusy || !selectedRoster} className="ui-btn-soft min-h-11 px-3 py-2 text-sm disabled:opacity-40">{t('rosters.update')}</button>
                <button onClick={() => setConfirmRosterDelete(true)} disabled={rosterBusy || !selectedRoster} className="ui-btn-soft min-h-11 px-3 py-2 text-sm disabled:opacity-40">{t('rosters.delete')}</button>
              </div>
              {confirmRosterDelete && <div className="bg-subtle p-3 rounded-xl space-y-2">
                <p className="text-sm text-body">{t('rosters.confirm', { name: rosters.find(r => r.id === selectedRoster)?.title ?? '' })}</p>
                <div className="flex flex-wrap gap-2">
                  <button onClick={removeRoster} disabled={rosterBusy} className="ui-btn min-h-11 px-3 py-2 text-sm">{t('rosters.confirmDelete')}</button>
                  <button onClick={() => setConfirmRosterDelete(false)} className="ui-btn-soft min-h-11 px-3 py-2 text-sm">{t('rosters.cancel')}</button>
                </div>
              </div>}
            </>}
            {rosterMessage && <p role="status" className="text-sm text-sub">{t(rosterMessage)}</p>}
            {rosterError && <p role="alert" className="text-sm text-body">{t(rosterError)}</p>}
            {rosterView && !rosterView.ok && <p role="alert" className="text-sm text-body">{t(`backup.errors.${rosterView.error}`)}</p>}
            {(rosterError || (rosterView && !rosterView.ok)) && <button type="button" onClick={refreshRosters} disabled={rosterWriting || isDividing || isDrafting} className="ui-btn-soft min-h-11 px-3 py-2 text-sm">{t('backup.refresh')}</button>}
            <TeamRosterBackup view={rosterView} disabled={!rostersReady || rosterWriting || isDividing || isDrafting} onImported={next => { setRosterView(next); setSelectedRoster(''); setConfirmRosterDelete(false); setRosterError(''); setRosterMessage('') }} />
          </section>
          {/* Presets */}
          <div className={`${glassCard} ${glassInset} p-4`}>
            <p className="text-xs font-semibold text-muted uppercase mb-2">{t('presets.label')}</p>
            <div className="flex flex-wrap gap-2">
              {presets.map(preset => (
                <button
                  key={preset.key}
                  onClick={() => handlePreset(preset)}
                  className="min-h-11 px-3 py-1 text-sm bg-soft hover:bg-subtle text-body rounded-lg transition-colors"
                >
                  {t(`presets.${preset.key}.label`)}
                </button>
              ))}
            </div>
          </div>

          {/* Participant list */}
          <div className={`${glassCard} ${glassInset} p-4 space-y-3`}>
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-body">

                {t('participants')} ({names.length})
              </p>
              <button
                onClick={() => setShowBulk(!showBulk)}
                className="text-sm text-primary min-h-11 px-2"
              >
                {t('bulkInput')}
              </button>
            </div>

            <div data-team-attendance className="space-y-2">
              <p className="text-sm font-semibold text-fg">{t('attendance.title')}</p>
              <p data-attending-count={validNames.length} data-roster-count={names.length} className="text-sm text-primary tabular-nums">{t('attendance.summary', { total: names.length, attending: validNames.length })}</p>
              <p className="text-xs text-muted">{t('attendance.hint')}</p>
              <div className="flex flex-wrap gap-2">
                <button type="button" onClick={() => changeAllAttendance(true)} disabled={isDividing || isDrafting || !absentNames.size} className="ui-btn-soft min-h-11 px-3 py-2 text-sm disabled:opacity-40">{t('attendance.all')}</button>
                <button type="button" onClick={() => changeAllAttendance(false)} disabled={isDividing || isDrafting || !validNames.length} className="ui-btn-soft min-h-11 px-3 py-2 text-sm disabled:opacity-40">{t('attendance.none')}</button>
              </div>
              <p className="text-xs text-muted">{t('attendance.resetHint')}</p>
            </div>

            {showBulk && (
              <div className="space-y-2">
                <textarea
                  aria-label={t('bulkInput')} maxLength={20000} value={bulkText}
                  onChange={e => setBulkText(e.target.value)}
                  placeholder={t('bulkPlaceholder')}
                  rows={4}
                  className={`${glassInput} px-3 py-3 text-base resize-none`}
                />
                <button
                  onClick={handleBulkImport}
                  className="w-full min-h-11 py-2 text-sm bg-primary text-white rounded-lg hover:opacity-90"
                >
                  {t('import')}
                </button>
              </div>
            )}

            <div className="flex gap-2">
              <input
                maxLength={80} aria-label={t('addPlaceholder')} value={newName}
                onChange={e => setNewName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleAddName()}
                placeholder={t('addPlaceholder')}
                className={`${glassInput} min-w-0 flex-1 px-3 py-3 text-base`}
              />
              <button
                onClick={handleAddName}
                aria-label={t('add')}
                className="min-w-11 min-h-11 p-2 bg-primary text-white rounded-lg hover:opacity-90"
              >
                <Plus className="w-4 h-4" aria-hidden="true" />
              </button>
            </div>

            {mode === 'balanced' && (
              <p className="text-xs text-sub bg-subtle rounded-lg px-3 py-2">{t('skillHint')}</p>
            )}

            <ul className={`space-y-1 overflow-y-auto ${mode === 'balanced' ? 'max-h-72' : 'max-h-48'}`}>
              {names.map((name, i) => (
                <li key={i} className="flex items-center justify-between gap-2 px-2 py-1 rounded bg-subtle">
                  <label className="flex min-h-11 min-w-0 flex-1 items-center gap-2">
                    <input type="checkbox" checked={!absentNames.has(name)} onChange={event => changeAttendance(name, event.target.checked)} disabled={isDividing || isDrafting} aria-label={t('attendance.attending', { name })} className="h-5 w-5 shrink-0 accent-primary" />
                    <span className={`truncate text-sm ${absentNames.has(name) ? 'text-muted' : 'text-body'}`}>{name}</span>
                  </label>
                  {mode === 'balanced' && name.trim() && (
                    <select
                      value={skillOf(name)}
                      onChange={e => { const value = Number(e.target.value); if (resultMode === 'balanced' && teams.some(team => team.includes(name)) && value !== skillOf(name)) invalidateCopy(); setSkills(prev => ({ ...prev, [name]: value })) }}
                      aria-label={t('skillFor', { name })}
                      className="ui-field w-auto min-h-11 px-2 py-1 text-base tabular-nums shrink-0"
                    >
                      {[5, 4, 3, 2, 1].map(s => (
                        <option key={s} value={s}>{t('skillOption', { level: s })}</option>
                      ))}
                    </select>
                  )}
                  <button
                    onClick={() => { resetBoard(); setNames(prev => prev.filter((_, idx) => idx !== i)); setAbsentNames(previous => setTeamAttendance(previous, name, true)) }}
                    aria-label={t('removeName', { name })}
                    className="text-muted hover:text-primary shrink-0 min-w-11 min-h-11 flex items-center justify-center"
                  >
                    <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                  </button>
                </li>
              ))}
            </ul>
          </div>

          {/* Settings */}
          <div className={`${glassCard} ${glassInset} p-4 space-y-4`}>
            <div>
              <p className="text-sm font-semibold text-body mb-2">{t('teamCount')}</p>
              <div className="flex gap-2 flex-wrap">
                {[2, 3, 4, 5, 6, 7, 8].map(n => (
                  <button
                    key={n}
                    onClick={() => { resetBoard(); setTeamCount(n) }}
                    className={`min-w-11 min-h-11 rounded-lg text-sm font-medium transition-colors ${
                      teamCount === n
                        ? 'bg-primary text-white'
                        : 'bg-soft text-body hover:bg-subtle'
                    }`}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <p className="text-sm font-semibold text-body mb-2">{t('mode.label')}</p>
              <div className="space-y-1.5">
                {(['random', 'balanced', 'captain'] as Mode[]).map(m => (
                  <label key={m} className="flex min-h-11 items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="mode"
                      value={m}
                      checked={mode === m}
                      onChange={() => setMode(m)}
                      className="accent-primary"
                    />
                    <span className="text-sm text-body">{t(`mode.${m}`)}</span>
                  </label>
                ))}
              </div>
            </div>

            <label className="flex items-center gap-2 text-sm text-body min-h-11"><input type="checkbox" checked={animateDeal} onChange={e => setAnimateDeal(e.target.checked)} className="w-5 h-5 accent-primary" />{t('board.animate')}</label>
            <p className="text-xs text-muted">{t('board.inputHint')}</p>
            <button
              data-team-divide="initial"
              onClick={handleDivide}
              disabled={isDividing || validNames.length < teamCount}
              className="w-full py-3 bg-primary hover:opacity-90 text-white rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-all"
            >
              <Shuffle className={`w-4 h-4 ${isDividing ? 'animate-spin' : ''}`} />
              {isDividing ? t('dividing') : t('divide')}
            </button>

            {validNames.length < teamCount && (
              <p role="alert" className="text-sm text-body text-center">
                {t('attendance.notEnough', { count: validNames.length, teams: teamCount })}
              </p>
            )}
          </div>
        </fieldset>

        {/* Right panel — results */}
        <div id="team-divider-result" data-team-history-past={boardHistory.past.length} data-team-history-future={boardHistory.future.length} data-team-board-epoch={boardEpoch} data-team-result-mode={resultMode} data-team-drafting={isDrafting} data-team-dividing={isDividing} className="lg:col-span-2 space-y-4 scroll-mt-20">
          {/* Captain draft pool */}
          {isDrafting && (
            <div className={`${glassCard} ${glassInset} p-4`}>
              <p className="text-sm font-semibold text-body mb-3">
                {t('draftTurn', { team: currentCaptainTeam + 1 })}
              </p>
              <button onClick={resetBoard} className="ui-btn-soft min-h-11 px-3 py-2 text-sm mb-3">{t('board.cancelDraft')}</button>
              <div className="flex flex-wrap gap-2">
                {draftPool.map(name => (
                  <button
                    key={name}
                    data-team-draft-pick={name} onClick={() => handleDraftPick(name)}
                    className="min-h-11 px-3 py-2 text-sm rounded-xl border border-line text-body bg-soft hover:bg-subtle transition-colors font-medium"
                  >
                    {name}
                  </button>
                ))}
              </div>
            </div>
          )}

          {teams.length > 0 ? (
            <>
              <div className="ui-card p-4 sm:p-5 space-y-3">
                <h2 className="font-bold text-fg">{t('board.title')}</h2>
                <p className="text-sm text-sub">{t('board.hint')}</p>
                <div className="flex flex-wrap gap-2 text-sm tabular-nums">
                  <span className="rounded-xl bg-subtle px-3 py-2 text-body">{t('board.sizeGap', { count: Math.max(...teamSizes) - Math.min(...teamSizes) })}</span>
                  {resultMode === 'balanced' && <span className="rounded-xl bg-subtle px-3 py-2 text-body">{t('board.skillGap', { count: Math.max(...teamScores) - Math.min(...teamScores) })}</span>}
                  {locked.length > 0 && <span className="rounded-xl bg-primary-soft px-3 py-2 text-primary">{t('board.lockedCount', { count: locked.length })}</span>}
                </div>
                {selected && <p role="status" className="text-sm text-primary">{t('board.selected', { name: selected })}</p>}
                {boardNotice && <p role="status" className="text-sm text-sub">{boardNotice}</p>}
                {isDividing && <div className="flex items-center justify-between gap-3"><p role="status" className="text-sm text-primary">{t('board.dealing', { count: Math.min(revealCount, validNames.length), total: validNames.length })}</p><button data-team-reveal-skip="" onClick={() => finishReveal(revealRun)} className="ui-btn-soft min-h-11 px-3 py-2 text-sm">{t('board.skip')}</button></div>}
                {locked.length > 0 && <p className="text-xs text-muted">{t('board.lockHint')}</p>}
              </div>
              <InteractiveTeamBoard teams={teams} skills={skills} locked={locked} selected={selected} disabled={isDividing || isDrafting} showSkills={resultMode === 'balanced'} onSelect={selectMember} onMove={moveMember} onLock={lockMember} revealCount={revealCount} interactionEpoch={boardEpoch} />
              {!isDrafting && <section className="ui-card p-4 sm:p-5 space-y-3" aria-labelledby="team-rotation-title">
                <h2 id="team-rotation-title" className="text-sm font-semibold text-fg">{t('rotation.title')}</h2>
                <p className="text-sm text-sub">{t('rotation.description')}</p>
                {mode === 'captain' ? <p className="text-sm text-muted">{t('rotation.captainHint')}</p> : <>
                  <button data-team-rotate="" onClick={handleRotate} disabled={isDividing || !rotationRosterMatches} className="ui-btn min-h-11 max-w-full px-4 py-3 text-sm whitespace-normal disabled:opacity-40">{t('rotation.action')}</button>
                  {!rotationRosterMatches && <p className="text-sm text-body">{t('rotation.rosterMismatch')}</p>}
                </>}
                {rotationComparison && <div data-team-rotation className="rounded-xl bg-subtle p-3 space-y-2" aria-live="polite" aria-atomic="true">
                  <p data-repeated-pairs={repeatedPairs} className="text-base font-semibold text-fg tabular-nums">{t('rotation.repeatedPairs', { count: repeatedPairs ?? 0 })}</p>
                  <p data-previous-pairs={previousPairs} className="text-sm text-sub">{t('rotation.previousPairs', { count: previousPairs ?? 0 })}</p>
                  {rotationComparison.edited ? <p className="text-xs text-muted">{t('rotation.editedHint')}</p> : rotationComparison.baselineSkillGap !== null && rotationSkillsMatch && <p className="text-xs text-muted">{t('rotation.skillBaseline', { count: rotationComparison.baselineSkillGap })}</p>}
                  {rotationComparison.balanceLimited && !rotationComparison.edited && <p className="text-sm text-body">{t('rotation.lockedLimit')}</p>}
                </div>}
                <p className="text-xs text-muted">{t('rotation.limitHint', { count: MAX_ROTATION_CANDIDATES })}</p>
                {rotationComparison && <p className="text-xs text-muted">{t('rotation.sessionHint')}</p>}
              </section>}
              {!isDrafting && <div className="flex flex-wrap gap-2">
                <button data-team-divide="again" onClick={handleDivide} disabled={isDividing} className="ui-btn min-h-11 px-4 py-2 text-sm disabled:opacity-40"><Shuffle className="w-4 h-4" />{t('redivide')}</button>
                <button ref={undoRef} data-team-undo="" onClick={undoBoard} disabled={isDividing || !boardHistory.past.length} className="ui-btn-soft min-h-11 px-4 py-2 text-sm disabled:opacity-40">{t('board.undo')}</button>
                <button ref={redoRef} data-team-redo="" onClick={redoBoard} disabled={isDividing || !boardHistory.future.length} className="ui-btn-soft min-h-11 px-4 py-2 text-sm disabled:opacity-40">{t('history.redo')}</button>
                <button data-team-result-copy="" data-team-result-copied={copied} onClick={copyResult} disabled={!canExport || copyPending} className="ui-btn-soft min-h-11 px-4 py-2 text-sm disabled:opacity-40">{copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}{copied ? t('copied') : copyPending ? t('resultActions.copying') : t('copy')}</button>
                <button data-team-result-download="" onClick={downloadResult} disabled={!canExport} className="ui-btn-soft min-h-11 px-4 py-2 text-sm disabled:opacity-40">{t('resultActions.download')}</button>
              </div>}
              {!isDrafting && <p className="text-xs text-muted">{t('history.hint')} {t('history.scopeHint')}</p>}
              {!isDrafting && <p className="text-xs text-muted">{t('resultActions.hint')}</p>}
              {copied && <p role="status" className="text-sm text-sub">{t('copied')}</p>}
              {downloadError && <p role="alert" className="text-sm text-body">{t('resultActions.downloadFailed')}</p>}
              {copyRecovery && <TeamResultCopyRecovery key={copyRecovery.request} text={copyRecovery.text} busy={copyPending} onRetry={copyResult} onClose={invalidateCopy} />}
              {shareUrl && <><ShareResult card={{ tool: t('title'), label: t('board.title'), headline: t('rosters.resultSummary', { members: teams.flat().length, teams: teams.length }), rows: teams.map((team, i) => ({ label: t('board.team', { number: i + 1 }), value: team.join(', ') })) }} url={shareUrl} /><p className="text-xs text-muted">{t('board.shareHint')}</p></>}
            </>
          ) : (
            <div className={`${glassCard} ${glassInset} p-12 flex flex-col items-center justify-center text-center`}>
              <Users className="w-12 h-12 text-faint mb-4" />
              <p className="text-muted">{t('empty')}</p>
            </div>
          )}
        </div>
      </div>

      <GuideSection namespace="teamDivider" panelId="team-divider-guide" />
    </div>
  )
}
