'use client'

import dynamic from 'next/dynamic'

const tools = {
  '/roulette': dynamic(() => import('./DecisionTools'), { ssr: false }),
  '/team-divider': dynamic(() => import('./TeamDivider'), { ssr: false }),
  '/lottery-draw': dynamic(() => import('./LotteryDraw'), { ssr: false }),
  '/coin-flip': dynamic(() => import('./CoinFlip'), { ssr: false }),
  '/dice-roller': dynamic(() => import('./DiceRoller'), { ssr: false }),
  '/random-number': dynamic(() => import('./RandomNumberPicker'), { ssr: false }),
  '/yes-no': dynamic(() => import('./YesNoDecider'), { ssr: false }),
  '/rock-paper-scissors': dynamic(() => import('./RockPaperScissors'), { ssr: false }),
  '/penalty-roulette': dynamic(() => import('./PenaltyRoulette'), { ssr: false }),
}

export type DecisionToolHref = keyof typeof tools

export default function DecisionToolClient({ href }: { href: DecisionToolHref }) {
  if (href === '/roulette') {
    const Roulette = tools['/roulette']
    return <Roulette initialTab="roulette" single title="돌림판" subtitle="항목을 입력하고 돌림판을 돌려 하나를 고르세요" />
  }
  const Tool = tools[href] as React.ComponentType
  return <Tool />
}
