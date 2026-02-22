import { Metadata } from 'next'
import { Suspense } from 'react'
import IpChecker from '@/components/IpChecker'
import I18nWrapper from '@/components/I18nWrapper'

export const metadata: Metadata = {
  title: '내 IP 주소 확인 - 공인 IP, 위치, ISP 정보 조회 | 툴허브',
  description: '내 IP 주소 확인 - 공인 IP 주소, 위치 정보, ISP, 네트워크 정보를 한눈에 확인하세요. VPN 연결 확인, 서버 설정 시 유용합니다.',
  keywords: '내 아이피 확인, 내 IP 주소, IP 주소 조회, my ip address, 공인 IP 확인, 아이피 확인',
  openGraph: { title: '내 IP 주소 확인 | 툴허브', description: '공인 IP 주소, 위치, ISP 정보 조회', url: 'https://toolhub.ai.kr/ip-checker', siteName: '툴허브', locale: 'ko_KR', type: 'website' },
  twitter: { card: 'summary_large_image', title: '내 IP 주소 확인 | 툴허브', description: '공인 IP 주소, 위치 정보 확인' },
  alternates: { canonical: 'https://toolhub.ai.kr/ip-checker' },
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
          <Suspense fallback={<div className="text-center text-gray-900 dark:text-white">Loading...</div>}><I18nWrapper><IpChecker /></I18nWrapper></Suspense>
        </div>
      </div>
    </>
  )
}
