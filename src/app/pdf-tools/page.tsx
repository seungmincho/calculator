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
  const faqJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
      {
        '@type': 'Question',
        name: 'PDF 파일이란 무엇인가요?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'PDF(Portable Document Format)는 Adobe가 1993년 개발한 전자 문서 형식입니다. 어떤 기기나 OS에서 열어도 레이아웃, 폰트, 이미지가 동일하게 보이는 것이 최대 장점입니다. 텍스트, 이미지, 벡터 그래픽, 양식, 하이퍼링크, 디지털 서명을 포함할 수 있습니다. 2008년 ISO 32000으로 국제 표준이 되었으며, 계약서, 보고서, 이력서 등 공식 문서에 널리 사용됩니다.',
        },
      },
      {
        '@type': 'Question',
        name: 'PDF 파일 크기를 줄이는 방법은?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: '① 이미지 압축: PDF 내 이미지 해상도를 150dpi(화면용) 또는 72dpi(웹용)로 낮추기 ② 사용하지 않는 폰트 제거 및 서브셋 임베딩 ③ 불필요한 메타데이터 제거 ④ PDF 최적화 도구 사용(Adobe Acrobat, Ghostscript) ⑤ 스캔 문서는 흑백 모드로 변환 시 크기 대폭 감소. 브라우저 기반 도구로도 80% 이상 크기를 줄일 수 있습니다.',
        },
      },
    ],
  }

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 py-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <Suspense fallback={<div className="text-center text-gray-900 dark:text-white">Loading...</div>}>
            <I18nWrapper>
              <PdfTools />
            </I18nWrapper>
          </Suspense>
        </div>
      </div>
    </>
  )
}
