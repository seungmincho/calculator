import { Metadata } from 'next'
import HolidayPlanner from '@/components/HolidayPlanner'
import I18nWrapper from '@/components/I18nWrapper'
import RelatedTools from '@/components/RelatedTools'
import { getKoreanHolidays } from '@/utils/koreanHolidays'

export const metadata: Metadata = {
  title: '연휴 플래너 - 2027 공휴일·연차 붙이기 추천 | 툴허브',
  description: '2027년 공휴일 72일과 대체공휴일을 반영해 연차를 어디에 붙이면 가장 오래 쉬는지 찾아 드립니다. 추석 연차 2일로 9일 연휴, 12달 달력, 연차 명당 순위, 캘린더(.ics) 저장과 결과 공유까지.',
  keywords: '연휴 플래너, 2027 공휴일, 2027년 공휴일, 내년 황금연휴, 연차 붙이기, 연차 최대 활용, 2027 황금연휴, 대체공휴일, 2027 추석 연휴, 2027 설 연휴, 연차 추천, 징검다리 연휴, 노동절 공휴일, 제헌절 공휴일',
  openGraph: {
    title: '연휴·연차 플래너 2027 | 툴허브',
    description: '연차 며칠로 최대 며칠 쉴 수 있을까? 2027년 공휴일 기준 연차 붙이기 자동 추천.',
    url: 'https://toolhub.ai.kr/holiday-planner/',
    siteName: '툴허브', locale: 'ko_KR', type: 'website',
    images: [{ url: 'https://toolhub.ai.kr/og/holiday-planner.png', width: 1200, height: 630, alt: '연휴·연차 플래너 2027' }],
  },
  twitter: { card: 'summary_large_image', title: '연휴·연차 플래너 2027 | 툴허브', description: '2027년 공휴일 기준 연차 붙이기 자동 추천', images: ['https://toolhub.ai.kr/og/holiday-planner.png'] },
  alternates: { canonical: 'https://toolhub.ai.kr/holiday-planner/' },
}

// 컴포넌트 가이드 FAQ(messages holidayPlanner.guide.faq)와 같은 내용 — 화면에 보이는 FAQ만 구조화 데이터로
const faqs = [
  { q: '2027년 공휴일은 모두 며칠인가요?', a: '우주항공청이 발표한 2027년 월력요항 기준 관공서 공휴일은 일요일을 포함해 72일입니다. 토요일까지 쉬는 주5일 근무자는 119일을 쉬고, 연차 없이 3일 이상 이어지는 연휴는 10번입니다.' },
  { q: '2027년에 연차를 붙이기 좋은 날은 언제인가요?', a: '추석은 9월 13일(월)과 17일(금) 연차 2일로 9월 11일부터 19일까지 9일을 쉴 수 있습니다. 설은 2월 10~12일 3일로 2월 6~14일 9일, 5월은 4일(화) 하루만 내도 5월 1~5일 5일 연휴이고, 10월은 5~8일 4일로 10월 2~11일 10일 연휴가 됩니다.' },
  { q: '연휴 일수는 어떻게 세나요?', a: '연차를 붙여 만든 연휴의 첫날부터 마지막 날까지 주말과 공휴일을 포함해 셉니다. 예를 들어 금요일에 연차를 내서 토·일·월(대체공휴일)과 이으면 4일입니다. 총 휴일은 플랜에 들어간 연휴들의 일수를 모두 더한 값입니다.' },
  { q: '작은 회사도 공휴일과 대체공휴일에 쉬나요?', a: '상시 5인 이상 사업장은 2022년부터 관공서 공휴일과 대체공휴일이 법정 유급휴일입니다(근로기준법 제55조). 5인 미만 사업장은 의무가 아니어서 회사 규정을 확인해야 합니다. 노동절(5월 1일)은 규모와 상관없이 근로자의 유급휴일입니다.' },
  { q: '회사가 원하는 날에 연차를 못 쓰게 할 수 있나요?', a: '연차는 근로자가 원하는 시기에 쓰는 것이 원칙입니다. 다만 그때 쉬면 사업 운영에 막대한 지장이 있는 경우에 한해 회사가 시기를 바꿀 수 있습니다(근로기준법 제60조 제5항). 성수기 연휴는 미리 신청해 두는 것이 안전합니다.' },
  { q: '캘린더 파일(.ics)은 어떻게 쓰나요?', a: "'캘린더에 추가'를 누르면 추천 연차 날짜가 종일 일정으로 담긴 .ics 파일이 저장됩니다. 구글 캘린더는 설정의 가져오기 메뉴에서, 아이폰과 갤럭시는 파일을 열면 캘린더에 추가할 수 있습니다." },
  { q: '임시공휴일도 반영되나요?', a: '정부가 국무회의에서 임시공휴일을 지정하면 반영합니다. 2027년 임시공휴일은 아직 지정되지 않았고, 지정되면 쉬는 날이 늘어 추천도 달라질 수 있습니다.' },
]

