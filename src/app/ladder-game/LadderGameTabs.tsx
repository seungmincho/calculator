'use client'

import { useEffect } from 'react'
import DecisionToolsBar from '@/components/DecisionToolsBar'
import LadderGame from '@/components/LadderGame'

/** 예전 ?tool= 탭 링크 → 각 도구의 전용 페이지 */
const LEGACY_TOOL_URLS: Record<string, string> = {
  roulette: '/roulette/', order: '/order-picker/', coin: '/coin-flip/', dice: '/dice-roller/',
  team: '/team-divider/', lottery: '/lottery-draw/', yesno: '/yes-no/', rps: '/rock-paper-scissors/',
  number: '/random-number/', penalty: '/penalty-roulette/', timer: '/timer/',
}

export default function LadderGameTabs() {
  useEffect(() => {
    const tool = new URLSearchParams(window.location.search).get('tool')
    if (tool && LEGACY_TOOL_URLS[tool]) window.location.replace(LEGACY_TOOL_URLS[tool])
  }, [])

  return (
    <div className="space-y-6">
      <DecisionToolsBar current="/ladder-game" />
      <LadderGame />
    </div>
  )
}
