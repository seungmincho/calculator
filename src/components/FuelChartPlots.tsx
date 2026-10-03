'use client'

import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

export interface FuelComparisonItem {
  name: string
  cost: number
  fill: string
  isCurrent: boolean
}

export function CostPiePlot({ fuelCost, depreciationCost }: { fuelCost: number; depreciationCost: number }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <PieChart margin={{ top: 10, right: 10, bottom: 10, left: 10 }}>
        <Pie
          data={[{ name: '유류비', value: fuelCost }, { name: '감가상각비', value: depreciationCost }]}
          cx="50%"
          cy="50%"
          innerRadius={50}
          outerRadius={80}
          dataKey="value"
          label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`}
          labelLine={false}
        >
          <Cell fill="#3b82f6" />
          <Cell fill="#f97316" />
        </Pie>
        <Tooltip formatter={(value) => `${Number(value ?? 0).toLocaleString()}원`} />
      </PieChart>
    </ResponsiveContainer>
  )
}

export function FuelComparisonPlot({ data }: { data: FuelComparisonItem[] }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} margin={{ top: 5, right: 5, left: 0, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
        <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#9ca3af' }} />
        <YAxis tickFormatter={(value) => `${Math.round(value / 1000)}천`} tick={{ fontSize: 11, fill: '#9ca3af' }} width={45} />
        <Tooltip formatter={(value) => [`${Number(value ?? 0).toLocaleString()}원`, '유류비']} />
        <Bar dataKey="cost" radius={[4, 4, 0, 0]}>
          {data.map((entry, index) => (
            <Cell key={index} fill={entry.fill} opacity={entry.isCurrent ? 1 : 0.6} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}
