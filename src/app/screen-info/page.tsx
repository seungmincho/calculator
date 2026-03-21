import { Metadata } from 'next'
import { Suspense } from 'react'
import ScreenInfo from '@/components/ScreenInfo'
import I18nWrapper from '@/components/I18nWrapper'
import Breadcrumb from '@/components/Breadcrumb'
import RelatedTools from '@/components/RelatedTools'

export const metadata: Metadata = {
  title: '화면/기기 정보 - 해상도, 브라우저, OS 확인 | 툴허브',
  description: '내 화면 크기, 해상도, 뷰포트, 브라우저, OS, CPU 코어 수 등 기기 정보를 한눈에 확인하세요. 웹 개발, 기술 지원에 유용합니다.',
  keywords: '화면 크기 확인, 해상도 확인, 뷰포트 크기, 내 화면 해상도, screen resolution, 브라우저 정보',
  openGraph: { title: '화면/기기 정보 | 툴허브', description: '화면 해상도, 브라우저, OS 정보 확인', url: 'https://toolhub.ai.kr/screen-info', siteName: '툴허브', locale: 'ko_KR', type: 'website' },
  twitter: { card: 'summary_large_image', title: '화면/기기 정보 | 툴허브', description: '화면 해상도, 브라우저, OS 정보 확인' },
  alternates: { canonical: 'https://toolhub.ai.kr/screen-info/' },
}

export default function ScreenInfoPage() {
  const jsonLd = { '@context': 'https://schema.org', '@type': 'WebApplication', name: '화면/기기 정보', description: '화면 해상도, 뷰포트, 브라우저, OS 정보 확인', url: 'https://toolhub.ai.kr/screen-info', applicationCategory: 'UtilityApplication', operatingSystem: 'Any', browserRequirements: 'JavaScript', offers: { '@type': 'Offer', price: '0', priceCurrency: 'KRW' }, featureList: ['화면 해상도/뷰포트', '브라우저 정보', '기기 정보', '전체 복사'] }
  const faqJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
      {
        '@type': 'Question',
        name: '화면 해상도와 관련 용어는?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: '해상도: 화면의 픽셀 수 (예: 1920×1080 = FHD). 주요 해상도: HD(1280×720), FHD(1920×1080), QHD/2K(2560×1440), 4K/UHD(3840×2160). DPI/PPI: 인치당 픽셀 수, 높을수록 선명. 일반 모니터 96-110ppi, 레티나 디스플레이 220+ppi. Device Pixel Ratio: CSS 픽셀과 물리 픽셀의 비율 (레티나는 2x 또는 3x). 색 심도: 8bit(1,670만 색), 10bit(10억 색).',
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
          <Suspense fallback={<div className="text-center text-gray-900 dark:text-white">Loading...</div>}><I18nWrapper><ScreenInfo />  <div className="mt-8">
    <RelatedTools />
  </div>
</I18nWrapper></Suspense>
        </div>
      </div>
      {/* SEO 콘텐츠 */}
      <section className="max-w-4xl mx-auto px-4 pb-12">
        <div className="mt-12 border-t border-gray-200 dark:border-gray-700 pt-8">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
            화면/기기 정보 확인 도구란?
          </h2>
          <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-6">
            화면/기기 정보 확인 도구는 현재 접속 중인 기기의 화면 해상도, 뷰포트 크기, 브라우저 종류와 버전, 운영체제, CPU 코어 수, 기기 픽셀 비율(DPR) 등 상세한 시스템 정보를 즉시 표시해 주는 온라인 유틸리티입니다. 웹 개발 시 반응형 디자인 디버깅, 기술 지원 문의 시 환경 정보 전달, 기기 성능 확인 등에 폭넓게 활용됩니다.
          </p>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
            화면/기기 정보 도구 활용 팁
          </h3>
          <ul className="list-disc list-inside space-y-2 text-gray-700 dark:text-gray-300">
            <li><strong>반응형 웹 개발 디버깅:</strong> CSS 미디어 쿼리는 물리적 해상도가 아닌 CSS 픽셀(뷰포트) 기준으로 작동합니다. 뷰포트 크기를 확인하면 브레이크포인트가 올바르게 적용되는지 검증할 수 있습니다.</li>
            <li><strong>기술 지원 정보 제공:</strong> 소프트웨어 버그나 오류를 신고할 때 브라우저 버전, OS, 화면 해상도 등 이 도구에서 확인한 정보를 함께 전달하면 문제 재현과 해결이 빨라집니다.</li>
            <li><strong>레티나 디스플레이 확인:</strong> Device Pixel Ratio(DPR)가 2 이상이면 레티나/고해상도 디스플레이입니다. 이미지와 아이콘을 2배 해상도로 제공해야 선명하게 표시됩니다.</li>
            <li><strong>전체 정보 복사:</strong> 모든 기기 정보를 한 번에 클립보드에 복사하는 기능을 이용하면 개발팀이나 기술 지원팀에 빠르게 환경 정보를 공유할 수 있습니다.</li>
          </ul>
        </div>
      </section>
    </>
  )
}
