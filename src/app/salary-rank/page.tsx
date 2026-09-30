import { Metadata } from 'next'
import SalaryRank from '@/components/SalaryRank'
import I18nWrapper from '@/components/I18nWrapper'

export const metadata: Metadata = {
  title: '내 연봉 상위 몇 %? - 연봉 순위 계산기 | 툴허브',
  description: '내 연봉이 한국 전체에서 상위 몇 퍼센트인지 확인하세요. 국세청 근로소득 백분위 기준, 분포 곡선에서 내 위치와 연령대·성별 비교. 결과 카드 이미지 공유 가능.',
  keywords: '연봉 순위, 연봉 상위 퍼센트, 소득 분위, 연봉 비교, 평균 연봉, 중위 소득, 연봉 백분위',
  openGraph: {
    title: '내 연봉 상위 몇 %? | 툴허브',
    description: '내 연봉은 한국에서 상위 몇 %일까? 공식 데이터 기반 연봉 순위 계산',
    url: 'https://toolhub.ai.kr/salary-rank',
    siteName: '툴허브',
    locale: 'ko_KR',
    type: 'website',
    images: [{ url: 'https://toolhub.ai.kr/og/salary-rank.png', width: 1200, height: 630, alt: '내 연봉 상위 몇 %?' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: '내 연봉 상위 몇 %?',
    description: '국세청 데이터 기반 연봉 순위 확인',
    images: ['https://toolhub.ai.kr/og/salary-rank.png'],
  },
  alternates: {
    canonical: 'https://toolhub.ai.kr/salary-rank',
  },
}

export default function SalaryRankPage() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: '연봉 순위 계산기',
    description: '내 연봉이 한국에서 상위 몇 %인지 확인하는 계산기',
    url: 'https://toolhub.ai.kr/salary-rank',
    applicationCategory: 'FinanceApplication',
    operatingSystem: 'Any',
    browserRequirements: 'JavaScript',
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'KRW' },
    featureList: [
      '국세청 근로소득 백분위(2023년 귀속) 기반 상위 % 계산',
      '근로소득 분포 곡선에서 내 위치와 다음 구간까지 필요한 연봉',
      '연령대·성별·직업군별 추정 비교, 월 실수령액 연결',
      '결과 카드 이미지 저장·공유 (카카오톡/SNS), 링크로 결과 재현',
      '익명 참여 커뮤니티 통계',
    ],
  }

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <div className="min-h-screen py-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
            <I18nWrapper>
              <SalaryRank />
            </I18nWrapper>
        </div>
      </div>
    </>
  )
}
