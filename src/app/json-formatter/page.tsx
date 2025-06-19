import type { Metadata } from 'next'
import JsonFormatter from '@/components/JsonFormatter'

export const metadata: Metadata = {
  title: 'JSON 포맷터 - JSON 검증, 포맷팅, 압축 도구',
  description: 'JSON 데이터를 검증하고 예쁘게 포맷팅하거나 압축하세요. 실시간 JSON 문법 검사와 트리 뷰를 제공합니다.',
  keywords: 'JSON포맷터, JSON검증, JSON예쁘게, JSON압축, JSON문법검사, JSON뷰어, 온라인JSON도구',
  openGraph: {
    title: 'JSON 포맷터 - JSON 검증, 포맷팅, 압축',
    description: 'JSON 데이터를 쉽게 검증하고 포맷팅하세요',
    type: 'website',
  },
}

export default function JsonFormatterPage() {
  return <JsonFormatter />
}