import type { Metadata } from 'next'
import I18nWrapper from '@/components/I18nWrapper'
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
  alternates: {
    canonical: 'https://toolhub.ai.kr/sql-formatter',
  },
}

export default function SqlFormatterPage() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: 'SQL 포맷터',
    description: 'SQL 쿼리를 예쁘게 포맷팅하고 압축하세요. 문법 검증과 쿼리 최적화 제안을 제공합니다.',
    url: 'https://toolhub.ai.kr/sql-formatter',
    applicationCategory: 'DeveloperApplication',
    operatingSystem: 'Any',
    browserRequirements: 'JavaScript',
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'KRW' },
    featureList: ['SQL 구문 포맷팅', '다양한 SQL 방언 지원', '구문 강조', '들여쓰기 설정']
  }

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <I18nWrapper>
        <SqlFormatter />
      </I18nWrapper>
    </>
  )
}