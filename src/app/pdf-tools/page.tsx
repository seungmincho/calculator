import { Metadata } from 'next'
import { Suspense } from 'react'
import PdfTools from '@/components/PdfTools'
import I18nWrapper from '@/components/I18nWrapper'

export const metadata: Metadata = {
  title: 'PDF 도구 - PDF 합치기, 분할, 회전 | 툴허브',
  description:
    'PDF 파일을 온라인에서 무료로 합치기, 분할, 페이지 회전, 이미지를 PDF로 변환하세요. 개인정보 보호 - 모든 처리가 브라우저에서 완료됩니다.',
  keywords: 'PDF 합치기, PDF 분할, PDF 회전, 이미지 PDF 변환, PDF 도구, 온라인 PDF',
  openGraph: {
    title: 'PDF 도구 - PDF 합치기, 분할, 회전 | 툴허브',
    description: 'PDF 합치기, 분할, 페이지 회전, 이미지→PDF 변환을 브라우저에서 무료로',
    url: 'https://toolhub.ai.kr/pdf-tools',
    siteName: '툴허브',
    locale: 'ko_KR',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'PDF 도구',
    description: 'PDF 합치기, 분할, 회전, 변환',
  },
  alternates: { canonical: 'https://toolhub.ai.kr/pdf-tools' },
}

export default function PdfToolsPage() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: 'PDF 도구',
    description: 'PDF 합치기, 분할, 페이지 회전, 이미지→PDF 변환',
    url: 'https://toolhub.ai.kr/pdf-tools',
    applicationCategory: 'MultimediaApplication',
    operatingSystem: 'Any',
    browserRequirements: 'JavaScript',
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'KRW' },
    featureList: ['PDF 합치기', 'PDF 분할', 'PDF 페이지 회전', '이미지→PDF 변환'],
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
              <PdfTools />
            </I18nWrapper>
          </Suspense>
        </div>
      </div>
    </>
  )
}
