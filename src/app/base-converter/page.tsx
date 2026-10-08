import { Metadata } from 'next'
import BaseConverter from '@/components/BaseConverter'
import I18nWrapper from '@/components/I18nWrapper'
import RelatedTools from '@/components/RelatedTools'
import { FaqJsonLd } from '@/components/ToolFaq'
import baseConverterMessages from '../../../messages/generated/ko/ns/baseConverter.json'

export const metadata: Metadata = {
  title: '진법 변환기 - 2진수, 8진수, 10진수, 16진수 변환 | 툴허브',
  description: '2진수·8진수·10진수·16진수와 2~36진법을 실시간 변환. 소수·순환소수, 2의 보수·1의 보수, IEEE 754 부동소수점 분해, 나눗셈 풀이 과정까지 한 번에.',
  keywords: '진법 변환기, 2진수 변환, 16진수 변환, 8진수 변환, 2의 보수 계산기, IEEE 754 변환, 소수 2진수 변환, 진법 변환 풀이, 정보처리기사 진법, binary converter, hex converter, 진법 계산기',
  openGraph: {
    title: '진법 변환기 | 툴허브',
    description: '2진수, 8진수, 10진수, 16진수 실시간 변환',
    url: 'https://toolhub.ai.kr/base-converter/',
    siteName: '툴허브',
    locale: 'ko_KR',
    type: 'website',
    images: [{ url: 'https://toolhub.ai.kr/og/base-converter.png', width: 1200, height: 630, alt: '진법 변환기' }],
  },
  twitter: { card: 'summary_large_image', title: '진법 변환기 | 툴허브', description: '2/8/10/16진수 실시간 변환', images: ['https://toolhub.ai.kr/og/base-converter.png'] },
  alternates: { canonical: 'https://toolhub.ai.kr/base-converter/' },
}

export default function BaseConverterPage() {
  const jsonLd = {
    '@context': 'https://schema.org', '@type': 'WebApplication',
    name: '진법 변환기', description: '2진수, 8진수, 10진수, 16진수 실시간 변환',
    url: 'https://toolhub.ai.kr/base-converter/', applicationCategory: 'DeveloperApplication',
    operatingSystem: 'Any', browserRequirements: 'JavaScript',
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'KRW' },
    featureList: ['2·8·10·16진수 및 2~36진법 동시 변환', '임의 크기 정수(BigInt)·소수·순환소수', '2의 보수·1의 보수·부호-크기 (8~64비트)', '클릭으로 비트 토글', 'IEEE 754 float32/float64 분해', '나눗셈·자리값·묶음법 풀이 과정', '텍스트 ↔ UTF-8 바이트'],
  }

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <FaqJsonLd items={baseConverterMessages.baseConverter.guide.faq.items} />
      <div className="min-h-screen py-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <I18nWrapper>
            <BaseConverter />
            <div className="mt-8">
              <RelatedTools />
            </div>
          </I18nWrapper>
        </div>
      </div>
      {/* SEO 콘텐츠 */}
      <section className="max-w-4xl mx-auto px-4 pb-12">
        <div className="mt-12 border-t border-line pt-8">
          <h2 className="text-xl font-bold text-fg mb-4">
            진법 변환기란?
          </h2>
          <p className="text-body leading-relaxed mb-6">
            진법 변환기는 2진수(Binary), 8진수(Octal), 10진수(Decimal), 16진수(Hexadecimal)를 실시간으로 상호 변환하는 무료 온라인 개발 도구입니다. 컴퓨터 과학, 프로그래밍, 네트워크 관리, 디지털 회로 설계 등 다양한 분야에서 진법 변환이 필요하며, 이 도구는 소수·순환소수, 2의 보수, IEEE 754 부동소수점 분해, 손으로 푸는 풀이 과정까지 제공하여 정보처리기사·컴활을 준비하는 학생과 개발자 모두에게 유용합니다. 색상 코드(HEX), 메모리 주소, chmod 권한 설정 등 실무 활용도가 높습니다.
          </p>
          <h3 className="text-lg font-semibold text-fg mb-3">
            진법 변환기 활용 팁
          </h3>
          <ul className="list-disc list-inside space-y-2 text-body">
            <li><strong>색상 코드 변환:</strong> 웹 색상 #FF5733은 16진수 두 자리씩(FF·57·33) 10진수로 변환하면 RGB(255, 87, 51) 값과 일치합니다.</li>
            <li><strong>chmod 권한 계산:</strong> Unix/Linux 파일 권한 755는 8진수이며, 이를 2진수로 변환하면 rwxr-xr-x(111 101 101) 구조를 바로 이해할 수 있습니다.</li>
            <li><strong>메모리 주소 분석:</strong> 16진수 메모리 주소(예: 0x1A2B)를 10진수로 변환하면 실제 메모리 위치 계산에 도움이 됩니다.</li>
            <li><strong>비트 구조 학습:</strong> 비트 보기에서 비트를 눌러 0↔1을 바꾸면 값과 2의 보수·1의 보수 해석이 바로 바뀌어 비트 구조를 직관적으로 이해할 수 있습니다.</li>
            <li><strong>IP 주소 분석:</strong> IPv4 주소의 서브넷 마스크를 2진수로 변환하면 네트워크 범위와 호스트 수를 쉽게 계산할 수 있습니다.</li>
          </ul>
        </div>
      </section>
    </>
  )
}
