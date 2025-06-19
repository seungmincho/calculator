import type { Metadata } from 'next'
import SqlFormatter from '@/components/SqlFormatter'

export const metadata: Metadata = {
  title: 'SQL 포맷터 - SQL 쿼리 포맷팅, 검증, 최적화 도구',
  description: 'SQL 쿼리를 예쁘게 포맷팅하고 압축하세요. 문법 검증과 쿼리 최적화 제안을 제공합니다.',
  keywords: 'SQL포맷터, SQL검증, SQL예쁘게, SQL압축, SQL문법검사, 쿼리포맷터, 온라인SQL도구, 데이터베이스',
  openGraph: {
    title: 'SQL 포맷터 - SQL 쿼리 포맷팅, 검증',
    description: 'SQL 쿼리를 쉽게 포맷팅하고 검증하세요',
    type: 'website',
  },
}

export default function SqlFormatterPage() {
  return <SqlFormatter />
}