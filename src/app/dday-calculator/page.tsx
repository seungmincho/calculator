import { Metadata } from 'next'
import DdayCalculator from '@/components/DdayCalculator'
import I18nWrapper from '@/components/I18nWrapper'
import RelatedTools from '@/components/RelatedTools'
import { FaqJsonLd } from '@/components/ToolFaq'
import ddayCalculatorMessages from '../../../messages/generated/ko/ns/ddayCalculator.json'

export const metadata: Metadata = {
  title: '디데이 계산기 - D-Day·100일 기념일 계산 | 툴허브',
  description: '수능·시험·여행 D-Day를 저장하고 공유하세요. 연애·결혼·아기 100일/1주년 기념일, 날짜 차이, 날짜 더하기/빼기, 공휴일·영업일 계산까지 한 곳에서.',
  keywords: '디데이 계산기, D-Day, 수능 디데이, 100일 계산기, 기념일 계산기, 연애 날짜 계산, 날짜 계산, 날짜 차이, 영업일 계산, 공휴일',
  openGraph: {
    title: '디데이 계산기 | 툴허브',
    description: 'D-Day 카운트다운·저장·공유, 100일 기념일, 날짜 차이, 영업일 계산',
    url: 'https://toolhub.ai.kr/dday-calculator',
    siteName: '툴허브',
    locale: 'ko_KR',
    type: 'website',
    images: [{ url: 'https://toolhub.ai.kr/og/dday-calculator.png', width: 1200, height: 630, alt: '디데이 계산기' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: '디데이 계산기 - D-Day 카운터 & 날짜 계산',
    description: 'D-Day 카운트다운, 날짜 차이, 영업일 계산을 한 곳에서.',
    images: ['https://toolhub.ai.kr/og/dday-calculator.png'],
  },
  alternates: {
    canonical: 'https://toolhub.ai.kr/dday-calculator/',
  },
}

export default function DdayCalculatorPage() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: '디데이 계산기',
    description: 'D-Day 카운트다운·저장·공유, 100일·주년 기념일, 날짜 차이, 날짜 더하기/빼기 도구',
    url: 'https://toolhub.ai.kr/dday-calculator/',
    applicationCategory: 'UtilityApplication',
    operatingSystem: 'Any',
    browserRequirements: 'JavaScript',
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'KRW'
    },
    featureList: [
      'D-Day 카운트다운',
      '날짜 차이 계산',
      '날짜 더하기/빼기',
      '영업일 계산',
      '한국 공휴일 반영',
      '수능·설날·추석·크리스마스 D-Day 프리셋',
      '100일·1주년 기념일 계산 (시작일 포함 선택)',
      '내 D-Day 목록 저장·고정',
      '공휴일 표시 달력',
      '결과 이미지·링크 공유'
    ]
  }

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      {/* 컴포넌트가 화면에 보여 주는 FAQ와 같은 문구 */}
      <FaqJsonLd items={ddayCalculatorMessages.ddayCalculator.guide.faq.items} />
      <div className="min-h-screen py-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
            <I18nWrapper>
              <DdayCalculator />
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
            디데이(D-Day) 계산기란?
          </h2>
          <p className="text-body leading-relaxed mb-6">
            디데이 계산기는 특정 날짜까지 남은 일수를 카운트다운하거나, 두 날짜 사이의 정확한 차이를 계산하는 날짜 계산 도구입니다. 수능·시험·결혼·군전역 등 중요한 날까지의 D-Day를 확인하고 여러 개를 저장해 둘 수 있으며, 연애·결혼·아기 탄생일 기준 100일·1주년 기념일도 계산합니다. 한국 공휴일과 주말을 제외한 영업일 계산을 지원하고, 링크나 이미지로 결과를 나눌 수 있습니다.
          </p>
          <h3 className="text-lg font-semibold text-fg mb-3">
            디데이 계산기 활용 팁
          </h3>
          <ul className="list-disc list-inside space-y-2 text-body">
            <li><strong>수능·시험 D-Day:</strong> 시험 날짜를 입력하면 오늘부터 남은 일수를 한국 시간 기준으로 계산합니다. 2027학년도 수능(2026년 11월 19일), 설날·추석·크리스마스는 프리셋 한 번으로 등록됩니다.</li>
            <li><strong>영업일 계산:</strong> 계약서 체결 후 '10영업일 이내 지급' 같은 조건을 계산할 때 주말과 법정 공휴일이 자동으로 제외됩니다.</li>
            <li><strong>날짜 더하기/빼기:</strong> 기준일에서 일·주·월·년을 더하거나 빼서 계약 만료일, 보증 기간 종료일 등을 계산할 수 있습니다.</li>
            <li><strong>100일·기념일:</strong> 사귄 날이나 아기가 태어난 날을 넣으면 100일·200일·1주년 날짜와 남은 일수, 아기의 개월 수가 나옵니다.</li>
            <li><strong>저장·공유:</strong> D-Day를 목록에 저장하고 하나를 고정하면 다음 방문 때 바로 보입니다. 링크를 열면 같은 D-Day가 그대로 열립니다.</li>
          </ul>
        </div>
      </section>
    </>
  )
}
