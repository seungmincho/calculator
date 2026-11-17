'use client'

import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { useTranslations } from '@/lib/i18n/fuelCalculator'

export interface FuelComparisonItem {
  name: string
  cost: number
  fill: string
  isCurrent: boolean
}

export function CostPiePlot({ fuelCost, depreciationCost }: { fuelCost: number; depreciationCost: number }) {
  const t = useTranslations('fuelCalculator')
  return (
    <ResponsiveContainer width="100%" height="100%">
      <PieChart margin={{ top: 10, right: 10, bottom: 10, left: 10 }}>
        <Pie
          data={[{ name: t('charts.fuel'), value: fuelCost }, { name: t('result.depreciationCost'), value: depreciationCost }]}
          cx="50%"
          cy="50%"
          innerRadius={50}
          outerRadius={80}
          dataKey="value"
          label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`}
          labelLine={false}
        >
          <Cell fill="var(--primary)" />
          <Cell fill="var(--line-strong)" />
        </Pie>
        <Tooltip formatter={(value) => t('charts.won', { value: Number(value ?? 0).toLocaleString() })} />
      </PieChart>
    </ResponsiveContainer>
  )
}

export function FuelComparisonPlot({ data }: { data: FuelComparisonItem[] }) {
  const t = useTranslations('fuelCalculator')
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} margin={{ top: 5, right: 5, left: 0, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--line)" />
        <XAxis dataKey="name" tick={{ fontSize: 12, fill: 'var(--muted)' }} />
        <YAxis tickFormatter={(value) => t('charts.thousand', { value: Math.round(value / 1000) })} tick={{ fontSize: 11, fill: 'var(--muted)' }} width={45} />
        <Tooltip formatter={(value) => [t('charts.won', { value: Number(value ?? 0).toLocaleString() }), t('charts.fuel')]} />
        <Bar dataKey="cost" radius={[4, 4, 0, 0]}>
          {data.map((entry, index) => (
            <Cell key={index} fill={entry.fill} opacity={entry.isCurrent ? 1 : 0.6} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}
