import { Metadata } from 'next'
import { Suspense } from 'react'
import QrGenerator from '@/components/QrGenerator'
import I18nWrapper from '@/components/I18nWrapper'

export const metadata: Metadata = {
  title: 'QR 코드 생성기 | 툴허브 - 무료 QR 코드 제작 도구',
  description: '텍스트, URL, 연락처 정보를 QR 코드로 변환하세요. 로고 삽입, 색상 커스터마이징, 다양한 크기 지원으로 개성 있는 QR 코드를 만들 수 있습니다.',
  keywords: 'QR코드, QR생성기, 큐알코드, 바코드, URL단축, 연락처QR, 로고QR, 커스텀QR, 무료QR생성, 개발도구',
  openGraph: {
    title: 'QR 코드 생성기 | 툴허브',
    description: 'QR 코드 생성기 - 로고 삽입 + 색상 커스터마이징 + 다양한 형식 지원',
    url: 'https://toolhub.ai.kr/qr-generator',
    siteName: '툴허브',
    locale: 'ko_KR',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'QR 코드 생성기 - 무료 QR 코드 제작 도구',
    description: '텍스트, URL, 연락처 정보를 QR 코드로 변환하세요.',
  },
  alternates: {
    canonical: 'https://toolhub.ai.kr/qr-generator',
  },
}

export default function QrGeneratorPage() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: 'QR 코드 생성기',
    description: '텍스트, URL 등을 QR 코드로 변환하는 무료 온라인 도구',
    url: 'https://toolhub.ai.kr/qr-generator',
    applicationCategory: 'UtilityApplication',
    operatingSystem: 'Any',
    browserRequirements: 'JavaScript',
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'KRW'
    },
    featureList: [
      'URL QR 코드 생성',
      '텍스트 QR 코드 생성',
      '연락처 QR 코드 생성',
      '로고 이미지 삽입',
      '색상 커스터마이징',
      '다양한 크기 및 형식 지원'
    ]
  }

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 py-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <Suspense fallback={<div className="text-center">Loading...</div>}>
            <I18nWrapper>
              <QrGenerator />
            </I18nWrapper>
          </Suspense>
        </div>
      </div>
    </>
  )
}