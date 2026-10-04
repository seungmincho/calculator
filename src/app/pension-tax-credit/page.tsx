import { Metadata } from 'next'
import PensionTaxCreditCalculator from '@/components/PensionTaxCreditCalculator'
import I18nWrapper from '@/components/I18nWrapper'
import RelatedTools from '@/components/RelatedTools'
import ToolFaq from '@/components/ToolFaq'

export const metadata: Metadata = {
  title: '연금저축 IRP 세액공제 계산기 2026 - 연말 환급 | 툴허브',
  description: '연봉과 올해 연금저축·IRP 납입액으로 12월 31일까지 더 넣으면 돌려받는 세금(16.5%·13.2%)을 계산합니다. 남은 한도 600·900만원, ISA 만기 전환 추가공제, 결정세액 한도, 중도해지·연금 수령 때 세금까지 한 번에.',
  keywords: '연금저축 세액공제 계산기, IRP 세액공제, 연금저축 IRP 한도, 연금계좌 세액공제, 연금저축 900만원, 연말정산 연금저축, ISA 만기 연금전환, 연금저축 중도해지 세금, 연금소득세, 2026 연금저축',
  openGraph: {
    title: '연금저축 IRP 세액공제 계산기 2026 - 연말 환급 | 툴허브',
    description: '12월 31일까지 연금저축·IRP에 얼마를 더 넣으면 얼마를 돌려받는지, 꺼낼 때 낼 세금까지.',
    url: 'https://toolhub.ai.kr/pension-tax-credit/',
    siteName: '툴허브', locale: 'ko_KR', type: 'website',
    images: [{ url: 'https://toolhub.ai.kr/og/pension-tax-credit.png', width: 1200, height: 630, alt: '연금저축 IRP 세액공제 계산기 2026' }],
  },
  twitter: { card: 'summary_large_image', title: '연금저축·IRP 세액공제 계산기 | 툴허브', description: '연말까지 더 넣으면 돌려받는 세금과 남은 한도', images: ['https://toolhub.ai.kr/og/pension-tax-credit.png'] },
  alternates: { canonical: 'https://toolhub.ai.kr/pension-tax-credit/' },
}

