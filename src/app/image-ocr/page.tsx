import { Metadata } from 'next'
import { Suspense } from 'react'
import ImageOcr from '@/components/ImageOcr'
import I18nWrapper from '@/components/I18nWrapper'

export const metadata: Metadata = {
  title: '이미지 텍스트 추출 (OCR) - 사진에서 글자 인식 | 툴허브',
  description: '이미지에서 텍스트를 추출하는 OCR 도구입니다. 한국어, 영어, 일본어, 중국어를 지원하며, 추출된 텍스트를 복사하거나 다운로드할 수 있습니다.',
  keywords: 'OCR, 이미지 텍스트 추출, 사진 글자 인식, 텍스트 인식, 광학문자인식',
  openGraph: { title: '이미지 텍스트 추출 (OCR) | 툴허브', description: '이미지에서 텍스트를 추출하는 OCR 도구', url: 'https://toolhub.ai.kr/image-ocr', siteName: '툴허브', locale: 'ko_KR', type: 'website' },
  twitter: { card: 'summary_large_image', title: '이미지 텍스트 추출 (OCR) | 툴허브', description: '이미지에서 텍스트를 추출하는 OCR 도구' },
  alternates: { canonical: 'https://toolhub.ai.kr/image-ocr' },
}

export default function ImageOcrPage() {
  const jsonLd = { '@context': 'https://schema.org', '@type': 'WebApplication', name: '이미지 텍스트 추출 (OCR)', description: '이미지에서 텍스트를 추출하는 OCR 도구', url: 'https://toolhub.ai.kr/image-ocr', applicationCategory: 'UtilityApplication', operatingSystem: 'Any', browserRequirements: 'JavaScript', offers: { '@type': 'Offer', price: '0', priceCurrency: 'KRW' }, featureList: ['한국어 OCR', '영어 OCR', '일본어 OCR', '텍스트 복사', '결과 다운로드'] }
  const faqJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
      {
        '@type': 'Question',
        name: 'OCR 인식률을 높이는 방법은?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: '① 이미지 해상도 300dpi 이상 유지 ② 텍스트와 배경의 높은 대비 확보 (흰 배경에 검은 글씨) ③ 기울어진 이미지는 자동/수동 회전으로 보정 ④ 노이즈 제거와 이진화 전처리 적용 ⑤ 적절한 언어 모델 선택 (한국어, 영어, 일본어 등). 손글씨보다 인쇄된 텍스트의 인식률이 훨씬 높으며, 고딕체가 명조체보다 인식이 잘 됩니다.'
        }
      },
      {
        '@type': 'Question',
        name: 'OCR로 어떤 언어를 인식할 수 있나요?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'Tesseract.js는 100개 이상의 언어를 지원하며, 한국어(kor), 영어(eng), 일본어(jpn), 중국어 간체(chi_sim)/번체(chi_tra) 등이 포함됩니다. 여러 언어가 혼합된 문서는 다중 언어 모드(예: kor+eng)로 인식률을 높일 수 있습니다. 이 도구는 브라우저에서 Tesseract.js를 실행하므로 서버 없이 오프라인에서도 작동합니다.'
        }
      },
    ],
  }
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 py-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <Suspense fallback={<div className="text-center text-gray-900 dark:text-white">Loading...</div>}><I18nWrapper><ImageOcr /></I18nWrapper></Suspense>
        </div>
      </div>
    </>
  )
}
