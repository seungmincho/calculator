import { Metadata } from 'next'
import { Suspense } from 'react'
import SignatureGenerator from '@/components/SignatureGenerator'
import I18nWrapper from '@/components/I18nWrapper'

export const metadata: Metadata = {
  title: '서명 생성기 - 전자 서명 만들기, 이미지 다운로드 | 툴허브',
  description: '서명 생성기 - 마우스나 터치로 전자 서명을 생성하고 PNG/SVG 이미지로 다운로드합니다. 투명 배경 지원.',
  keywords: '서명 생성기, 전자 서명, e-signature generator, 서명 이미지, 서명 만들기',
  openGraph: { title: '서명 생성기 | 툴허브', description: '전자 서명 생성 및 다운로드', url: 'https://toolhub.ai.kr/signature-generator', siteName: '툴허브', locale: 'ko_KR', type: 'website' },
  twitter: { card: 'summary_large_image', title: '서명 생성기 | 툴허브', description: '전자 서명 생성 및 다운로드' },
  alternates: { canonical: 'https://toolhub.ai.kr/signature-generator' },
}

export default function SignatureGeneratorPage() {
  const jsonLd = { '@context': 'https://schema.org', '@type': 'WebApplication', name: '서명 생성기', description: '전자 서명 생성 및 다운로드', url: 'https://toolhub.ai.kr/signature-generator', applicationCategory: 'UtilityApplication', operatingSystem: 'Any', browserRequirements: 'JavaScript', offers: { '@type': 'Offer', price: '0', priceCurrency: 'KRW' }, featureList: ['서명 그리기', 'PNG/SVG 다운로드', '투명 배경', '펜 설정'] }
  const faqJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
      {
        '@type': 'Question',
        name: '전자서명의 법적 효력은?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: '한국의 전자서명법에 따라 공인인증서 기반 전자서명은 자필 서명과 동등한 법적 효력을 가집니다. 2020년 전자서명법 개정 이후 공동인증서(구 공인인증서) 외에도 카카오페이, PASS, 네이버 등 민간 인증서도 법적 효력을 인정받습니다. 이 도구로 생성하는 서명 이미지는 간편한 문서 서명용이며, 공식 전자서명(공동인증서, 전자계약 플랫폼)과는 다릅니다.',
        },
      },
      {
        '@type': 'Question',
        name: '서명 이미지를 문서에 삽입하는 방법은?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: '① PDF: Adobe Acrobat에서 \'서명 추가\' → 이미지 삽입. 무료 대안으로 Smallpdf, iLovePDF 사용 ② Word/한글: 삽입 → 그림으로 서명 이미지 추가, 텍스트 줄 바꿈을 \'앞으로\'로 설정 ③ 이메일: 서명 설정에서 HTML 이미지로 삽입 ④ 구글 문서: 삽입 → 이미지 → 서명 파일 업로드. PNG 투명 배경 형식이 가장 활용도가 높습니다.',
        },
      },
    ],
  }
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 py-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <Suspense fallback={<div className="text-center text-gray-900 dark:text-white">Loading...</div>}><I18nWrapper><SignatureGenerator /></I18nWrapper></Suspense>
        </div>
      </div>
    </>
  )
}
