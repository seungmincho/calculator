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
  alternates: { canonical: 'https://toolhub.ai.kr/image-ocr/' },
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
      {/* SEO 콘텐츠 */}
      <section className="max-w-4xl mx-auto px-4 pb-12">
        <div className="mt-12 border-t border-gray-200 dark:border-gray-700 pt-8">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
            이미지 OCR(광학 문자 인식)이란?
          </h2>
          <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-6">
            OCR(Optical Character Recognition, 광학 문자 인식)은 이미지나 사진 속에 있는 텍스트를 컴퓨터가 읽고 편집 가능한 텍스트로 변환하는 기술입니다. 이 도구는 Tesseract.js를 사용하여 브라우저에서 직접 한국어, 영어, 일본어, 중국어 등 100개 이상의 언어를 인식합니다. 서버에 이미지를 전송하지 않아 개인정보 보호에 안전합니다.
          </p>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
            이미지 텍스트 추출 활용 팁
          </h3>
          <ul className="list-disc list-inside space-y-2 text-gray-700 dark:text-gray-300">
            <li><strong>스캔 문서 디지털화:</strong> 종이 문서를 촬영하거나 스캔한 이미지에서 텍스트를 추출하여 편집 가능한 디지털 파일로 변환하세요.</li>
            <li><strong>영수증·명함 정보 추출:</strong> 영수증 금액, 명함의 연락처 등을 직접 타이핑하지 않고 OCR로 빠르게 추출할 수 있습니다.</li>
            <li><strong>인식률 향상 방법:</strong> 이미지가 기울어진 경우 회전 보정 기능을 사용하고, 해상도는 300dpi 이상을 권장합니다.</li>
            <li><strong>다국어 혼합 문서:</strong> 한국어와 영어가 섞인 문서는 다중 언어 모드(kor+eng)를 선택하면 인식률이 향상됩니다.</li>
            <li><strong>손글씨 주의:</strong> OCR은 인쇄 텍스트에 최적화되어 있으며 손글씨는 인식률이 낮을 수 있습니다.</li>
          </ul>
        </div>
      </section>
    </>
  )
}
