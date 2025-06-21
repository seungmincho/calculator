import { Metadata } from 'next'
import LottoGenerator from '@/components/LottoGenerator'

export const metadata: Metadata = {
  title: '로또번호 생성기 | 당첨번호 조회, 통계 기반 번호추천 | 툴허브',
  description: '로또 6/45 당첨번호 조회, 통계 기반 번호 추천으로 똑똑한 로또번호를 생성하세요. 과거 당첨번호 분석, 핫/콜드 번호, 빈도 분석 기능 제공.',
  keywords: [
    '로또번호 생성기',
    '로또 당첨번호 조회',
    '로또번호 추천',
    '로또 6/45',
    '당첨번호 분석',
    '통계 기반 번호추천',
    '핫번호 콜드번호',
    '로또번호 빈도',
    '로또번호 통계',
    '당첨번호 검색',
    '로또 회차별 조회',
    '번호 출현 빈도',
    '로또 데이터 분석',
    '당첨확률',
    '로또 전략'
  ],
  authors: [{ name: '툴허브' }],
  openGraph: {
    title: '로또번호 생성기 | 당첨번호 조회, 통계 기반 번호추천',
    description: '로또 6/45 당첨번호 조회, 통계 기반 번호 추천으로 똑똑한 로또번호를 생성하세요.',
    type: 'website',
    url: 'https://toolhub.ai.kr/lotto-generator',
    siteName: '툴허브',
    locale: 'ko_KR',
    images: [
      {
        url: 'https://toolhub.ai.kr/og-image.png',
        width: 1200,
        height: 630,
        alt: '로또번호 생성기 - 툴허브',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: '로또번호 생성기 | 당첨번호 조회, 통계 기반 번호추천',
    description: '로또 6/45 당첨번호 조회, 통계 기반 번호 추천으로 똑똑한 로또번호를 생성하세요.',
    images: ['https://toolhub.ai.kr/og-image.png'],
  },
  alternates: {
    canonical: 'https://toolhub.ai.kr/lotto-generator',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
}

export default function LottoGeneratorPage() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-12">
      <div className="container mx-auto px-4">
        <LottoGenerator />
      </div>
    </div>
  )
}