// 숫자는 전부 scripts/check-pension-tax-credit.ts에서 확인 (연봉 외 공제 없는 근로소득자 기준)
const faqs = [
  { q: '연금저축·IRP 세액공제로 얼마를 돌려받나요?', a: '한 해 납입액의 15%(총급여 5,500만원 초과는 12%)를 소득세에서 빼 주고, 지방소득세까지 합치면 16.5%·13.2%가 줄어듭니다(소득세법 제59조의3). 한도인 900만원을 채우면 총급여 5,500만원 이하는 148만 5천원, 초과는 118만 8천원입니다. 근로소득 외 소득이 있으면 총급여 대신 종합소득금액 4,500만원이 기준입니다.' },
  { q: '연금저축과 IRP 한도는 어떻게 나뉘나요?', a: '연금저축은 연 600만원까지, 연금저축과 IRP를 합쳐 연 900만원까지 공제됩니다. IRP 하나에 900만원을 넣어도 되지만, 연금저축에 900만원을 넣으면 600만원을 넘는 300만원은 공제되지 않습니다. 한도를 넘겨 공제받지 못한 돈은 다음 해 이후 금융회사에 전환을 신청하면 그해 납입액으로 볼 수 있습니다(소득세법 시행령 제118조의3).' },
  { q: '12월 31일까지 넣으면 올해 공제되나요?', a: '연금계좌세액공제는 그 과세기간에 납입한 금액이 대상이라 12월 31일까지 계좌에 입금된 돈이 올해분입니다. 지난 연도분을 나중에 채워 넣을 수는 없어(보험 계약 제외, 시행령 제40조의2②) 해가 바뀐 뒤 넣은 돈은 새해 납입분으로 공제됩니다. 12월 31일은 증권시장 휴장일이고 입금 마감 시각은 금융회사마다 다르며, IRP는 마지막 영업일 오후로 앞당기는 곳도 있으니 가입한 금융회사 공지를 확인하고 며칠 여유 있게 넣는 것이 안전합니다.' },
  { q: '연봉이 낮아도 900만원을 다 넣는 게 좋나요?', a: '세액공제는 낼 세금(결정세액)이 있는 만큼만 효과가 있습니다. 연봉 3,500만원에 다른 공제가 없다면 올해 세금이 지방소득세 포함 105만 1,420원이라, 900만원을 넣어도 148만 5천원이 아니라 105만 1,420원만 돌려받습니다. 공제 대상 약 637만원부터는 세금이 더 줄지 않고, 연금저축 600만원(99만원 환급)에 IRP 300만원을 더 넣어도 늘어나는 환급은 6만 1,420원뿐입니다. 카드·부양가족 공제가 있으면 세금이 더 적으니 연말정산 계산기로 함께 확인하세요. 효과가 없는 금액은 공제 신청에서 빼 두면 다음 해 이후 납입액으로 전환하거나 나중에 세금 없이 찾을 수 있습니다.' },
  { q: 'ISA 만기 자금을 연금계좌로 옮기면 얼마나 더 공제되나요?', a: 'ISA 만기일부터 60일 안에 연금계좌로 옮기면(소득세법 시행령 제118조의2③) 옮긴 해에만 전환액의 10%, 최대 300만원만큼 한도가 늘어 최대 1,200만원까지 공제됩니다(소득세법 제59조의3④). 연봉 8,000만원이 900만원을 이미 채운 뒤 ISA 3,000만원을 옮기면 1,200만원 × 13.2% = 158만 4천원으로 39만 6천원이 늘고, 총급여 5,500만원 이하는 49만 5천원이 늘어납니다. 전환액은 연 1,800만원 납입 한도와 별도이고, 그해 납입액이라 남은 일반 한도도 채웁니다.' },
  { q: '중도 해지하면 공제받은 세금을 토해내나요?', a: '연금 형태가 아니게 꺼내면(연금외수령) 세액공제를 받은 납입액과 운용수익에 기타소득세 16.5%가 붙습니다(소득세법 제21조①21호, 제129조①6호나목). 900만원이면 148만 5천원이라, 총급여 5,500만원 이하는 원금만 보면 본전이지만 수익이 붙은 만큼 손해이고, 5,500만원 초과는 118만 8천원을 돌려받고 148만 5천원을 내 29만 7천원 손해입니다. 공제받지 않은 납입액은 먼저 빠지며 세금이 없고(시행령 제40조의3), 천재지변·사망·해외이주·3개월 이상 요양·파산 등 부득이한 사유면 연금소득세(3.3~5.5%)만 냅니다(시행령 제20조의2).' },
  { q: '연금으로 받을 때는 세금이 얼마인가요?', a: '55세 이후, 가입 5년이 지나 연금수령한도 안에서 받으면 연금소득세가 70세 미만 5.5%, 70~79세 4.4%, 80세 이상 3.3%입니다. 종신형 연금은 2026년 1월 1일 이후 받는 분부터 4.4%에서 3.3%로 낮아졌습니다(소득세법 제129조①5호의2). 900만원을 70세 전에 연금으로 받으면 세금은 49만 5천원입니다. 한 해 사적연금 수령액이 1,500만원을 넘으면 전액을 종합과세하거나 16.5% 분리과세 중 골라야 합니다(제14조③9호, 제64조의4).' },
  { q: '연금저축과 IRP 중 어디에 넣는 게 좋나요?', a: '공제율은 같습니다. 연금저축은 사유 없이 일부만 꺼낼 수 있고 주식형 펀드·ETF 비중 제한이 없습니다. IRP는 위험자산을 적립금의 70%까지만 담을 수 있고(근로자퇴직급여 보장법 시행규칙 제10조), 무주택자 주택 구입·전세보증금, 6개월 이상 요양, 5년 내 파산·개인회생 같은 법정 사유가 아니면 일부 인출이 안 돼 해지해야 합니다(같은 법 시행령 제18조). 그래서 연금저축 600만원을 먼저 채우고 나머지 300만원을 IRP에 넣는 경우가 많습니다.' },
  { q: '맞벌이 부부는 누구 계좌에 넣어야 하나요?', a: '세액공제는 본인 명의 계좌에 넣은 돈만 본인 세금에서 빼 주므로 부부가 각자 900만원씩 받을 수 있습니다. 공제율은 각자의 총급여로 정해져 5,500만원 이하인 사람은 16.5%, 초과면 13.2%입니다. 다만 공제율이 높은 쪽이라도 낼 세금이 적으면 공제가 다 쓰이지 않으니, 각자의 결정세액을 먼저 확인하세요.' },
  { q: '퇴직금을 옮긴 IRP나 회사 퇴직연금 부담금도 공제되나요?', a: '아니요. 퇴직금이 IRP로 이체된 돈(과세가 이연된 퇴직소득)과 다른 연금계좌에서 옮겨 온 돈은 공제 대상이 아닙니다(소득세법 제59조의3① 각 호). 회사가 넣는 퇴직연금 부담금도 본인 납입이 아니라 제외되고, 본인이 직접 IRP나 DC형 퇴직연금에 추가로 넣은 돈만 합산 900만원 한도에서 공제됩니다.' },
]

