import { Metadata } from 'next'
import { Suspense } from 'react'
import FontPreview from '@/components/FontPreview'
import I18nWrapper from '@/components/I18nWrapper'
import Breadcrumb from '@/components/Breadcrumb'
import RelatedTools from '@/components/RelatedTools'

export const metadata: Metadata = {
  title: '글꼴 미리보기 - 폰트 테스트, 웹폰트 비교 | 툴허브',
  description: '글꼴 미리보기 - 다양한 한글/영문 웹폰트로 텍스트를 미리보세요. 크기, 굵기, 줄간격 조절, CSS 복사 기능.',
  keywords: '폰트 미리보기, 글꼴 테스트, 웹폰트 비교, font preview, 한글 폰트, 구글 폰트',
  openGraph: { title: '글꼴 미리보기 | 툴허브', description: '다양한 폰트로 텍스트 미리보기', url: 'https://toolhub.ai.kr/font-preview', siteName: '툴허브', locale: 'ko_KR', type: 'website' },
  twitter: { card: 'summary_large_image', title: '글꼴 미리보기 | 툴허브', description: '폰트 미리보기, 비교, CSS 복사' },
  alternates: { canonical: 'https://toolhub.ai.kr/font-preview/' },
}

export default function FontPreviewPage() {
  const jsonLd = { '@context': 'https://schema.org', '@type': 'WebApplication', name: '글꼴 미리보기', description: '다양한 웹폰트로 텍스트 미리보기 및 비교', url: 'https://toolhub.ai.kr/font-preview', applicationCategory: 'DesignApplication', operatingSystem: 'Any', browserRequirements: 'JavaScript', offers: { '@type': 'Offer', price: '0', priceCurrency: 'KRW' }, featureList: ['한글/영문 폰트', '크기/굵기 조절', '폰트 비교', 'CSS 복사'] }
  const faqJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
      {
        '@type': 'Question',
        name: '웹 폰트와 시스템 폰트의 차이는?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: '시스템 폰트: 사용자 기기에 설치된 폰트로 추가 다운로드가 필요 없어 빠르지만, OS/기기마다 사용 가능한 폰트가 다릅니다. 웹 폰트: Google Fonts 등에서 다운로드하는 폰트로, 모든 사용자에게 동일한 디자인을 보여줄 수 있지만 로딩 시간이 추가됩니다. font-display: swap을 사용하면 웹 폰트 로딩 중 시스템 폰트를 먼저 보여줘 FOUT(Flash of Unstyled Text)를 최소화합니다.',
        },
      },
      {
        '@type': 'Question',
        name: '한국어 웹 폰트 추천은?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: '본고딕(Noto Sans KR): 구글 무료 폰트, 가장 널리 사용, 9가지 굵기. 프리텐다드(Pretendard): 애플 SF Pro 스타일의 한국어 폰트, 깔끔한 디자인. 나눔고딕/나눔스퀘어: 네이버 무료 폰트, 가독성 우수. IBM Plex Sans KR: 코딩/기술 문서에 적합. 최적화 팁: ① subset으로 필요한 글자만 로드 ② woff2 형식 사용(크기 30% 감소) ③ font-display: swap 적용 ④ preload로 빠른 로딩.',
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
          <Suspense fallback={<div className="text-center text-gray-900 dark:text-white">Loading...</div>}><I18nWrapper><FontPreview />  <div className="mt-8">
    <RelatedTools />
  </div>
</I18nWrapper></Suspense>
        </div>
      </div>
      {/* SEO 콘텐츠 */}
      <section className="max-w-4xl mx-auto px-4 pb-12">
        <div className="mt-12 border-t border-gray-200 dark:border-gray-700 pt-8">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
            글꼴 미리보기란?
          </h2>
          <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-6">
            글꼴 미리보기는 나눔고딕·본고딕·프리텐다드·IBM Plex Sans KR 등 다양한 한글·영문 웹폰트로 내 텍스트가 어떻게 보이는지 실시간으로 확인하고, 폰트 크기·굵기·줄간격을 조절한 뒤 CSS 코드를 바로 복사할 수 있는 무료 온라인 폰트 테스트 도구입니다. 디자인 시안 검토, 웹사이트 폰트 선정, 인쇄물 폰트 비교 등에 활용할 수 있습니다.
          </p>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
            글꼴 미리보기 활용 팁
          </h3>
          <ul className="list-disc list-inside space-y-2 text-gray-700 dark:text-gray-300">
            <li><strong>한글 본문 가독성 비교:</strong> 실제 본문 문단 텍스트를 입력하여 가독성이 높은 폰트를 빠르게 비교하세요.</li>
            <li><strong>CSS 코드 복사:</strong> 마음에 드는 폰트를 선택하고 CSS 코드를 복사하면 Google Fonts 링크와 font-family 선언이 바로 생성됩니다.</li>
            <li><strong>굵기 테스트:</strong> 제목(700~900)과 본문(400~500) 굵기를 각각 확인하여 웹사이트 타이포그래피를 완성하세요.</li>
            <li><strong>줄간격 조절:</strong> line-height를 1.5~1.8로 조절하면 한글 본문의 가독성이 크게 향상됩니다.</li>
          </ul>
        </div>
      </section>
    </>
  )
}
