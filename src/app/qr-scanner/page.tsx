import { Metadata } from 'next'
import { Suspense } from 'react'
import QrScanner from '@/components/QrScanner'
import I18nWrapper from '@/components/I18nWrapper'

export const metadata: Metadata = {
  title: 'QR코드 스캔 - 카메라/이미지 QR코드 인식 | 툴허브',
  description: 'QR코드 스캔 - 카메라 또는 이미지 파일로 QR코드를 스캔하세요. URL, 텍스트, Wi-Fi, 연락처 등 다양한 QR코드 인식.',
  keywords: 'QR코드 스캔, QR 스캐너, QR코드 인식, QR코드 읽기, qr code scanner, QR 리더',
  openGraph: { title: 'QR코드 스캔 | 툴허브', description: '카메라/이미지로 QR코드 스캔', url: 'https://toolhub.ai.kr/qr-scanner', siteName: '툴허브', locale: 'ko_KR', type: 'website' },
  twitter: { card: 'summary_large_image', title: 'QR코드 스캔 | 툴허브', description: 'QR코드 스캔, 인식, 복사' },
  alternates: { canonical: 'https://toolhub.ai.kr/qr-scanner' },
}

export default function QrScannerPage() {
  const jsonLd = { '@context': 'https://schema.org', '@type': 'WebApplication', name: 'QR코드 스캔', description: '카메라/이미지로 QR코드 스캔', url: 'https://toolhub.ai.kr/qr-scanner', applicationCategory: 'UtilityApplication', operatingSystem: 'Any', browserRequirements: 'JavaScript', offers: { '@type': 'Offer', price: '0', priceCurrency: 'KRW' }, featureList: ['카메라 스캔', '이미지 스캔', '다양한 QR 유형', '스캔 기록'] }
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 py-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <Suspense fallback={<div className="text-center">Loading...</div>}><I18nWrapper><QrScanner /></I18nWrapper></Suspense>
        </div>
      </div>
    </>
  )
}
