'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useTranslations } from '@/lib/i18n'
import '@/lib/i18n/ns/manito'
import AddToCalendar from '@/components/AddToCalendar'
import GameConfetti from '@/components/GameConfetti'
import { critterSvg, giftBody, giftLid } from '@/utils/critters'
import { daysBetween, todayKST } from '@/utils/dday'
import { cardOf, hash32, pickMissions, sortNames, type Card, type Group } from '@/utils/manito'

/** 이름마다 늘 같은 동물 캐릭터 */
export function Critter({ name, className = '' }: { name: string; className?: string }) {
  return <svg viewBox="0 0 100 100" aria-hidden className={`shrink-0 ${className}`} dangerouslySetInnerHTML={{ __html: critterSvg(name) }} />
}

/** 누가 누구의 마니또인지 전체 (names = 한 바퀴 순서) */
export function Chain({ names }: { names: string[] }) {
  const t = useTranslations('manito')
  const order = useMemo(() => sortNames(names), [names])
  return (
    <ul className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm text-body text-left">
      {order.map(n => {
        const to = names[(names.indexOf(n) + 1) % names.length]
        return (
          <li key={n} className="flex items-center gap-2 min-w-0 bg-subtle rounded-xl px-3 py-2">
            <Critter name={n} className="w-7 h-7" /><span className="truncate">{n}</span>
            <span aria-hidden className="text-faint">→</span><span className="sr-only">{t('reveal.to')}</span>
            <Critter name={to} className="w-7 h-7" /><span className="truncate font-medium text-fg">{to}</span>
          </li>
        )
      })}
    </ul>
  )
}

/** 오늘의 미션: 하루에 하나, 다른 걸 원하면 넘겨 본다 (열고 난 뒤에만 그려지므로 오늘 날짜를 바로 읽어도 된다) */
function Mission({ seed }: { seed: string }) {
  const t = useTranslations('manito')
  const items = t.raw('guide.missions.items') as string[]
  const [skip, setSkip] = useState(0)
  const order = useMemo(() => pickMissions(seed + todayKST(), items.length, items.length), [seed, items.length])
  return (
    <div className="bg-primary-soft rounded-2xl p-5 space-y-2">
      <h2 className="text-sm font-medium text-primary">{t('reveal.mission')}</h2>
      <p className="text-lg font-semibold text-fg break-keep text-balance" aria-live="polite">{items[order[skip % order.length]]}</p>
      <button type="button" onClick={() => setSkip(skip + 1)} className="min-h-[44px] px-3 text-sm font-medium text-primary">{t('reveal.otherMission')}</button>
    </div>
  )
}

