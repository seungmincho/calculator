import { Metadata } from 'next'
import LunarConverter from '@/components/LunarConverter'
import I18nWrapper from '@/components/I18nWrapper'
import RelatedTools from '@/components/RelatedTools'
import ToolFaq from '@/components/ToolFaq'

export const metadata: Metadata = {
  title: '음력 양력 변환기 - 음력 날짜 변환, 띠, 간지 | 툴허브',
  description: '음력↔양력 날짜를 바로 변환하고 띠·간지(60갑자)·일진까지 확인하세요. 음력 생일이나 제삿날을 넣으면 올해부터 10년 뒤까지 양력 날짜와 다음 기념일 D-day를 보여 줍니다. 1900~2050년, 윤달까지 지원합니다.',
  keywords: '음력 양력 변환, 음력 변환기, 양력 음력 변환, 음력 생일, 음력 날짜, lunar calendar converter',
  openGraph: { title: '음력 양력 변환기 | 툴허브', description: '음력 ↔ 양력 날짜 변환, 띠, 간지 정보', url: 'https://toolhub.ai.kr/lunar-converter', siteName: '툴허브', locale: 'ko_KR', type: 'website', images: [{ url: 'https://toolhub.ai.kr/og/lunar-converter.png', width: 1200, height: 630, alt: '음력 양력 변환기' }] },
  twitter: { card: 'summary_large_image', title: '음력 양력 변환기 | 툴허브', description: '음력 ↔ 양력 날짜 변환', images: ['https://toolhub.ai.kr/og/lunar-converter.png'] },
  alternates: { canonical: 'https://toolhub.ai.kr/lunar-converter/' },
}

export default function LunarConverterPage() {
  const jsonLd = { '@context': 'https://schema.org', '@type': 'WebApplication', name: '음력 양력 변환기', description: '음력 ↔ 양력 날짜 변환, 띠, 간지(60갑자) 정보', url: 'https://toolhub.ai.kr/lunar-converter/', applicationCategory: 'UtilityApplication', operatingSystem: 'Any', browserRequirements: 'JavaScript', offers: { '@type': 'Offer', price: '0', priceCurrency: 'KRW' }, featureList: ['양력→음력 변환', '음력→양력 변환', '음력 생일 향후 10년 양력 날짜', '다음 음력 생일 D-day', '띠·간지·일진 정보', '윤달 지원', '한국천문연구원 역서 기준'] }
  const faq = [
    { q: '음력과 양력의 차이는?', a: '양력(태양력): 지구가 태양을 도는 주기(약 365.2422일) 기준. 전 세계 표준 달력(그레고리력). 음력(태음태양력): 달의 위상 변화 주기(29.5일) 기준으로 한 달을 정합니다. 12달은 약 354일이므로 윤달을 두어 양력과 맞춥니다. 한국에서는 설날, 추석, 생일 등에 음력을 사용합니다. 음력 날짜는 매년 양력 날짜가 달라지므로 변환이 필요합니다.' },
    { q: '음력 생일은 올해 양력으로 며칠인가요?', a: '해마다 다릅니다. 음력 날짜를 입력하면 올해부터 10년 뒤까지 해당 날짜의 양력 날짜와, 다음 생일까지 남은 날(D-day)을 한 번에 보여 줍니다. 제삿날처럼 매년 챙기는 음력 날짜도 같은 방법으로 확인하세요.' },
    { q: '몇 년도까지 변환할 수 있나요?', a: '1900년부터 2050년까지 변환할 수 있으며, 한국천문연구원 역서를 기준으로 합니다. 윤달이 있는 해에는 윤달 여부를 선택해 변환합니다.' },
  ]
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <div className="min-h-screen py-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <I18nWrapper>
            <LunarConverter />
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
              음력 양력 변환기란?
            </h2>
            <p className="text-body leading-relaxed mb-6">
              음력 양력 변환기는 음력 날짜를 양력으로, 양력 날짜를 음력으로 즉시 변환해주는 도구입니다. 음력 생일, 제삿날, 설날·추석·정월대보름 등 명절 날짜의 양력 확인에 필수적이며, 60갑자(간지)와 띠 정보, 윤달 여부까지 함께 제공합니다. 매년 달라지는 음력 기념일의 양력 날짜를 빠르게 조회하세요.
            </p>
            <h3 className="text-lg font-semibold text-fg mb-3">
              음력 양력 변환기 활용 팁
            </h3>
            <ul className="list-disc list-inside space-y-2 text-body">
              <li><strong>음력 생일 확인:</strong> 음력으로 생일을 기억하는 어르신의 올해 양력 생일을 쉽게 찾을 수 있습니다.</li>
              <li><strong>제사·기일 조회:</strong> 음력으로 기록된 제삿날을 매년 양력으로 변환해 일정 앱에 등록하세요.</li>
              <li><strong>윤달 주의:</strong> 윤달이 있는 해는 같은 음력 날짜가 두 번 등장할 수 있으므로 윤달 여부를 반드시 확인하세요.</li>
              <li><strong>띠·간지 확인:</strong> 출생 연도의 띠와 60갑자 간지를 함께 조회할 수 있습니다. 이 도구의 띠·연 간지는 설날 기준이라, 입춘 기준을 쓰는 사주와는 1~2월생에서 다를 수 있습니다.</li>
            </ul>
          </div>
        </section>
    </>
  )
}
