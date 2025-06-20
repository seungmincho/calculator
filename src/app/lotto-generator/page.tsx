import { Metadata } from 'next'
import LottoGenerator from '@/components/LottoGenerator'

export const metadata: Metadata = {
  title: '로또번호 생성기 | 자동번호 추천, 당첨번호 분석 | 툴허브',
  description: '로또 6/45 번호를 자동으로 생성하고 과거 당첨번호 분석으로 더 나은 번호 조합을 만들어보세요. 완전랜덤, 통계분석, 제외번호 설정 기능 제공.',
  keywords: [
    '로또번호 생성기',
    '로또 자동번호',
    '로또번호 추천',
    '로또 6/45',
    '로또번호 분석',
    '당첨번호 통계',
    '로또번호 조합',
    '복권번호 생성',
    '로또번호 랜덤',
    '로또 확률',
    '로또번호 필터',
    '로또번호 제외',
    '당첨확률',
    '로또 전략',
    '번호 통계'
  ],
  authors: [{ name: '툴허브' }],
  openGraph: {
    title: '로또번호 생성기 | 자동번호 추천, 당첨번호 분석',
    description: '로또 6/45 번호를 자동으로 생성하고 과거 당첨번호 분석으로 더 나은 번호 조합을 만들어보세요.',
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
    title: '로또번호 생성기 | 자동번호 추천, 당첨번호 분석',
    description: '로또 6/45 번호를 자동으로 생성하고 과거 당첨번호 분석으로 더 나은 번호 조합을 만들어보세요.',
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