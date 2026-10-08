import { Metadata } from 'next'
import ImageOcr from '@/components/ImageOcr'
import I18nWrapper from '@/components/I18nWrapper'
import RelatedTools from '@/components/RelatedTools'
import { FaqJsonLd } from '@/components/ToolFaq'
import imageOcrMessages from '../../../messages/generated/ko/ns/imageOcr.json'

export const metadata: Metadata = {
  title: '이미지 텍스트 추출 (OCR) - 사진에서 글자 인식 | 툴허브',
  description: '이미지에서 텍스트를 추출하는 OCR 도구입니다. 한국어, 영어, 일본어, 중국어를 지원하며, 추출된 텍스트를 복사하거나 다운로드할 수 있습니다.',
  keywords: 'OCR, 이미지 텍스트 추출, 사진 글자 인식, 텍스트 인식, 광학문자인식',
  openGraph: { title: '이미지 텍스트 추출 (OCR) | 툴허브', description: '이미지에서 텍스트를 추출하는 OCR 도구', url: 'https://toolhub.ai.kr/image-ocr/', siteName: '툴허브', locale: 'ko_KR', type: 'website', images: [{ url: 'https://toolhub.ai.kr/og/image-ocr.png', width: 1200, height: 630, alt: '이미지 텍스트 추출 (OCR)' }] },
  twitter: { card: 'summary_large_image', title: '이미지 텍스트 추출 (OCR) | 툴허브', description: '이미지에서 텍스트를 추출하는 OCR 도구', images: ['https://toolhub.ai.kr/og/image-ocr.png'] },
  alternates: { canonical: 'https://toolhub.ai.kr/image-ocr/' },
}

export default function ImageOcrPage() {
  const jsonLd = { '@context': 'https://schema.org', '@type': 'WebApplication', name: '이미지 텍스트 추출 (OCR)', description: '이미지에서 텍스트를 추출하는 OCR 도구', url: 'https://toolhub.ai.kr/image-ocr/', applicationCategory: 'UtilityApplication', operatingSystem: 'Any', browserRequirements: 'JavaScript', offers: { '@type': 'Offer', price: '0', priceCurrency: 'KRW' }, featureList: ['한국어 OCR', '영어 OCR', '일본어 OCR', '텍스트 복사', '결과 다운로드'] }
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <FaqJsonLd items={imageOcrMessages.imageOcr.guide.faq.items} />
      <div className="min-h-screen py-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <I18nWrapper><ImageOcr />  <div className="mt-8">
    <RelatedTools />
  </div>
</I18nWrapper>
        </div>
      </div>
      {/* SEO 콘텐츠 */}
      <section className="max-w-4xl mx-auto px-4 pb-12">
        <div className="mt-12 border-t border-line pt-8">
          <h2 className="text-xl font-bold text-fg mb-4">
            이미지 OCR(광학 문자 인식)이란?
          </h2>
          <p className="text-body leading-relaxed mb-6">
            OCR(Optical Character Recognition, 광학 문자 인식)은 이미지나 사진 속에 있는 텍스트를 컴퓨터가 읽고 편집 가능한 텍스트로 변환하는 기술입니다. 이 도구는 100개 이상의 언어를 지원하는 Tesseract.js 엔진으로 브라우저에서 직접 한국어, 영어, 일본어, 중국어(간체·번체)를 인식합니다. 서버에 이미지를 전송하지 않아 개인정보 보호에 안전합니다.
          </p>
          <h3 className="text-lg font-semibold text-fg mb-3">
            이미지 텍스트 추출 활용 팁
          </h3>
          <ul className="list-disc list-inside space-y-2 text-body">
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
