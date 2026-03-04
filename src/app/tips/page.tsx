import { Metadata } from 'next'
import I18nWrapper from '@/components/I18nWrapper'
import TipsContent from '@/components/TipsContent'

export const metadata: Metadata = {
  title: '금융 꿀팁 모음 | 툴허브 - 실생활 금융 팁 40선',
  description: '가계 관리, 저축/투자, 신용/대출, 세금/절세, 보험, 부동산, 은퇴/연금 등 10개 카테고리의 실생활 금융 팁 40개를 만나보세요.',
  keywords: '금융팁, 재테크, 저축방법, 투자전략, 절세방법, 대출팁, 보험팁, 부동산팁, 연금, 가계관리',
  openGraph: {
    title: '금융 꿀팁 모음 | 툴허브',
    description: '현명한 재정 관리부터 투자 전략까지, 실생활에 도움되는 금융 팁 40선',
    url: 'https://toolhub.ai.kr/tips',
    siteName: '툴허브',
    locale: 'ko_KR',
    type: 'website',
  },
  robots: {
    index: true,
    follow: true,
  },
  alternates: {
    canonical: 'https://toolhub.ai.kr/tips/',
  },
}

export default function TipsPage() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: '금융 꿀팁 모음',
    description: '현명한 재정 관리부터 투자 전략까지, 실생활에 도움되는 금융 팁 모음',
    url: 'https://toolhub.ai.kr/tips',
    mainEntity: {
      '@type': 'ItemList',
      name: '금융 팁 리스트',
      description: '실생활에 도움되는 40개의 금융 팁',
      numberOfItems: 40,
    },
    breadcrumb: {
      '@type': 'BreadcrumbList',
      itemListElement: [
        {
          '@type': 'ListItem',
          position: 1,
          name: '홈',
          item: 'https://toolhub.ai.kr',
        },
        {
          '@type': 'ListItem',
          position: 2,
          name: '금융 팁',
          item: 'https://toolhub.ai.kr/tips',
        },
      ],
    },
  }

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <I18nWrapper>
        <TipsContent />
      </I18nWrapper>
    </>
  )
}