const W = ['일', '월', '화', '수', '목', '금', '토']
const md = (date: string) => {
  const [y, m, d] = date.split('-').map(Number)
  return `${m}월 ${d}일(${W[new Date(Date.UTC(y, m - 1, d)).getUTCDay()]})`
}

export default function HolidayPlannerPage() {
  const holidays2027 = getKoreanHolidays(2027)
  const jsonLd = {
    '@context': 'https://schema.org', '@type': 'WebApplication',
    name: '연휴·연차 플래너',
    description: '2026·2027년 공휴일과 대체공휴일 기준으로 연차를 어디에 붙이면 가장 오래 쉬는지 추천하는 도구.',
    url: 'https://toolhub.ai.kr/holiday-planner/',
    applicationCategory: 'UtilityApplication', operatingSystem: 'Any', browserRequirements: 'JavaScript',
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'KRW' },
    featureList: ['연차 일수별 최대 연휴 플랜', '긴 연휴 우선 플랜', '연차 명당(1일당 효율) 순위', '12달 연휴 달력', '공휴일·대체공휴일 통계', '캘린더(.ics) 저장', '결과 이미지 공유'],
  }
  const faqJsonLd = {
    '@context': 'https://schema.org', '@type': 'FAQPage',
    mainEntity: faqs.map((f) => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })),
  }

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />
      <div className="min-h-screen py-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <I18nWrapper>
            <HolidayPlanner />
            <div className="mt-8">
              <RelatedTools />
            </div>
          </I18nWrapper>
        </div>
      </div>
      <section className="max-w-4xl mx-auto px-4 pb-12">
        <div className="mt-12 border-t border-line pt-8">
          <h2 className="text-xl font-bold text-fg mb-4">2027년 공휴일과 황금연휴</h2>
          <p className="text-body leading-relaxed mb-6">
            우주항공청이 2026년 6월 29일 발표한 2027년도 월력요항에 따르면 2027년 관공서 공휴일은 일요일을 포함해 72일이고, 토요일까지 쉬는 주5일 근무자는 119일을 쉽니다. 2026년부터 공휴일이 된 노동절(5월 1일)과 제헌절(7월 17일)이 2027년에는 모두 토요일이라 월요일 대체공휴일이 생기고, 광복절·개천절·한글날·성탄절도 주말과 겹쳐 대체공휴일이 모두 7일입니다. 연차 없이 3일 이상 이어지는 연휴는 10번입니다.
          </p>
          <h3 className="text-lg font-semibold text-fg mb-3">2027년 공휴일 목록</h3>
          <ul className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 text-body mb-6">
            {holidays2027.map((h) => (
              <li key={h.date + h.nameKey} className="flex justify-between gap-3 py-1.5 border-b border-line">
                <span className="tabular-nums">{md(h.date)}</span>
                <span className="text-sub text-right">{h.name}</span>
              </li>
            ))}
          </ul>
          <h3 className="text-lg font-semibold text-fg mb-3">2027년 연차 붙이기 추천</h3>
          <ul className="list-disc list-inside space-y-2 text-body">
            <li><strong>추석:</strong> 9월 13일(월)·17일(금) 연차 2일 → 9월 11일(토)~19일(일) 9일 연휴.</li>
            <li><strong>설:</strong> 2월 5일(금) 하루면 2월 5~9일 5일, 2월 10~12일 3일이면 2월 6~14일 9일.</li>
            <li><strong>5월:</strong> 5월 4일(화) 하루로 노동절 대체공휴일과 어린이날을 이어 5월 1~5일 5일, 4·6·7일 3일이면 5월 1~9일 9일.</li>
            <li><strong>10월:</strong> 10월 5~8일 연차 4일 → 개천절·한글날 대체공휴일을 이어 10월 2일(토)~11일(월) 10일.</li>
            <li><strong>연말:</strong> 12월 28~31일 연차 4일 → 12월 25일(토)부터 2028년 1월 2일(일)까지 9일.</li>
          </ul>
        </div>
      </section>
    </>
  )
}
