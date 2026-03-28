'use client'

import dynamic from 'next/dynamic'

const DecisionTools = dynamic(() => import('@/components/DecisionTools'), { ssr: false })

export default function OrderPickerClient() {
  return <DecisionTools initialTab="order" />
}
