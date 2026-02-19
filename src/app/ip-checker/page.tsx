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
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 py-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <Suspense fallback={<div className="text-center">Loading...</div>}><I18nWrapper><IpChecker /></I18nWrapper></Suspense>
        </div>
      </div>
    </>
  )
}