/** 선물 상자를 열면 내 마니또가 나온다. onDone = 돌려 보기에서 다음 사람에게 넘기기 */
export function RevealCard({ card, onDone }: { card: Card; onDone?: () => void }) {
  const t = useTranslations('manito')
  const [stage, setStage] = useState<'closed' | 'opening' | 'open'>('closed')
  const [confetti, setConfetti] = useState(false)
  const nameRef = useRef<HTMLParagraphElement>(null)
  const boxRef = useRef<HTMLButtonElement>(null)
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined)
  useEffect(() => () => clearTimeout(timer.current), [])

  const show = () => { setStage('open'); requestAnimationFrame(() => nameRef.current?.focus()) }
  const open = () => {
    if (stage !== 'closed') return
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) { show(); return }
    setStage('opening')
    timer.current = setTimeout(() => { setConfetti(true); show() }, 1100)
  }
  const hide = () => { setStage('closed'); setConfetti(false); requestAnimationFrame(() => boxRef.current?.focus()) }
  const left = card.d ? daysBetween(todayKST(), card.d) : null

  return (
    <section className="ui-card p-6 sm:p-8 space-y-6 max-w-xl mx-auto text-center">
      <GameConfetti active={confetti} />
      <p className="text-sm font-medium text-primary">{card.g ?? t('reveal.badge')}</p>
      {stage === 'open' ? (
        <div className="space-y-3">
          <h1 className="text-lg font-semibold text-body">{t('reveal.greeting', { name: card.f })}</h1>
          <Critter name={card.t} className="manito-pop w-40 h-40 mx-auto" />
          <p ref={nameRef} tabIndex={-1} className="text-4xl font-bold text-fg [overflow-wrap:anywhere] outline-none!">{card.t}</p>
          <p className="text-sm text-sub break-keep text-balance">{t('reveal.care', { name: card.t })}</p>
          <button type="button" onClick={onDone ?? hide} className={`${onDone ? 'ui-btn' : 'ui-btn-soft'} px-5 py-2.5 min-h-[44px] text-sm`}>{onDone ? t('reveal.next') : t('reveal.hide')}</button>
        </div>
      ) : (
        <div className="space-y-3">
          <h1 className="text-2xl font-bold text-fg break-keep text-balance">{t('reveal.ask', { name: card.f })}</h1>
          <button ref={boxRef} type="button" onClick={open} disabled={stage === 'opening'} className="block mx-auto rounded-3xl p-2">
            <svg viewBox="0 0 120 120" aria-hidden className={`w-48 h-48 overflow-visible ${stage === 'opening' ? 'shake-animation' : 'manito-wiggle'}`}>
              <g dangerouslySetInnerHTML={{ __html: giftBody }} />
              <g className={stage === 'opening' ? 'manito-lid' : ''} dangerouslySetInnerHTML={{ __html: giftLid }} />
            </svg>
            <span className="ui-btn inline-block mt-4 px-8 py-3.5 text-lg">{stage === 'opening' ? t('reveal.opening') : t('reveal.open')}</span>
          </button>
          <p className="text-xs text-muted">{t('reveal.openHint')}</p>
        </div>
      )}
      <p className="sr-only" aria-live="polite">{stage === 'open' ? t('reveal.announce', { from: card.f, to: card.t }) : ''}</p>

      {stage === 'open' && !onDone && (
        <div className="space-y-3">
          <Mission seed={`${card.f}>${card.t}`} />
          {/* 별냥 마니또 카드. 이름·배정은 넘기지 않고 툴허브에서 왔다는 것만 센다 */}
          <a href="https://byeolnyang.toolhub.ai.kr/manito/?from=toolhub" target="_blank" rel="noopener" className="flex items-center gap-3 rounded-2xl bg-subtle hover:bg-soft p-4 text-left">
            {/* eslint-disable-next-line @next/next/no-img-element -- 4.7KB 고정 그림 */}
            <img src="/images/byeolnyang-face.webp" alt="" width={48} height={48} loading="lazy" className="w-12 h-12 shrink-0 rounded-full bg-white" />
            <span className="min-w-0">
              <span className="block font-semibold text-fg">{t('reveal.cardTitle')}</span>
              <span className="block text-sm text-sub break-keep">{t('reveal.cardDesc')}</span>
            </span>
          </a>
        </div>
      )}

      {(card.b || card.d || card.m) && (
        <dl className="bg-subtle rounded-2xl p-5 text-sm text-left space-y-2">
          {card.b ? <div className="flex justify-between gap-4"><dt className="text-sub">{t('reveal.budget')}</dt><dd className="text-fg font-medium tabular-nums">{card.b.toLocaleString('ko-KR')}{t('form.won')}</dd></div> : null}
          {card.d ? (
            <div className="flex justify-between gap-4">
              <dt className="text-sub">{t('reveal.date')}</dt>
              <dd className="text-fg font-medium tabular-nums">
                {card.d}
                {left != null && <span className="ml-2 text-primary">{left > 0 ? t('reveal.dday', { n: left }) : left === 0 ? t('reveal.today') : t('reveal.past')}</span>}
              </dd>
            </div>
          ) : null}
          {card.m ? <div className="flex justify-between gap-4"><dt className="text-sub shrink-0">{t('reveal.memo')}</dt><dd className="text-fg text-right [overflow-wrap:anywhere]">{card.m}</dd></div> : null}
        </dl>
      )}
      {card.d && !onDone && (
        <AddToCalendar file="manito.ics" events={[{ uid: `manito-${card.d}`, date: card.d, title: card.g ? t('reveal.calendar', { group: card.g }) : t('reveal.calendarFallback'), description: card.m }]} />
      )}
      {stage === 'open' && !onDone && <p><a href="/manito/" className="inline-flex items-center min-h-[44px] text-sm text-primary hover:underline">{t('reveal.start')}</a></p>}
    </section>
  )
}

export function InvalidLink() {
  const t = useTranslations('manito')
  return (
    <div className="ui-card p-6 space-y-4 max-w-xl mx-auto">
      <h1 className="text-xl font-bold text-fg">{t('reveal.badge')}</h1>
      <p className="bg-amber-50 text-amber-800 rounded-2xl p-4 text-sm" role="alert">{t('reveal.invalid')}</p>
      <a href="/manito/" className="ui-btn px-4 py-3 inline-flex items-center min-h-[44px]">{t('reveal.start')}</a>
    </div>
  )
}

const readLock = (key: string) => { try { return localStorage.getItem(key) } catch { return null } }

