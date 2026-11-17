'use client'

import { useState } from 'react'
import { useTranslations } from '@/lib/i18n'
import '@/lib/i18n/ns/teamDivider'
import { LockKeyhole, LockKeyholeOpen } from 'lucide-react'
import { rating } from '@/utils/teamBoard'

export default function InteractiveTeamBoard({ teams, skills, locked, selected, disabled, showSkills, onSelect, onMove, onLock, revealCount, interactionEpoch = 0 }: {
  teams: string[][]; skills: Record<string, number>; locked: string[]; selected: string | null; disabled: boolean; showSkills: boolean
  onSelect: (name: string) => void; onMove: (name: string, target: number) => void; onLock: (name: string) => void; revealCount: number; interactionEpoch?: number
}) {
  const t = useTranslations('teamDivider')
  const [dragged, setDragged] = useState<string | null>(null)
  const [over, setOver] = useState<number | null>(null)
  const [lastEpoch, setLastEpoch] = useState(interactionEpoch)
  if (lastEpoch !== interactionEpoch) { setLastEpoch(interactionEpoch); setDragged(null); setOver(null) }
  const sums = teams.map(team => team.reduce((sum, name) => sum + rating(skills, name), 0))
  const maxSum = Math.max(1, ...sums), maxCount = Math.max(1, ...teams.map(team => team.length))
  const order = new Map<string, number>()
  for (let row = 0; row < maxCount; row++) for (const team of teams) if (team[row]) order.set(team[row], order.size)
  const moving = dragged ?? selected
  return <div className={`grid grid-cols-1 sm:grid-cols-2 gap-3 ${teams.length > 2 ? 'xl:grid-cols-3' : ''}`}>
    {teams.map((team, index) => {
      const canMove = !!moving && !locked.includes(moving) && !team.includes(moving) && !disabled
      return <section key={index} data-team={index} aria-label={t('board.team', { number: index + 1 })}
        onDragOver={event => { if (canMove) { event.preventDefault(); event.dataTransfer.dropEffect = 'move'; setOver(index) } }}
        onDragLeave={event => { if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setOver(null) }}
        onDrop={event => { event.preventDefault(); if (canMove && dragged) onMove(dragged, index); setDragged(null); setOver(null) }}
        className={`ui-card p-4 min-w-0 transition-colors ${over === index ? 'border-primary bg-primary-soft' : ''}`}>
        <div className="flex items-baseline justify-between gap-2">
          <h3 className="font-bold text-fg">{t('board.team', { number: index + 1 })}</h3>
          <span className="text-sm text-sub tabular-nums">{t('board.people', { count: team.length })}</span>
        </div>
        <div className="h-1.5 rounded-full bg-track mt-3 overflow-hidden" aria-hidden="true"><div className="h-full bg-primary motion-safe:transition-[width] motion-safe:duration-300" style={{ width: `${(showSkills ? sums[index] / maxSum : team.length / maxCount) * 100}%` }} /></div>
        {showSkills && <p className="text-xs text-sub mt-2 tabular-nums">{t('skillSum', { sum: sums[index] })}</p>}
        <ul className="space-y-2 mt-4 min-h-12">
          {team.map(name => {
            const fixed = locked.includes(name), visible = (order.get(name) ?? 0) < revealCount
            return <li key={name} data-member={name} aria-hidden={!visible} draggable={!disabled && !fixed && visible}
              onDragStart={event => { if (disabled || fixed) { event.preventDefault(); return }; event.dataTransfer.setData('text/plain', name); event.dataTransfer.effectAllowed = 'move'; setDragged(name) }}
              onDragEnd={() => { setDragged(null); setOver(null) }}
              className={`flex items-center gap-1 rounded-xl border min-w-0 motion-safe:transition-[opacity,transform] motion-safe:duration-300 ${selected === name ? 'bg-primary-soft border-primary text-primary' : 'bg-subtle border-transparent text-body'} ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'}`}>
              <button type="button" aria-label={t('board.select', { name })} aria-pressed={selected === name} disabled={disabled || !visible || fixed} onClick={() => onSelect(name)} className="flex-1 min-w-0 min-h-11 px-3 py-2 text-left text-sm disabled:cursor-default break-words">
                {name}{showSkills && <span className="ml-2 text-xs text-muted tabular-nums">{rating(skills, name)}</span>}
              </button>
              <button type="button" onClick={() => onLock(name)} disabled={disabled || !visible} aria-label={t(fixed ? 'board.unlock' : 'board.lock', { name })} aria-pressed={fixed} className={`min-h-11 min-w-11 flex items-center justify-center rounded-xl ${fixed ? 'text-primary' : 'text-muted hover:bg-soft'}`}>
                {fixed ? <LockKeyhole className="w-4 h-4" /> : <LockKeyholeOpen className="w-4 h-4" />}
              </button>
            </li>
          })}
        </ul>
        {team.length === 0 && <p className="text-sm text-muted py-3">{t('board.emptyTeam')}</p>}
        {moving && <button type="button" disabled={!canMove} onClick={() => moving && onMove(moving, index)} className="ui-btn-soft w-full min-h-11 mt-3 px-3 py-2 text-sm disabled:opacity-40">{t('board.moveHere', { number: index + 1 })}</button>}
      </section>
    })}
  </div>
}
