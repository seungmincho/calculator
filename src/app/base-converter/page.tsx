import { Metadata } from 'next'
import { Suspense } from 'react'
import BaseConverter from '@/components/BaseConverter'
import I18nWrapper from '@/components/I18nWrapper'
import Breadcrumb from '@/components/Breadcrumb'
import RelatedTools from '@/components/RelatedTools'

export const metadata: Metadata = {
  title: '진법 변환기 - 2진수, 8진수, 10진수, 16진수 변환 | 툴허브',
  description: '진법 변환기 - 2진수(Binary), 8진수(Octal), 10진수(Decimal), 16진수(Hex)를 실시간으로 변환합니다. 비트 시각화 제공.',
  keywords: '진법 변환기, 2진수 변환, 16진수 변환, 8진수 변환, binary converter, hex converter, 진법 계산기',
  openGraph: {
    title: '진법 변환기 | 툴허브',
    description: '2진수, 8진수, 10진수, 16진수 실시간 변환',
    url: 'https://toolhub.ai.kr/base-converter',
    siteName: '툴허브',
    locale: 'ko_KR',
    type: 'website',
  },
  twitter: { card: 'summary_large_image', title: '진법 변환기 | 툴허브', description: '2/8/10/16진수 실시간 변환' },
  alternates: { canonical: 'https://toolhub.ai.kr/base-converter/' },
}

export default function BaseConverterPage() {
  const jsonLd = {
    '@context': 'https://schema.org', '@type': 'WebApplication',
    name: '진법 변환기', description: '2진수, 8진수, 10진수, 16진수 실시간 변환',
    url: 'https://toolhub.ai.kr/base-converter', applicationCategory: 'DeveloperApplication',
    operatingSystem: 'Any', browserRequirements: 'JavaScript',
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'KRW' },
    featureList: ['10진수 ↔ 2진수 변환', '10진수 ↔ 16진수 변환', '비트 시각화', '자주 쓰는 값 참조'],
  }
  const faqJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
      {
        '@type': 'Question',
        name: '2진수, 8진수, 16진수란?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: '진법은 숫자를 표현하는 체계입니다. 2진수(Binary): 0과 1만 사용, 컴퓨터 내부 데이터 표현의 기본. 8진수(Octal): 0-7 사용, Unix 파일 권한(chmod 755) 등에 사용. 10진수(Decimal): 일상에서 사용하는 0-9 체계. 16진수(Hexadecimal): 0-9와 A-F 사용, 메모리 주소, 색상 코드(#FF5733), MAC 주소 등에 사용. 프로그래밍에서 0b(2진), 0o(8진), 0x(16진) 접두사로 구분합니다.',
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
          <Suspense fallback={<div className="text-center text-gray-900 dark:text-white">Loading...</div>}>
            <I18nWrapper><BaseConverter />  <div className="mt-8">
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
            진법 변환기란?
          </h2>
          <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-6">
            진법 변환기는 2진수(Binary), 8진수(Octal), 10진수(Decimal), 16진수(Hexadecimal)를 실시간으로 상호 변환하는 무료 온라인 개발 도구입니다. 컴퓨터 과학, 프로그래밍, 네트워크 관리, 디지털 회로 설계 등 다양한 분야에서 진법 변환이 필요하며, 이 도구는 비트 시각화까지 제공하여 개발자와 학생 모두에게 유용합니다. 색상 코드(HEX), 메모리 주소, chmod 권한 설정 등 실무 활용도가 높습니다.
          </p>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
            진법 변환기 활용 팁
          </h3>
          <ul className="list-disc list-inside space-y-2 text-gray-700 dark:text-gray-300">
            <li><strong>색상 코드 변환:</strong> 웹 색상 #FF5733은 16진수이므로 10진수로 변환하면 RGB(255, 87, 51) 값과 일치합니다.</li>
            <li><strong>chmod 권한 계산:</strong> Unix/Linux 파일 권한 755는 8진수이며, 이를 2진수로 변환하면 rwxr-xr-x(111 101 101) 구조를 바로 이해할 수 있습니다.</li>
            <li><strong>메모리 주소 분석:</strong> 16진수 메모리 주소(예: 0x1A2B)를 10진수로 변환하면 실제 메모리 위치 계산에 도움이 됩니다.</li>
            <li><strong>비트 연산 학습:</strong> 2진수 시각화 기능으로 AND, OR, XOR, NOT 비트 연산의 결과를 직관적으로 이해할 수 있습니다.</li>
            <li><strong>IP 주소 분석:</strong> IPv4 주소의 서브넷 마스크를 2진수로 변환하면 네트워크 범위와 호스트 수를 쉽게 계산할 수 있습니다.</li>
          </ul>
        </div>
      </section>
    </>
  )
}
