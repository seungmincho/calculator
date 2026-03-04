import { Metadata } from 'next'
import { Suspense } from 'react'
import HtmlEntityConverter from '@/components/HtmlEntityConverter'
import I18nWrapper from '@/components/I18nWrapper'
import Breadcrumb from '@/components/Breadcrumb'
import RelatedTools from '@/components/RelatedTools'

export const metadata: Metadata = {
  title: 'HTML 엔티티 변환기 - 인코딩/디코딩, 특수문자 참조표 | 툴허브',
  description: 'HTML 특수문자를 엔티티 코드로 변환하거나 엔티티를 원래 문자로 복원합니다. Named(&amp;), Decimal(&#38;), Hex(&#x26;) 형식 지원. 주요 HTML 엔티티 참조표 포함.',
  keywords: 'HTML 엔티티, HTML entity encoder, HTML 특수문자, HTML 인코딩, HTML 디코딩, &amp; &lt; &gt;, 엔티티 변환기',
  openGraph: {
    title: 'HTML 엔티티 변환기 | 툴허브',
    description: 'HTML 특수문자 인코딩·디코딩. Named, Decimal, Hex 형식 지원.',
    url: 'https://toolhub.ai.kr/html-entity-converter',
    siteName: '툴허브',
    locale: 'ko_KR',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'HTML 엔티티 변환기 | 툴허브',
    description: 'HTML 특수문자 인코딩·디코딩 도구.',
  },
  alternates: {
    canonical: 'https://toolhub.ai.kr/html-entity-converter/',
  },
}

const faqData = [
  {
    question: 'HTML 엔티티란 무엇인가요?',
    answer: 'HTML 엔티티는 HTML에서 특수문자를 안전하게 표현하기 위한 코드입니다. 예를 들어 < 기호는 HTML 태그로 해석될 수 있으므로 &lt;로 변환하여 사용합니다. Named(&amp;), Decimal(&#38;), Hex(&#x26;) 세 가지 형식이 있습니다.',
  },
  {
    question: 'Named, Decimal, Hex 형식의 차이점은?',
    answer: 'Named 형식은 &amp;copy;처럼 사람이 읽기 쉬운 이름을 사용합니다. Decimal(&#169;)은 유니코드 코드포인트를 10진수로, Hex(&#xA9;)는 16진수로 표현합니다. Decimal과 Hex는 모든 유니코드 문자를 표현할 수 있지만, Named 형식은 미리 정의된 엔티티만 사용 가능합니다.',
  },
  {
    question: 'XSS 방지를 위해 꼭 인코딩해야 하는 문자는?',
    answer: '최소한 & (앰퍼샌드), < (작다), > (크다), " (큰따옴표), \' (작은따옴표) 5가지 문자는 반드시 HTML 엔티티로 변환해야 합니다. 이 문자들이 인코딩되지 않으면 XSS(Cross-Site Scripting) 공격에 취약해질 수 있습니다.',
  },
]

export default function HtmlEntityConverterPage() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: 'HTML 엔티티 변환기',
    description: 'HTML 특수문자를 엔티티로 인코딩하거나 디코딩하는 온라인 도구',
    url: 'https://toolhub.ai.kr/html-entity-converter',
    applicationCategory: 'DeveloperApplication',
    operatingSystem: 'Any',
    browserRequirements: 'JavaScript',
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'KRW' },
    featureList: [
      'HTML 엔티티 인코딩 (Named, Decimal, Hex)',
      'HTML 엔티티 디코딩',
      '비 ASCII 문자 전체 인코딩 옵션',
      '주요 HTML 엔티티 참조표 (25+ 항목)',
      '클릭 복사 기능',
    ],
  }

  const faqJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqData.map(faq => ({
      '@type': 'Question',
      name: faq.question,
      acceptedAnswer: { '@type': 'Answer', text: faq.answer },
    })),
  }

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 py-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <Suspense fallback={<div className="text-center py-12">Loading...</div>}>
            <I18nWrapper>
              <Breadcrumb />
              <HtmlEntityConverter />
              <div className="mt-8">
                <RelatedTools />
              </div>
            </I18nWrapper>
          </Suspense>
        </div>
      </div>
      {/* SEO 콘텐츠 */}
      <section className="max-w-4xl mx-auto px-4 pb-12">
        <div className="mt-12 border-t border-gray-200 dark:border-gray-700 pt-8">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
            HTML 엔티티 변환기란?
          </h2>
          <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-6">
            HTML 엔티티 변환기는 HTML에서 특수문자(&lt; &gt; &amp; &quot; 등)를 안전한 엔티티 코드로 인코딩하거나, 엔티티를 원래 문자로 디코딩하는 무료 온라인 개발 도구입니다. Named(&amp;amp;)·Decimal(&#38;)·Hex(&#x26;) 세 가지 형식을 모두 지원하며, XSS(크로스 사이트 스크립팅) 방지와 HTML 코드 안전 처리에 필수입니다.
          </p>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
            HTML 엔티티 변환기 활용 팁
          </h3>
          <ul className="list-disc list-inside space-y-2 text-gray-700 dark:text-gray-300">
            <li><strong>XSS 방지 필수 문자:</strong> 사용자 입력을 HTML에 출력할 때 &amp;·&lt;·&gt;·&quot;·&#39; 다섯 가지 문자를 반드시 엔티티로 변환하세요.</li>
            <li><strong>이메일 주소 숨기기:</strong> 이메일을 Decimal 또는 Hex 엔티티로 변환하면 스팸 봇의 자동 수집을 일부 방지할 수 있습니다.</li>
            <li><strong>복사 붙여넣기 검증:</strong> 외부에서 가져온 HTML 코드에 특수문자가 포함된 경우, 디코딩하여 원본 텍스트를 확인할 수 있습니다.</li>
            <li><strong>비 ASCII 문자 인코딩:</strong> 한글·중국어·이모지 등 비 ASCII 문자 전체를 Decimal 엔티티로 변환하면 인코딩 문제가 발생하는 구형 시스템과의 호환성을 확보할 수 있습니다.</li>
          </ul>
        </div>
      </section>
    </>
  )
}
