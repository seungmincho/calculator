import { Metadata } from 'next'
import { Suspense } from 'react'
import MonitorTest from '@/components/MonitorTest'
import I18nWrapper from '@/components/I18nWrapper'

export const metadata: Metadata = {
  title: '모니터 테스트 - 불량화소, 명암비, 색상, 감마, 번인 검사 | 툴허브',
  description: '모니터 불량화소 테스트, 시야각, 명암비, 가독성, 색상비, 응답속도, 감마, 빛샘, 잔상/번인, 화이트밸런스, 블랙밸런스, 화면조정, 불량화소 복구까지 14가지 모니터 품질 테스트를 무료로 제공합니다.',
  keywords: '모니터 테스트, 불량화소 테스트, 데드픽셀 검사, 모니터 불량화소, 명암비 테스트, 감마 테스트, 빛샘 테스트, 번인 테스트, 모니터 점검, 화이트밸런스, 블랙밸런스, 응답속도 테스트, 모니터 캘리브레이션',
  openGraph: {
    title: '모니터 테스트 - 14가지 종합 모니터 품질 검사 | 툴허브',
    description: '불량화소부터 복구까지! 14가지 모니터 테스트를 한 곳에서. 무료 온라인 모니터 품질 검사 도구.',
    url: 'https://toolhub.ai.kr/monitor-test',
    siteName: '툴허브',
    locale: 'ko_KR',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: '모니터 테스트 - 14가지 종합 검사 | 툴허브',
    description: '불량화소, 명암비, 감마, 번인 등 14가지 모니터 품질 테스트를 무료로 제공합니다.',
  },
  alternates: {
    canonical: 'https://toolhub.ai.kr/monitor-test',
  },
}

export default function MonitorTestPage() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: '모니터 테스트 - 14가지 종합 품질 검사',
    description: '불량화소, 시야각, 명암비, 가독성, 색상비, 응답속도, 감마, 빛샘, 번인, 화이트밸런스, 블랙밸런스, 이미지표현, 화면조정, 불량화소 복구 등 14가지 모니터 테스트',
    url: 'https://toolhub.ai.kr/monitor-test',
    applicationCategory: 'UtilityApplication',
    operatingSystem: 'Any',
    browserRequirements: 'JavaScript, Fullscreen API',
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'KRW',
    },
    featureList: [
      '불량화소(데드픽셀) 8색 테스트',
      '시야각 도트 패턴 6단계',
      '명암비 그라데이션 14단계',
      '가독성 텍스트 12단계',
      '색상비 RGB 채널별 테스트',
      '응답속도/주사율 5단계 fps 테스트',
      '감마 4색 보정 테스트',
      '빛샘/멍/한지/빗살무늬/그레인 15단계',
      '잔상/번인 7색 모자이크 비교',
      '화이트밸런스 15단계',
      '블랙밸런스 15단계',
      '이미지표현 테스트 패턴 + 사용자 업로드',
      '화면조정 그리드/크로스헤어/컬러바/세이프에어리어',
      '불량화소 복구 랜덤 픽셀 플래싱',
    ],
  }

  const faqJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
      {
        '@type': 'Question',
        name: '모니터 테스트로 확인할 수 있는 것은?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: '① 데드픽셀: 빨강/초록/파랑/흰색/검정 전체 화면으로 불량 픽셀 확인 ② 색상 정확도: 색상 그라디언트에서 밴딩(줄무늬) 확인 ③ 명암비(Contrast): 검정과 흰색 경계에서 디테일 확인 ④ 백라이트 균일성: 전체 회색 화면에서 밝기 불균일 확인 ⑤ 응답 속도: 움직이는 물체로 잔상 확인 ⑥ 시야각: 다른 각도에서 색상 변화 확인. 새 모니터 구매 후 불량 교환 기간 내 테스트를 권장합니다.',
        },
      },
    ],
  }

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 py-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <Suspense fallback={<div className="text-center text-gray-900 dark:text-white">Loading...</div>}>
            <I18nWrapper>
              <MonitorTest />
            </I18nWrapper>
          </Suspense>
        </div>
      </div>
    </>
  )
}