/**
 * 내 이름 고르기 → 본인 확인 → 선물 상자.
 * 단톡방 링크(onExit 없음): 처음 고른 이름을 이 기기에 묶어 다른 이름은 못 연다. 링크에 전체 배정이 들어 있어 완전한 잠금은 아니다.
 * 돌려 보기(onExit 있음): 한 사람씩 보고 넘긴다. 본 사람은 다시 못 연다.
 */
export function NamePicker({ group, onExit }: { group: Group; onExit?: () => void }) {
  const t = useTranslations('manito')
  const lockKey = `toolhub-manito-me-${hash32(group.names.join('\n')).toString(36)}`
  const [asking, setAsking] = useState<string | null>(null)
  const [me, setMe] = useState<string | null>(() => { const saved = onExit ? null : readLock(lockKey); return saved && group.names.includes(saved) ? saved : null })
  const [seen, setSeen] = useState<string[]>([])
  const names = useMemo(() => sortNames(group.names), [group.names])
  const headRef = useRef<HTMLHeadingElement>(null)
  const focusHead = () => requestAnimationFrame(() => { headRef.current?.focus(); headRef.current?.scrollIntoView({ block: 'center' }) })

  const confirm = () => {
    if (!asking) return
    if (!onExit) try { localStorage.setItem(lockKey, asking) } catch { /* 저장이 막힌 브라우저는 이 화면에서만 묶인다 */ }
    setMe(asking); setAsking(null)
  }
  const exit = onExit && <button type="button" onClick={onExit} className="min-h-[44px] px-3 text-sm text-sub hover:text-fg">{t('pick.exit')}</button>

  if (me) {
    return (
      <div className="space-y-6">
        <RevealCard key={me} card={cardOf(group, me)} onDone={onExit && (() => { setSeen([...seen, me]); setMe(null); focusHead() })} />
        {!onExit && group.d && daysBetween(todayKST(), group.d) <= 0 && (
          <details className="ui-card p-6 max-w-xl mx-auto">
            <summary className="cursor-pointer font-semibold text-fg min-h-[24px]">{t('pick.revealAll')}</summary>
            <p className="text-sm text-sub mt-2">{t('pick.revealAllHint')}</p>
            <Chain names={group.names} />
          </details>
        )}
      </div>
    )
  }

  return (
    <section className="ui-card p-6 sm:p-8 max-w-xl mx-auto text-center space-y-6">
      <p className="text-sm font-medium text-primary">{group.g ?? t('reveal.badge')}</p>
      {asking ? (
        <div className="space-y-4">
          <Critter key={asking} name={asking} className="manito-pop w-28 h-28 mx-auto" />
          <h1 ref={headRef} tabIndex={-1} className="text-2xl font-bold text-fg [overflow-wrap:anywhere] outline-none!">{t('pick.isYou', { name: asking })}</h1>
          <p className="text-sm text-sub break-keep text-balance">{onExit ? t('pick.passHint', { name: asking }) : t('pick.lockHint')}</p>
          <div className="flex flex-col sm:flex-row-reverse justify-center gap-2">
            <button type="button" onClick={confirm} className="ui-btn px-6 py-3 min-h-[48px]">{t('pick.yes')}</button>
            <button type="button" onClick={() => { setAsking(null); focusHead() }} className="ui-btn-soft px-6 py-3 min-h-[48px]">{t('pick.back')}</button>
          </div>
        </div>
      ) : (
        <>
          <div className="space-y-1">
            <h1 ref={headRef} tabIndex={-1} className="text-2xl font-bold text-fg outline-none!">{seen.length === names.length ? t('pick.allSeen') : t('pick.title')}</h1>
            <p className="text-sm text-sub">{onExit ? t('pick.progress', { n: seen.length, total: names.length }) : t('pick.subtitle')}</p>
          </div>
          <ul className="grid grid-cols-3 sm:grid-cols-4 gap-2">
            {names.map(n => {
              const done = seen.includes(n)
              return (
                <li key={n}>
                  <button type="button" disabled={done} onClick={() => { setAsking(n); focusHead() }}
                    className={`w-full h-full flex flex-col items-center gap-1.5 rounded-2xl px-1 py-3 bg-subtle transition-transform ${done ? 'opacity-45' : 'hover:bg-soft active:scale-95'}`}>
                    <Critter name={n} className="w-14 h-14" />
                    <span className="max-w-full truncate text-sm font-medium text-body">{n}</span>
                    {done && <span className="text-xs text-sub">{t('pick.seen')}</span>}
                  </button>
                </li>
              )
            })}
          </ul>
        </>
      )}
      {exit}
    </section>
  )
}