const sources = [
  ['소득세법 제59조의3 (연금계좌세액공제)', 'https://www.law.go.kr/법령/소득세법/제59조의3'],
  ['소득세법 제129조 (원천징수세율)', 'https://www.law.go.kr/법령/소득세법/제129조'],
  ['소득세법 제14조 (과세표준, 사적연금 분리과세)', 'https://www.law.go.kr/법령/소득세법/제14조'],
  ['소득세법 제64조의4 (연금소득 세액 계산 특례)', 'https://www.law.go.kr/법령/소득세법/제64조의4'],
  ['소득세법 시행령 제40조의2 (연금계좌 납입·연금수령 요건)', 'https://www.law.go.kr/법령/소득세법시행령/제40조의2'],
  ['소득세법 시행령 제40조의3 (인출 순서)', 'https://www.law.go.kr/법령/소득세법시행령/제40조의3'],
  ['소득세법 시행령 제118조의2 (ISA 60일 전환)', 'https://www.law.go.kr/법령/소득세법시행령/제118조의2'],
  ['소득세법 시행령 제118조의3 (초과 납입금 전환)', 'https://www.law.go.kr/법령/소득세법시행령/제118조의3'],
  ['소득세법 시행령 제20조의2 (부득이한 인출)', 'https://www.law.go.kr/법령/소득세법시행령/제20조의2'],
  ['근로자퇴직급여 보장법 시행령 제18조 (IRP 중도인출)', 'https://www.law.go.kr/법령/근로자퇴직급여보장법시행령/제18조'],
  ['근로자퇴직급여 보장법 시행규칙 제10조 (위험자산 70%)', 'https://www.law.go.kr/법령/근로자퇴직급여보장법시행규칙/제10조'],
  ['국세청 홈택스 (연말정산 간소화·공제확인서)', 'https://www.hometax.go.kr'],
]

