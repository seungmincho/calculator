'use client'

// ssr:false 없는 dynamic → 정적 HTML에 도구 본문(h1·입력 UI)이 포함되면서(검색 색인) 도구별로 코드 분할. 각 도구의 첫 렌더는 결정적이어야 함.
import dynamic from 'next/dynamic'

const DecisionTools = dynamic(() => import('./DecisionTools'))
const TeamDivider = dynamic(() => import('./TeamDivider'))
const LotteryDraw = dynamic(() => import('./LotteryDraw'))
const CoinFlip = dynamic(() => import('./CoinFlip'))
const DiceRoller = dynamic(() => import('./DiceRoller'))
const RandomNumberPicker = dynamic(() => import('./RandomNumberPicker'))
const YesNoDecider = dynamic(() => import('./YesNoDecider'))
const RockPaperScissors = dynamic(() => import('./RockPaperScissors'))
const PenaltyRoulette = dynamic(() => import('./PenaltyRoulette'))

const tools = {
  '/roulette': DecisionTools,
  '/team-divider': TeamDivider,
  '/lottery-draw': LotteryDraw,
  '/coin-flip': CoinFlip,
  '/dice-roller': DiceRoller,
  '/random-number': RandomNumberPicker,
  '/yes-no': YesNoDecider,
  '/rock-paper-scissors': RockPaperScissors,
  '/penalty-roulette': PenaltyRoulette,
}

export type DecisionToolHref = keyof typeof tools

export default function DecisionToolClient({ href }: { href: DecisionToolHref }) {
  if (href === '/roulette') {
    return <DecisionTools initialTab="roulette" single title="돌림판" subtitle="항목을 입력하고 돌림판을 돌려 하나를 고르세요" />
  }
  const Tool = tools[href] as React.ComponentType
  return <Tool />
}
