import { Metadata } from 'next'
import FuelCalculator from '@/components/FuelCalculator'
import I18nWrapper from '@/components/I18nWrapper'
import RelatedTools from '@/components/RelatedTools'
import ToolFaq from '@/components/ToolFaq'

export const metadata: Metadata = {
  title: '유류비 계산기 - 업무용 차량 정산 | 툴허브',
  description: '업무용 차량 유류비를 주행거리·연비·유가로 계산하고 감가상각비와 경비 처리 기준까지 확인하세요. 오피넷 시·도별 유가(지난 날짜 포함)를 불러오고, 편도·왕복 출장 정산서 복사, 주행일지, 결과 이미지·링크 공유를 지원합니다.',
  keywords: '유류비계산기, 차량연료비, 업무용차량, 연비계산, 감가상각비, 회사경비, 출장비, 교통비정산, 차량유지비, 기름값계산',
  openGraph: {
    title: '유류비 계산기 | 툴허브',
    description: '회사 업무용 차량 유류비 계산기 - 차종별 연비 + 실시간 유가 + 감가상각비',
    url: 'https://toolhub.ai.kr/fuel-calculator',
    siteName: '툴허브',
    locale: 'ko_KR',
    type: 'website',
    images: [{ url: 'https://toolhub.ai.kr/og/fuel-calculator.png', width: 1200, height: 630, alt: '유류비 계산기' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: '유류비 계산기 - 회사 업무용 차량 연료비 정산',
    description: '차종별 연비와 실시간 유가로 정확한 유류비를 계산하세요.',
    images: ['https://toolhub.ai.kr/og/fuel-calculator.png'],
  },
  alternates: {
    canonical: 'https://toolhub.ai.kr/fuel-calculator/',
  },
}

export default function FuelCalculatorPage() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: '유류비 계산기',
    description: '회사 업무용 차량의 연료비와 감가상각비를 계산하는 무료 온라인 도구',
    url: 'https://toolhub.ai.kr/fuel-calculator/',
    applicationCategory: 'UtilityApplication',
    operatingSystem: 'Any',
    browserRequirements: 'JavaScript',
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'KRW'
    },
    featureList: [
      '차종별 연비 자동 계산',
      '실시간 유가 정보 반영',
      '주행거리 기반 연료비 계산',
      '차량 감가상각비 계산',
      '업무용 차량 경비 정산',
      '출장비 교통비 계산',
      '결과 이미지·링크 공유',
    ]
  }

  const faq = [
    { q: '업무용 차량 유류비를 경비 처리하려면 어떻게 하나요?', a: '법인과 복식부기의무 개인사업자의 업무용승용차는 유류비·보험료·감가상각비 등 관련비용 중 운행기록부로 확인한 업무사용비율만큼 경비로 인정됩니다. 운행기록부를 쓰지 않으면 관련비용 연 1,500만원까지만 인정됩니다(법인세법 시행령 제50조의2, 소득세법 시행령 제78조의3). 주유 영수증과 운행기록부를 보관하세요.' },
    { q: '자동차 감가상각비는 어떻게 계산하나요?', a: '업무용 승용차의 감가상각은 정액법으로 내용연수 5년을 적용합니다. 연간 감가상각 한도는 800만원이며, 취득가액을 5년에 걸쳐 균등하게 비용 처리합니다. 리스·렌트 차량도 연간 800만원 한도가 적용됩니다.' },
    { q: '휘발유와 경유의 연비 차이는 어느 정도인가요?', a: '일반적으로 경유 차량이 휘발유 차량보다 연비가 15~30% 좋습니다. 같은 차종 기준 휘발유차 12km/L라면 경유차는 약 14~16km/L입니다. 다만 경유 가격이 휘발유보다 저렴해 실제 주유비 차이는 20~40%까지 벌어질 수 있습니다. LPG 차량은 연비는 낮지만 연료비가 가장 저렴합니다.' },
  ]

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <div className="min-h-screen py-8 overflow-hidden">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
            <I18nWrapper>
              <FuelCalculator />
              <ToolFaq items={faq} />
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
            유류비 계산기란?
          </h2>
          <p className="text-body leading-relaxed mb-6">
            유류비 계산기는 회사 업무용 차량의 연료비와 감가상각비를 차종별 연비·주행거리·유가 기준으로 자동 계산하는 온라인 도구입니다. 법인차·개인사업자 차량의 출장비·교통비 정산, 경비 처리 근거 산출, 차량 운행일지 작성 지원 등 업무용 차량 비용 관리에 활용할 수 있습니다.
          </p>
          <h3 className="text-lg font-semibold text-fg mb-3">
            유류비 절감 및 경비 처리 팁
          </h3>
          <ul className="list-disc list-inside space-y-2 text-body">
            <li><strong>차량운행일지 필수:</strong> 업무용 차량 유류비를 경비로 인정받으려면 출발지·목적지·주행거리를 기록한 차량운행일지가 필요합니다.</li>
            <li><strong>감가상각 한도 확인:</strong> 업무용 승용차의 연간 감가상각 경비 인정 한도는 800만원이므로, 고가 차량은 미리 한도를 확인하세요.</li>
            <li><strong>유종별 비용 비교:</strong> 휘발유·경유·LPG·전기 등 유종별 연료비를 비교하면 장기적으로 유지비가 낮은 차종을 선택하는 데 도움이 됩니다.</li>
            <li><strong>연비 향상 방법:</strong> 급가속·급제동 자제, 적정 타이어 공기압 유지, 에어컨 절제 사용으로 실연비를 10~20% 향상시킬 수 있습니다.</li>
          </ul>
        </div>
      </section>
    </>
  )
}
