import { Metadata } from 'next'
import I18nWrapper from '@/components/I18nWrapper'
import GamesPageContent from '@/components/GamesPageContent'

export const metadata: Metadata = {
  title: '게임센터 - 오목·체커·2048 등 20+ 게임 | 툴허브',
  description: '오목, 오셀로, 사목, 체커, 만칼라, 배틀쉽, 2048, 지뢰찾기, 스도쿠, 테트리스 등 20가지 이상의 무료 브라우저 게임을 즐겨보세요. AI 대전과 온라인 대전을 지원합니다.',
  keywords: '온라인게임, 오목, 오셀로, 체커, 사목, 만칼라, 배틀쉽, 2048, 지뢰찾기, 스도쿠, 테트리스, 스네이크, 무료게임, 브라우저게임',
  openGraph: {
    title: '게임센터 | 툴허브',
    description: '20가지 이상의 무료 브라우저 게임 - AI 대전, 온라인 대전 지원',
    url: 'https://toolhub.ai.kr/games',
    siteName: '툴허브',
    locale: 'ko_KR',
    type: 'website',
  },
  robots: {
    index: true,
    follow: true,
  },
  alternates: {
    canonical: 'https://toolhub.ai.kr/games/',
  },
}

export default function GamesPage() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: '게임센터',
    description: '오목, 오셀로, 사목, 체커 등 20가지 이상의 무료 브라우저 게임',
    url: 'https://toolhub.ai.kr/games',
    mainEntity: {
      '@type': 'ItemList',
      name: '게임 목록',
      numberOfItems: 20,
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
          name: '게임센터',
          item: 'https://toolhub.ai.kr/games',
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
        <GamesPageContent />
      </I18nWrapper>
    </>
  )
}
