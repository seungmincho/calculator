'use client'

import { useEffect, useRef, useState } from 'react'
import dynamic from 'next/dynamic'
import { useTranslations } from '@/lib/i18n/fuelCalculator'
import type { FuelComparisonItem } from './FuelChartPlots'

const CostPiePlot = dynamic(() => import('./FuelChartPlots').then(module => module.CostPiePlot), { ssr: false })
const FuelComparisonPlot = dynamic(() => import('./FuelChartPlots').then(module => module.FuelComparisonPlot), { ssr: false })

interface FuelChartsProps {
  fuelCost: number
  depreciationCost: number
  tripKm: number
  comparison: FuelComparisonItem[]
}

export default function FuelCharts({ fuelCost, depreciationCost, tripKm, comparison }: FuelChartsProps) {
  const t = useTranslations('fuelCalculator')
  const [ready, setReady] = useState(false)
  const chartsRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    // The charts follow the calculation result on desktop; on small screens they
    // begin several viewport heights below the first content.
    if (window.matchMedia('(min-width: 768px)').matches || typeof IntersectionObserver !== 'function') {
      const frame = window.requestAnimationFrame(() => setReady(true))
      return () => window.cancelAnimationFrame(frame)
    }
    const observer = new IntersectionObserver(entries => {
      if (entries.some(entry => entry.isIntersecting)) {
        setReady(true)
        observer.disconnect()
      }
    }, { rootMargin: '200px 0px' })
    if (chartsRef.current) observer.observe(chartsRef.current)
    return () => observer.disconnect()
  }, [])

  return (
    <div ref={chartsRef} className="grid md:grid-cols-2 gap-6">
      <div className="ui-card p-6">
        <h3 className="text-base font-semibold text-fg mb-4 flex items-center gap-2">{t('charts.costBreakdown')}</h3>
        <div className="h-64" role="img" aria-label={t('charts.costBreakdownAria', { fuel: fuelCost.toLocaleString('ko-KR'), depreciation: depreciationCost.toLocaleString('ko-KR') })}>
          {ready ? <CostPiePlot fuelCost={fuelCost} depreciationCost={depreciationCost} /> : <div aria-hidden="true" className="h-full rounded-xl bg-soft animate-pulse motion-reduce:animate-none" />}
        </div>
      </div>
      <div className="ui-card p-6">
        <h3 className="text-base font-semibold text-fg mb-4 flex items-center gap-2">{t('charts.fuelComparison')}</h3>
        <div className="h-52" role="img" aria-label={comparison.map(item => t('charts.costItem', { name: item.name, cost: item.cost.toLocaleString('ko-KR') })).join(', ')}>
          {ready ? <FuelComparisonPlot data={comparison} /> : <div aria-hidden="true" className="h-full rounded-xl bg-soft animate-pulse motion-reduce:animate-none" />}
        </div>
        <p className="text-xs text-gray-400 mt-2 text-center">
          {t('charts.basis', { km: tripKm.toLocaleString() })}
        </p>
      </div>
    </div>
  )
}
