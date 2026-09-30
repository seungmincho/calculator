import { Metadata } from 'next'
import DueDateCalculator from '@/components/DueDateCalculator'
import I18nWrapper from '@/components/I18nWrapper'
import RelatedTools from '@/components/RelatedTools'

export const metadata: Metadata = {
  title: '출산 예정일 계산기 - 임신 주수 | 툴허브',
  description: '출산 예정일 계산기 - 마지막 생리일(주기 보정)·수정일·초음파·시험관 이식일로 출산 예정일과 현재 임신 주수(N주 M일)를 계산합니다. 기형아 검사·정밀초음파·임신성 당뇨 검사 날짜, 출산휴가 시작일, 임신 바우처까지 한 번에 확인하세요.',
  keywords: '출산 예정일 계산, 임신 주수 계산, 출산일 계산기, 시험관 예정일, 초음파 예정일, 기형아 검사 시기, 출산휴가 시작일, 임신 바우처, due date calculator, 임신 계산기',
  openGraph: { title: '출산 예정일 계산기 | 툴허브', description: '출산 예정일·임신 주수·검사 일정·출산휴가 시작일', url: 'https://toolhub.ai.kr/due-date', siteName: '툴허브', locale: 'ko_KR', type: 'website', images: [{ url: 'https://toolhub.ai.kr/og/due-date.png', width: 1200, height: 630, alt: '출산 예정일 계산기' }] },
  twitter: { card: 'summary_large_image', title: '출산 예정일 계산기 | 툴허브', description: '출산 예정일·임신 주수·검사 일정·출산휴가 시작일', images: ['https://toolhub.ai.kr/og/due-date.png'] },
  alternates: { canonical: 'https://toolhub.ai.kr/due-date/' },
}

export default function DueDatePage() {
  const jsonLd = { '@context': 'https://schema.org', '@type': 'WebApplication', name: '출산 예정일 계산기', description: '출산 예정일 및 임신 주수 계산', url: 'https://toolhub.ai.kr/due-date', applicationCategory: 'HealthApplication', operatingSystem: 'Any', browserRequirements: 'JavaScript', offers: { '@type': 'Offer', price: '0', priceCurrency: 'KRW' }, featureList: ['LMP 주기 보정 예정일', '수정일·초음파·시험관(IVF) 기준 예정일', '임신 주수·개월·분기', '기형아 검사·정밀초음파·임신성 당뇨 검사 날짜', '출산전후휴가 시작일', '임신·출산 진료비 바우처', '결과 공유 링크'] }
  const faqJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
      { '@type': 'Question', name: '출산 예정일은 어떻게 계산하나요?', acceptedAnswer: { '@type': 'Answer', text: '출산 예정일은 마지막 생리 시작일(LMP)에 280일(40주)을 더하여 계산합니다. 네겔레 법칙으로는 LMP 월에서 3을 빼고(또는 9를 더하고) 일에 7을 더합니다. 예를 들어 LMP가 1월 1일이면 예정일은 10월 8일입니다. 생리 주기가 28일이 아니면 차이만큼 더하거나 빼고, 수정일 기준은 +266일, 시험관은 5일 배아 이식일 +261일·3일 배아 +263일(ACOG)로 계산합니다. 임신 초기 초음파 기록이 있으면 그 기준이 가장 정확합니다.' } },
      { '@type': 'Question', name: '임신 삼분기별 특징은 무엇인가요?', acceptedAnswer: { '@type': 'Answer', text: '1분기(~13주 6일): 태아 주요 장기 형성, 입덧, 피로감. 2분기(14~27주): 태동 시작, 안정기, 성별 확인 가능. 3분기(28~40주): 태아 급성장, 출산 준비, 배가 많이 불러옴. 임신 초기 엽산 섭취가 중요하며, 정기 산전검사(초음파, 기형아검사, 임신성 당뇨검사 등)를 빠짐없이 받으세요.' } },
      { '@type': 'Question', name: '예정일보다 빨리 또는 늦게 출산할 수 있나요?', acceptedAnswer: { '@type': 'Answer', text: '네, 예정일은 추정치이며 예정일 당일에 출산하는 경우는 소수입니다. 초산은 예정일보다 늦어지는 경향이 있고, 경산은 빨라지는 경향이 있습니다. 37주 0일~41주 6일 출산은 정상(만삭)이며, 37주 미만은 조산, 42주 이상은 과숙 임신으로 분류됩니다. 분만 시기는 담당 의료진과 상의하세요.' } },
    ],
  }
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />
      <div className="min-h-screen py-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <I18nWrapper>
            <DueDateCalculator />
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
            출산 예정일 계산기란?
          </h2>
          <p className="text-body leading-relaxed mb-6">
            출산 예정일 계산기는 마지막 생리 시작일(LMP), 수정일, 초음파 측정 주수, 시험관 이식일 중 하나로 출산 예정일과 현재 임신 주수를 계산하는 도구입니다. 네겔레 법칙(LMP + 280일)에 생리 주기 보정을 더하고, 기형아 검사·정밀초음파·임신성 당뇨 검사 날짜와 출산휴가 시작일도 함께 보여줍니다. 임신 초기부터 출산 준비까지 임신 주수 및 예정일을 간편하게 확인할 수 있습니다.
          </p>
          <h3 className="text-lg font-semibold text-fg mb-3">
            출산 예정일 계산기 활용 팁
          </h3>
          <ul className="list-disc list-inside space-y-2 text-body">
            <li><strong>LMP 기준 계산:</strong> 마지막 생리 시작일에 280일(40주)을 더하면 출산 예정일이 됩니다. 생리 주기가 35일이면 7일 늦게, 21일이면 7일 빠르게 보정합니다.</li>
            <li><strong>임신 주수 확인:</strong> 오늘 기준으로 몇 주 몇 일째인지 자동 계산됩니다. 산부인과 진료 예약 전 미리 확인하면 더 정확한 상담이 가능합니다.</li>
            <li><strong>삼분기별 일정:</strong> 1분기(엽산 섭취·기형아 검사), 2분기(정밀 초음파·임신성 당뇨 검사), 3분기(출산 준비·태아 감시) 일정을 미리 파악하세요.</li>
            <li><strong>출산 예정일의 의미:</strong> 예정일은 추정치이며 대부분 예정일 전후로 출산합니다. 37주 0일~41주 6일 출산이 정상 범위이며, 예정일은 병원 진료 시 의료진과 확인하세요.</li>
          </ul>
        </div>
      </section>
    </>
  )
}
