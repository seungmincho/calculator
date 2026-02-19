import type { Metadata } from 'next'
import I18nWrapper from '@/components/I18nWrapper'
import JsonFormatter from '@/components/JsonFormatter'

export const metadata: Metadata = {
  title: 'JSON 포맷터 Pro - JSON 검증, 포맷팅, 압축, JSONPath 쿼리, JSON5 지원',
  description: 'JSON 데이터를 검증하고 포맷팅하세요. 구문 강조 에디터, 인터랙티브 트리뷰, JSONPath 쿼리, JSON5/JSONC 지원, 통계 분석, 드래그앤드롭, 키보드 단축키를 제공합니다.',
  keywords: 'JSON포맷터, JSON검증, JSON예쁘게, JSON압축, JSONPath, JSON5, JSONC, JSON뷰어, JSON트리뷰, JSON통계, 온라인JSON도구, JSON포맷팅, JSON구문강조',
  openGraph: {
    title: 'JSON 포맷터 Pro - 개발자를 위한 최고의 JSON 도구',
    description: '구문 강조, JSONPath 쿼리, JSON5 지원, 트리뷰, 통계 분석까지 - 프로급 JSON 포맷터',
    type: 'website',
  },
}

export default function JsonFormatterPage() {
  return (
    <I18nWrapper>
      <JsonFormatter />
    </I18nWrapper>
  )
}