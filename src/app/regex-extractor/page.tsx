import { Metadata } from 'next'
import RegexExtractor from '@/components/RegexExtractor'

export const metadata: Metadata = {
  title: '정규식 추출기 | grep, 패턴 매칭, 문자열 치환 도구 | 툴허브',
  description: '강력한 정규식으로 텍스트를 검색, 추출, 변환하세요. grep 필터링, 패턴 매칭, 문자열 치환을 한 곳에서! 개발자 필수 도구.',
  keywords: [
    '정규식 추출기',
    'regex extractor',
    'grep 도구',
    '패턴 매칭',
    '문자열 치환',
    '정규표현식',
    '텍스트 처리',
    '로그 파일 분석',
    '데이터 추출',
    '문자열 검색',
    '정규식 테스터',
    'regex tester',
    '텍스트 필터링',
    '패턴 검색',
    '문자열 파싱',
    '데이터 마이닝',
    '텍스트 마이닝',
    '개발자 도구'
  ],
  authors: [{ name: '툴허브' }],
  openGraph: {
    title: '정규식 추출기 | grep, 패턴 매칭, 문자열 치환 도구',
    description: '강력한 정규식으로 텍스트를 검색, 추출, 변환하세요. grep 필터링, 패턴 매칭, 문자열 치환을 한 곳에서!',
    type: 'website',
    url: 'https://toolhub.ai.kr/regex-extractor',
    siteName: '툴허브',
    locale: 'ko_KR',
    images: [
      {
        url: 'https://toolhub.ai.kr/og-image.png',
        width: 1200,
        height: 630,
        alt: '정규식 추출기 - 툴허브',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: '정규식 추출기 | grep, 패턴 매칭, 문자열 치환 도구',
    description: '강력한 정규식으로 텍스트를 검색, 추출, 변환하세요. grep 필터링, 패턴 매칭, 문자열 치환을 한 곳에서!',
    images: ['https://toolhub.ai.kr/og-image.png'],
  },
  alternates: {
    canonical: 'https://toolhub.ai.kr/regex-extractor',
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

export default function RegexExtractorPage() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-12">
      <div className="container mx-auto px-4">
        <RegexExtractor />
      </div>
    </div>
  )
}