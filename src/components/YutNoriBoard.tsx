'use client'

import { useTranslations } from '@/lib/i18n'
import '@/lib/i18n/ns/yutNori'
import { ROUTES, stationOf, type Move, type Throw, type YutState } from '@/utils/gameAI/yutNori'

/** 사람 순서대로 말 색(게임 말이라 토큰 대신 구분되는 색) */
export const PLAYER_COLORS = ['bg-blue-500', 'bg-red-500', 'bg-emerald-500', 'bg-amber-500'] as const
export const THROW_KEY: Record<Throw, string> = { [-1]: 'backdo', 1: 'do', 2: 'gae', 3: 'geol', 4: 'yut', 5: 'mo' } as Record<Throw, string>

// 자리 좌표(말판 100×100 기준 %). 0 참먹이 오른쪽 아래에서 시계 반대 방향.
const LO = 7, HI = 93, STEP = (HI - LO) / 5
const XY: [number, number][] = []
for (let i = 0; i < 5; i++) {
  XY[i] = [HI, HI - STEP * i]
  XY[5 + i] = [HI - STEP * i, LO]
  XY[10 + i] = [LO, LO + STEP * i]
  XY[15 + i] = [LO + STEP * i, HI]
}
XY[22] = [50, 50]
const between = (a: number, b: number, f: number): [number, number] =>
  [XY[a][0] + (XY[b][0] - XY[a][0]) * f, XY[a][1] + (XY[b][1] - XY[a][1]) * f]
XY[20] = between(5, 22, 1 / 3); XY[21] = between(5, 22, 2 / 3)
XY[23] = between(22, 15, 1 / 3); XY[24] = between(22, 15, 2 / 3)
XY[25] = between(10, 22, 1 / 3); XY[26] = between(10, 22, 2 / 3)
XY[27] = between(22, 0, 1 / 3); XY[28] = between(22, 0, 2 / 3)

const BIG = new Set([0, 5, 10, 15, 22])
// 모서리·방 이름 자리(말판 바깥 여백 / 방 아래)
const LABELS: { s: number; x: number; y: number; anchor: 'start' | 'end' | 'middle' }[] = [
  { s: 0, x: 97, y: 99.2, anchor: 'end' }, { s: 5, x: 97, y: 3, anchor: 'end' },
  { s: 10, x: 3, y: 3, anchor: 'start' }, { s: 15, x: 3, y: 99.2, anchor: 'start' },
  { s: 22, x: 50, y: 58.5, anchor: 'middle' },
]

const pos = (s: number) => ({ left: `${XY[s][0]}%`, top: `${XY[s][1]}%` })

interface YutNoriBoardProps {
  game: YutState
  names: string[]
  /** 지금 고를 수 있는 내 말(같은 자리 말 중 대표) */
  pickable: Set<number>
  selected: number | null
  dests: Move[]
  lastTo: number | null
  onPick: (piece: number) => void
  onMove: (m: Move) => void
}

export default function YutNoriBoard({ game, names, pickable, selected, dests, lastTo, onPick, onMove }: YutNoriBoardProps) {
  const t = useTranslations('yutNori')
  const stations = t.raw('stations') as string[]
  const colors = t.raw('colors') as string[]

  // 판 위 말을 자리별로 묶는다(한 자리엔 한 사람 말만 있다 — 남의 말은 잡히므로)
  const groups: { station: number; player: number; pieces: number[] }[] = []
  game.pieces.forEach((row, player) => row.forEach((p, i) => {
    const station = stationOf(p)
    if (station === null) return
    const g = groups.find(x => x.station === station)
    if (g) g.pieces.push(i)
    else groups.push({ station, player, pieces: [i] })
  }))

  return (
    <div
      data-yut-board
      tabIndex={0}
      aria-label={t('board.label')}
      className="relative mx-auto aspect-square w-full max-w-[460px] rounded-2xl bg-subtle focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary"
    >
      <svg viewBox="0 0 100 100" className="absolute inset-0 h-full w-full" aria-hidden="true">
        <rect x={LO} y={LO} width={HI - LO} height={HI - LO} className="fill-none stroke-line-strong" strokeWidth={0.6} />
        <line x1={HI} y1={HI} x2={LO} y2={LO} className="stroke-line-strong" strokeWidth={0.6} />
        <line x1={HI} y1={LO} x2={LO} y2={HI} className="stroke-line-strong" strokeWidth={0.6} />
        {lastTo !== null && <circle cx={XY[lastTo][0]} cy={XY[lastTo][1]} r={7} className="fill-primary-soft" />}
        {XY.map(([x, y], s) => BIG.has(s) ? (
          <g key={s}>
            <circle cx={x} cy={y} r={4.6} className="fill-surface stroke-line-strong" strokeWidth={0.6} />
            <circle cx={x} cy={y} r={2.8} className="fill-none stroke-line-strong" strokeWidth={0.5} />
          </g>
        ) : (
          <circle key={s} cx={x} cy={y} r={2.8} className="fill-surface stroke-line-strong" strokeWidth={0.6} />
        ))}
        {LABELS.map(l => (
          <text key={l.s} x={l.x} y={l.y} textAnchor={l.anchor} fontSize={3.3} className="fill-muted">{stations[l.s]}</text>
        ))}
      </svg>

      {groups.map(g => {
        const lead = g.pieces[0]
        const mine = g.player === game.turn
        const canPick = mine && pickable.has(lead)
        const isSel = mine && selected !== null && g.pieces.includes(selected)
        const label = t('board.piece', { color: colors[g.player], name: names[g.player], count: g.pieces.length, at: stations[g.station] })
        const dot = (
          <span className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold text-white tabular-nums ${PLAYER_COLORS[g.player]} ${isSel ? 'ring-4 ring-primary ring-offset-2 ring-offset-surface' : canPick ? 'ring-2 ring-fg ring-offset-2 ring-offset-surface' : 'ring-2 ring-surface'}`}>
            {g.pieces.length > 1 ? g.pieces.length : ''}
          </span>
        )
        const cls = 'absolute z-10 flex h-11 w-11 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full transition-[left,top] duration-300 motion-reduce:transition-none'
        return canPick ? (
          <button key={`${g.player}-${lead}`} type="button" data-yut-pick style={pos(g.station)} className={`${cls} cursor-pointer focus-visible:outline-2 focus-visible:outline-primary`}
            aria-label={label} aria-pressed={isSel} onClick={() => onPick(lead)}>
            {dot}
          </button>
        ) : (
          <span key={`${g.player}-${lead}`} role="img" aria-label={label} style={pos(g.station)} className={cls}>{dot}</span>
        )
      })}

      {/* 갈 곳 표시(마우스·터치용). 키보드는 옆 목록 버튼으로 같은 수를 고른다 */}
      {dests.map(m => {
        const s = m.to.idx < ROUTES[m.to.route].length ? ROUTES[m.to.route][m.to.idx] : null
        if (s === null) return null
        const name = t(`throws.${THROW_KEY[game.pool[m.throwIdx]]}`)
        return (
          <button key={`${m.throwIdx}-${s}`} type="button" tabIndex={-1} style={pos(s)}
            className="absolute z-20 flex h-11 w-11 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full"
            aria-label={t('board.dest', { throw: name, to: stations[s] })} onClick={() => onMove(m)}>
            <span className="absolute inset-0.5 rounded-full border-2 border-dashed border-primary bg-primary-soft/60" />
            <span className="relative rounded-full bg-primary px-1.5 py-0.5 text-[11px] font-bold leading-none text-white">{name}</span>
          </button>
        )
      })}
    </div>
  )
}
