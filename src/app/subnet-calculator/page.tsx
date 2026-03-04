import { Metadata } from 'next'
import { Suspense } from 'react'
import SubnetCalculator from '@/components/SubnetCalculator'
import I18nWrapper from '@/components/I18nWrapper'
import Breadcrumb from '@/components/Breadcrumb'
import RelatedTools from '@/components/RelatedTools'

export const metadata: Metadata = {
  title: 'IP 서브넷 계산기 - CIDR, 서브넷마스크, 호스트 범위 계산 | 툴허브',
  description: 'IPv4 서브넷을 간편하게 계산하세요. CIDR 표기법, 서브넷마스크, 네트워크 주소, 브로드캐스트 주소, 사용 가능한 호스트 범위, 바이너리 표현까지 한번에 확인할 수 있습니다.',
  keywords: 'IP 서브넷 계산기, CIDR 계산기, 서브넷마스크, 네트워크 주소, 브로드캐스트 주소, IP 주소 계산, 와일드카드 마스크, 서브넷팅',
  openGraph: {
    title: 'IP 서브넷 계산기 | 툴허브',
    description: 'CIDR, 서브넷마스크, 호스트 범위를 간편하게 계산하는 온라인 도구.',
    url: 'https://toolhub.ai.kr/subnet-calculator',
    siteName: '툴허브',
    locale: 'ko_KR',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'IP 서브넷 계산기 | 툴허브',
    description: 'CIDR, 서브넷마스크, 호스트 범위 계산.',
  },
  alternates: {
    canonical: 'https://toolhub.ai.kr/subnet-calculator/',
  },
}

const faqData = [
  {
    question: 'CIDR 표기법이란 무엇인가요?',
    answer: 'CIDR(Classless Inter-Domain Routing)은 IP 주소 뒤에 슬래시(/)와 프리픽스 길이를 붙여 네트워크 범위를 표현하는 방법입니다. 예를 들어 192.168.1.0/24는 앞 24비트가 네트워크 부분임을 의미하며, 이는 서브넷마스크 255.255.255.0과 같습니다.',
  },
  {
    question: '서브넷마스크와 와일드카드 마스크의 차이점은?',
    answer: '서브넷마스크는 네트워크 부분을 1로, 호스트 부분을 0으로 표시합니다(예: 255.255.255.0). 와일드카드 마스크는 반대로 호스트 부분을 1로 표시합니다(예: 0.0.0.255). 와일드카드 마스크는 주로 ACL(접근 제어 목록)이나 라우팅 프로토콜에서 사용됩니다.',
  },
  {
    question: '사설 IP 주소 대역은 어떻게 되나요?',
    answer: 'RFC 1918에서 정의된 사설 IP 대역은 세 가지입니다: 10.0.0.0/8 (클래스 A), 172.16.0.0/12 (클래스 B), 192.168.0.0/16 (클래스 C). 이 주소들은 인터넷에서 라우팅되지 않으며, 내부 네트워크에서 자유롭게 사용할 수 있습니다.',
  },
]

export default function SubnetCalculatorPage() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: 'IP 서브넷 계산기',
    description: 'IPv4 서브넷을 간편하게 계산하는 온라인 도구',
    url: 'https://toolhub.ai.kr/subnet-calculator',
    applicationCategory: 'DeveloperApplication',
    operatingSystem: 'Any',
    browserRequirements: 'JavaScript',
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'KRW' },
    featureList: [
      'CIDR ↔ 서브넷마스크 변환',
      '네트워크·브로드캐스트 주소 계산',
      '호스트 범위 및 사용 가능한 호스트 수',
      'IP 클래스 및 사설/공인 구분',
      '바이너리 표현',
      'CIDR 참고 테이블',
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
              <SubnetCalculator />
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
            IP 서브넷 계산기란?
          </h2>
          <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-6">
            IP 서브넷 계산기는 IPv4 주소와 CIDR 표기법(예: 192.168.1.0/24)을 입력하면 서브넷마스크, 네트워크 주소, 브로드캐스트 주소, 사용 가능한 호스트 범위와 개수, 와일드카드 마스크, 바이너리 표현까지 한 번에 계산해 주는 네트워크 엔지니어·개발자용 도구입니다. 사설/공인 IP 구분과 IP 클래스 정보도 함께 제공합니다.
          </p>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
            서브넷 계산기 활용 팁
          </h3>
          <ul className="list-disc list-inside space-y-2 text-gray-700 dark:text-gray-300">
            <li><strong>CIDR 표기법 이해:</strong> /24는 앞 24비트가 네트워크 부분으로 255.255.255.0과 같으며, 254개의 호스트를 수용합니다. /16은 65,534개, /8은 16,777,214개입니다.</li>
            <li><strong>사설 IP 대역 파악:</strong> 10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16이 사설 IP 대역으로 인터넷에서 직접 라우팅되지 않아 내부 네트워크에 자유롭게 사용 가능합니다.</li>
            <li><strong>네트워크 분할(서브넷팅):</strong> 큰 네트워크를 작은 서브넷으로 나눌 때 프리픽스 길이를 늘리면(예: /24 → /26) 더 작은 서브넷 4개로 분할할 수 있습니다.</li>
            <li><strong>ACL·방화벽 설정:</strong> 와일드카드 마스크는 Cisco 라우터의 ACL 설정에서 허용 범위를 지정할 때 서브넷마스크와 반대 방향으로 사용됩니다.</li>
          </ul>
        </div>
      </section>
    </>
  )
}