export default function PensionTaxCreditPage() {
  const jsonLd = {
    '@context': 'https://schema.org', '@type': 'WebApplication',
    name: '연금저축·IRP 세액공제 계산기',
    description: '연봉과 연금저축·IRP 납입액으로 연말까지 더 넣을 때 늘어나는 환급액, 남은 한도, ISA 만기 전환 추가공제, 중도해지·연금 수령 시 세금을 계산하는 도구.',
    url: 'https://toolhub.ai.kr/pension-tax-credit/',
    applicationCategory: 'FinanceApplication', operatingSystem: 'Any', browserRequirements: 'JavaScript',
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'KRW' },
    featureList: ['2026년 귀속 연금계좌 세액공제', '연금저축 600만·합산 900만원 남은 한도', '총급여 5,500만원 기준 16.5%·13.2%', '결정세액 한도 반영한 실제 환급액', '추가 납입 슬라이더', 'ISA 만기 전환 추가공제(10%, 최대 300만원)', '중도해지 16.5% vs 연금 수령 3.3~5.5% 비교', '연말정산 계산기로 이어서 계산', '결과 공유 링크·이미지', '12월 31일 마감 캘린더 추가'],
  }

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <div className="min-h-screen py-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <I18nWrapper>
            <PensionTaxCreditCalculator />
            <ToolFaq items={faqs} />
            <div className="mt-8">
              <RelatedTools />
            </div>
          </I18nWrapper>
        </div>
      </div>
      <section className="max-w-4xl mx-auto px-4 pb-12">
        <div className="mt-12 border-t border-line pt-8">
          <h2 className="text-xl font-bold text-fg mb-4">연금저축·IRP 세액공제 계산기란?</h2>
          <p className="text-body leading-relaxed mb-6">
            연금저축·IRP 세액공제 계산기는 연봉(총급여)과 올해 연금저축·IRP 납입액으로 연말정산 때 줄어드는 세금을 계산하고, 12월 31일까지 얼마를 더 넣으면 환급이 얼마나 늘어나는지 보여 주는 도구입니다. 공제율(16.5%·13.2%)만 곱하는 계산과 달리 연봉으로 추정한 올해 세금(결정세액) 안에서만 줄어드는 금액을 계산해, 넣어도 환급이 늘지 않는 금액을 따로 알려 줍니다. ISA 만기 자금을 연금계좌로 옮길 때 늘어나는 한도와, 나중에 연금으로 받거나 중도 해지할 때 낼 세금도 함께 비교할 수 있습니다.
          </p>
          <h3 className="text-lg font-semibold text-fg mb-3">연봉별 예시 (연금저축 600만원 + IRP 300만원, 다른 공제 없음)</h3>
          <ul className="list-disc list-inside space-y-2 text-body">
            <li><strong>연봉 3,500만원:</strong> 공제액은 148만 5천원이지만 올해 세금이 105만 1,420원이라 실제 환급은 105만 1,420원. 약 637만원 넘게 넣은 몫은 효과가 없습니다.</li>
            <li><strong>연봉 5,000만원:</strong> 900만원 × 16.5% = 148만 5천원 전부 환급. 연금저축에 300만원만 넣었다면 남은 600만원을 채울 때 99만원이 늘어납니다.</li>
            <li><strong>연봉 8,000만원:</strong> 900만원 × 13.2% = 118만 8천원. 같은 해 ISA 만기 자금 3,000만원을 연금계좌로 옮기면 한도가 1,200만원이 되어 158만 4천원입니다.</li>
          </ul>
          <h3 className="text-lg font-semibold text-fg mt-8 mb-3">관련 계산기</h3>
          <ul className="list-disc list-inside space-y-2 text-body">
            <li><a href="/year-end-tax/" className="text-primary hover:underline">연말정산 계산기</a> — 카드·의료비·월세 공제와 함께 전체 환급액</li>
            <li><a href="/card-deduction/" className="text-primary hover:underline">신용카드 소득공제 계산기</a> — 10~12월 신용·체크카드 전략</li>
            <li><a href="/medical-tax-credit/" className="text-primary hover:underline">의료비 세액공제 계산기</a> · <a href="/rent-tax-credit/" className="text-primary hover:underline">월세 세액공제 계산기</a></li>
            <li><a href="/pension-calculator/" className="text-primary hover:underline">연금 계산기</a> — 연금 수령액 시뮬레이션</li>
          </ul>
          <h3 className="text-lg font-semibold text-fg mt-8 mb-3">근거 법령·출처 (2026년 10월 기준)</h3>
          <ul className="list-disc list-inside space-y-1.5 text-sm text-sub">
            {sources.map(([label, url]) => (
              <li key={url}><a href={url} className="text-primary hover:underline" target="_blank" rel="noopener noreferrer">{label}</a></li>
            ))}
          </ul>
          <p className="text-sm text-muted mt-6">
            계산은 근로소득만 있고 본인 기본공제와 4대보험만 있는 경우를 가정합니다. 금융회사별 입금 마감 시각은 해마다 공지가 달라 이 페이지에 적지 않았으니 가입한 금융회사에서 확인하세요.
          </p>
        </div>
      </section>
    </>
  )
}
