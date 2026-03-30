import { Metadata } from 'next'
import { Suspense } from 'react'
import DevCheatsheet from '@/components/DevCheatsheet'
import I18nWrapper from '@/components/I18nWrapper'
import RelatedTools from '@/components/RelatedTools'
import GuideSection from '@/components/GuideSection'

export const metadata: Metadata = {
  title: '개발자 치트시트 - Git·Linux·Docker·SQL 명령어 모음 | 툴허브',
  description: 'Git, Linux, Docker, SQL, Vim, HTTP, CSS, 정규표현식 등 개발 필수 명령어 220개를 한눈에 정리. 검색, 복사, 북마크 지원.',
  keywords: '개발자 치트시트, git 명령어, linux 명령어, docker 명령어, sql 명령어, vim 단축키, http 상태코드, css flexbox, 정규표현식, developer cheatsheet',
  openGraph: {
    title: '개발자 치트시트 - 220개 필수 명령어 | 툴허브',
    description: 'Git, Linux, Docker, SQL 등 8개 분야 220개 개발 필수 명령어를 검색하고 복사하세요.',
    url: 'https://toolhub.ai.kr/dev-cheatsheet',
    siteName: '툴허브',
    locale: 'ko_KR',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: '개발자 치트시트 - 220개 필수 명령어',
    description: 'Git, Linux, Docker, SQL 등 8개 분야 개발 필수 명령어 모음',
  },
  alternates: {
    canonical: 'https://toolhub.ai.kr/dev-cheatsheet',
  },
}

export default function DevCheatsheetPage() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: '개발자 치트시트',
    description: '8개 분야 220개 개발 필수 명령어를 검색하고 복사할 수 있는 치트시트',
    url: 'https://toolhub.ai.kr/dev-cheatsheet',
    applicationCategory: 'DeveloperApplication',
    operatingSystem: 'Any',
    browserRequirements: 'JavaScript',
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'KRW' },
    featureList: ['Git 명령어 35개', 'Linux 명령어 40개', 'Docker 명령어 25개', 'SQL 쿼리 30개', 'Vim 단축키 25개', 'HTTP 상태코드', 'CSS Flexbox/Grid', '정규표현식 패턴']
  }

  const faqJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
      {
        '@type': 'Question',
        name: '어떤 명령어가 포함되어 있나요?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'Git, Linux, Docker, SQL, Vim, HTTP 상태코드, CSS Flexbox/Grid, 정규표현식 총 8개 분야의 220개 명령어가 수록되어 있습니다.'
        }
      },
      {
        '@type': 'Question',
        name: '명령어를 바로 복사할 수 있나요?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: '네, 각 명령어 옆의 복사 버튼을 클릭하면 클립보드에 바로 복사됩니다. 자주 쓰는 명령어는 북마크하여 빠르게 찾을 수 있습니다.'
        }
      }
    ]
  }

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 py-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <Suspense fallback={<div className="text-center py-12">Loading...</div>}>
            <I18nWrapper>
              <DevCheatsheet />
              <div className="mt-8">
                <GuideSection namespace="devCheatsheet" />
              </div>
              <div className="mt-8">
                <RelatedTools />
              </div>
            </I18nWrapper>
          </Suspense>
        </div>
      </div>
    </>
  )
}
