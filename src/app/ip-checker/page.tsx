import { Metadata } from 'next'
import { Suspense } from 'react'
import IpChecker from '@/components/IpChecker'
import I18nWrapper from '@/components/I18nWrapper'
import Breadcrumb from '@/components/Breadcrumb'
import RelatedTools from '@/components/RelatedTools'

export const metadata: Metadata = {
  title: '내 IP 주소 확인 - 공인 IP, 위치, ISP 정보 조회 | 툴허브',
  description: '내 IP 주소 확인 - 공인 IP 주소, 위치 정보, ISP, 네트워크 정보를 한눈에 확인하세요. VPN 연결 확인, 서버 설정 시 유용합니다.',
  keywords: '내 아이피 확인, 내 IP 주소, IP 주소 조회, my ip address, 공인 IP 확인, 아이피 확인',
  openGraph: { title: '내 IP 주소 확인 | 툴허브', description: '공인 IP 주소, 위치, ISP 정보 조회', url: 'https://toolhub.ai.kr/ip-checker', siteName: '툴허브', locale: 'ko_KR', type: 'website' },
  twitter: { card: 'summary_large_image', title: '내 IP 주소 확인 | 툴허브', description: '공인 IP 주소, 위치 정보 확인' },
  alternates: { canonical: 'https://toolhub.ai.kr/ip-checker/' },
}

export default function IpCheckerPage() {
  const jsonLd = { '@context': 'https://schema.org', '@type': 'WebApplication', name: '내 IP 주소 확인', description: '공인 IP 주소, 위치, ISP, 네트워크 정보 확인', url: 'https://toolhub.ai.kr/ip-checker', applicationCategory: 'UtilityApplication', operatingSystem: 'Any', browserRequirements: 'JavaScript', offers: { '@type': 'Offer', price: '0', priceCurrency: 'KRW' }, featureList: ['공인 IP 확인', '위치 정보', 'ISP 정보', 'VPN 감지'] }
  const faqJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
      {
        '@type': 'Question',
        name: 'IP 주소란 무엇인가요?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'IP 주소는 인터넷에 연결된 기기의 고유 식별 번호입니다. IPv4: 0-255 범위의 4개 숫자로 구성(192.168.1.1), 약 43억 개 주소 가능. IPv6: 128비트 16진수 8그룹(2001:0db8:85a3::8a2e:0370:7334), 사실상 무한한 주소. 공인 IP는 인터넷에서 유일하며, 사설 IP(192.168.x.x, 10.x.x.x)는 내부 네트워크에서만 사용됩니다. VPN을 사용하면 공인 IP가 변경됩니다.',
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
          <Suspense fallback={<div className="text-center text-gray-900 dark:text-white">Loading...</div>}><I18nWrapper><IpChecker />  <div className="mt-8">
    <RelatedTools />
  </div>
</I18nWrapper></Suspense>
        </div>
      </div>
      {/* SEO 콘텐츠 */}
      <section className="max-w-4xl mx-auto px-4 pb-12">
        <div className="mt-12 border-t border-gray-200 dark:border-gray-700 pt-8">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
            내 IP 주소 확인이란?
          </h2>
          <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-6">
            내 IP 주소 확인 도구는 현재 사용 중인 공인 IP 주소, 접속 위치(국가·도시), 인터넷 서비스 제공업체(ISP), 네트워크 정보를 한눈에 확인할 수 있는 서비스입니다. VPN 연결 여부 확인, 서버 방화벽 설정, 원격 접속 허용 등 다양한 상황에서 자신의 IP를 파악해야 할 때 유용합니다.
          </p>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
            IP 주소 확인 활용 팁
          </h3>
          <ul className="list-disc list-inside space-y-2 text-gray-700 dark:text-gray-300">
            <li><strong>VPN 작동 확인:</strong> VPN 연결 전후의 IP를 비교하여 VPN이 실제로 IP를 변경했는지 확인하세요.</li>
            <li><strong>서버 화이트리스트 등록:</strong> 클라우드 서버(AWS, GCP 등)에 접속하려면 자신의 공인 IP를 방화벽 허용 목록에 추가해야 합니다.</li>
            <li><strong>공인 IP와 사설 IP 구분:</strong> 공인 IP는 인터넷에서 보이는 IP이고, 공유기 내부의 192.168.x.x는 사설 IP로 외부에서 보이지 않습니다.</li>
            <li><strong>동적 IP 주의:</strong> 대부분의 가정용 인터넷은 동적 IP라 재접속 시 IP가 바뀔 수 있습니다. 고정 IP가 필요하면 ISP에 문의하세요.</li>
            <li><strong>IPv6 확인:</strong> 최신 네트워크는 IPv4(xxx.xxx.xxx.xxx)와 IPv6(xxxx:xxxx:...) 두 가지 주소를 모두 지원할 수 있습니다.</li>
          </ul>
        </div>
      </section>
    </>
  )
}
