import { Metadata } from 'next'
import ChildTaxCreditCalculator from '@/components/ChildTaxCreditCalculator'
import I18nWrapper from '@/components/I18nWrapper'
import RelatedTools from '@/components/RelatedTools'
import ToolFaq from '@/components/ToolFaq'
import { analyze, couple, span, kid, minAge, bornBy, EXAMPLES, EXCLUDED_BORN } from '@/utils/childTaxCredit'
import { TAX_YEAR } from '@/utils/yearEndTax'

export const metadata: Metadata = {
  title: '자녀세액공제 계산기 2026 - 대상 나이·금액 | 툴허브',
  description: '아이 출생연도만 넣으면 2026년 귀속 자녀세액공제 대상 여부와 금액, 줄어드는 세금을 계산합니다. 2016년 이전 출생 대상, 1명 25만·2명 55만원, 출산·입양 공제, 맞벌이 누구 앞으로 받을지까지.',
  keywords: '자녀세액공제 계산기, 자녀세액공제, 자녀세액공제 나이, 자녀세액공제 2026, 자녀세액공제 대상, 2017년생 자녀세액공제, 출산세액공제, 입양세액공제, 연말정산 자녀공제, 맞벌이 자녀공제, 손자녀 세액공제, 아동수당 자녀세액공제',
  openGraph: {
    title: '자녀세액공제 계산기 2026 - 대상 나이·금액 | 툴허브',
    description: '출생연도로 올해 대상 여부 → 공제액과 줄어드는 세금, 맞벌이 배분, 2030년까지 연도표.',
    url: 'https://toolhub.ai.kr/child-tax-credit/',
    siteName: '툴허브', locale: 'ko_KR', type: 'website',
    images: [{ url: 'https://toolhub.ai.kr/og/child-tax-credit.png', width: 1200, height: 630, alt: '자녀세액공제 계산기 2026' }],
  },
  twitter: { card: 'summary_large_image', title: '자녀세액공제 계산기 | 툴허브', description: '2026년 자녀세액공제 대상 나이·금액과 줄어드는 세금', images: ['https://toolhub.ai.kr/og/child-tax-credit.png'] },
  alternates: { canonical: 'https://toolhub.ai.kr/child-tax-credit/' },
}

// 본문·FAQ 숫자는 계산기와 같은 함수로 빌드 시 계산 (값은 scripts/check-child-tax-credit.ts가 고정)
const won = (n: number) => `${n.toLocaleString('ko-KR')}원`
const Y = TAX_YEAR
const D = analyze(EXAMPLES.d.salary, EXAMPLES.d.kids, EXAMPLES.d.birth)
const T = analyze(EXAMPLES.three.salary, EXAMPLES.three.kids, 0)
const L = analyze(EXAMPLES.low.salary, EXAMPLES.three.kids, 0)
const B = analyze(EXAMPLES.birth.salary, EXAMPLES.birth.kids, EXAMPLES.birth.birth)
const C = couple(EXAMPLES.c.salary, EXAMPLES.c.spouseSalary, EXAMPLES.c.kids, 0)
const S = couple(EXAMPLES.split.salary, EXAMPLES.split.spouseSalary, EXAMPLES.split.kids, 0)
const K18 = span(kid(2018))
const K20 = span(kid(2020))
const RULES = [Y - 1, Y, Y + 1, Y + 2, Y + 3, Y + 4, Y + 5]

const faqs = [
  { q: `${Y}년 자녀세액공제 대상 나이는 몇 살인가요?`, a: `${Y}년 귀속(${Y + 1}년 초 연말정산)은 ${minAge(Y)}세 이상, 곧 ${bornBy(Y)}년 이전에 태어난 기본공제 대상 자녀·손자녀가 대상입니다. ${EXCLUDED_BORN}년생은 ${Y - EXCLUDED_BORN}세지만 부칙으로 빠집니다(2026년 4월 21일 개정 소득세법 부칙 제2조제3항). ${Y - 1}년 귀속은 ${minAge(Y - 1)}세 이상(${bornBy(Y - 1)}년 이전 출생)이었으니 대상 나이가 올라간 것입니다. 기본공제 대상이어야 하므로 20세 이하(${Y - 20}년 이후 출생)여야 하고, 장애인은 나이 제한이 없습니다.` },
  { q: '자녀세액공제 금액은 얼마인가요?', a: `대상 자녀 1명이면 25만원, 2명이면 55만원, 3명 이상이면 55만원에 2명을 넘는 1명당 40만원을 더합니다(소득세법 제59조의2제1항). 3명이면 95만원입니다. 세금에서 바로 빼는 세액공제라 지방소득세 10%도 함께 줄어, 총급여 6,000만원인 사람이 대상 자녀 3명이면 세금이 ${won(T.saving)} 줄어듭니다. 다만 원래 낼 세금보다 더 줄지는 않아서, 총급여 3,000만원이면 원래 세금 ${won(L.tax)}만큼만 줄고 남은 공제는 이월되지 않습니다.` },
  { q: `${EXCLUDED_BORN}년생은 왜 ${Y}년에 자녀세액공제를 못 받나요?`, a: `2026년 4월 21일 개정 소득세법은 대상 나이를 8세 이상에서 13세 이상으로 바꾸고, 부칙으로 2026년 9세·2027년 10세·2028년 11세·2029년 12세 이상을 적용하되 ${EXCLUDED_BORN}년생에게는 이 경과 규정을 적용하지 않도록 했습니다(부칙 제2조). 그래서 ${EXCLUDED_BORN}년생은 2025년 귀속엔 받았지만 2026~2029년 귀속은 빠지고, 13세가 되는 ${span(kid(EXCLUDED_BORN)).from}년 귀속부터 다시 받습니다. 아동수당 대상이 2026년 만 9세 미만으로 넓어지고 2030년까지 해마다 1세씩 올라가는 것과 함께 바뀐 것입니다.` },
  { q: '2030년부터는 어떻게 바뀌나요?', a: `2030년 귀속부터는 본칙대로 13세 이상(${bornBy(2030)}년 이전 출생)이 대상입니다. 그 뒤로는 그해 13세가 되는 자녀부터 받으므로 2018년생은 ${K18.from}년 귀속부터, 2020년생은 ${K20.from}년 귀속부터 받습니다. 20세가 넘는 해(2018년생이면 ${K18.to! + 1}년 귀속)부터는 기본공제와 함께 빠집니다.` },
  { q: '올해 아이를 낳으면 얼마를 공제받나요?', a: `그해 출산하거나 입양 신고한 자녀가 첫째면 30만원, 둘째면 50만원, 셋째 이상이면 70만원을 공제합니다(소득세법 제59조의2제3항). 출산·입양 공제는 그해에 한 번만 받고, 아이가 대상 나이가 되면 그때부터 자녀세액공제를 받습니다. 총급여 5,000만원이고 2016년생 첫째가 있는데 올해 둘째를 낳았다면 자녀세액공제 25만원 + 출산 공제 50만원 = ${won(B.credit)}이 공제되어 세금이 ${won(B.saving)} 줄어듭니다. 손자녀에게는 출산·입양 공제가 없습니다.` },
  { q: '맞벌이 부부는 자녀를 누구 앞으로 올려야 하나요?', a: `한 자녀는 한 사람만 공제받고, 기본공제 150만원과 자녀세액공제가 같은 사람에게 갑니다. 보통 세율이 높은 쪽이 유리합니다. 총급여 4,000만원(세율 15% 구간)과 8,000만원(24% 구간) 부부가 대상 자녀 2명을 모두 8,000만원 쪽으로 올리면 기본공제 300만원 × (24% − 15%)에 지방소득세를 더해 ${won(C.gain)}을 덜 냅니다. 반대로 둘 다 3,000만원이면 55만원을 한 사람에게 몰아도 그 사람 세금이 모자라, 1명씩 나눠(25만원 + 25만원) 받는 쪽이 두 사람 세금 합이 ${won(S.gain)} 적습니다.` },
  { q: '손자녀나 위탁아동도 받을 수 있나요?', a: '네. 자녀세액공제 대상은 기본공제를 받는 자녀(입양자·위탁아동 포함)와 손자녀입니다(소득세법 제59조의2제1항). 다만 손자녀는 그 부모 등 다른 가족이 이미 기본공제를 받으면 중복으로 받을 수 없고(제50조제3항), 위탁아동은 시행령이 정한 요건을 갖춰야 합니다. 출산·입양 공제는 자녀에게만 있고 손자녀에게는 없습니다. 기본공제 대상인지 헷갈리면 부양가족 공제 판정에서 소득·나이 요건을 함께 확인하세요.' },
  { q: '아동수당을 받는 아이도 자녀세액공제를 받나요?', a: `두 제도는 따로 받지만 대상 나이가 함께 올라갑니다. 아동수당은 2026년 만 9세 미만에서 2030년까지 해마다 1세씩 넓어지고, 자녀세액공제는 ${Y}년 ${bornBy(Y)}년 이전 출생에서 2030년 13세 이상으로 올라가므로, 대체로 아동수당이 끝날 무렵부터 자녀세액공제를 받게 됩니다. 아이 나이별 아동수당·부모급여는 부모급여·아동수당 계산기에서 확인할 수 있습니다.` },
  { q: '자녀가 20세가 넘었거나 소득이 있으면요?', a: `자녀세액공제는 기본공제 대상 자녀만 받으므로 20세가 넘는 해(${Y}년 귀속이면 ${Y - 21}년 이전 출생)부터는 받을 수 없습니다. 장애인 자녀는 나이 제한이 없어 계속 받습니다(소득세법 제50조제1항제3호). 또 자녀의 연간 소득금액이 100만원(근로소득만 있으면 총급여 500만원)을 넘으면 기본공제에서 빠져 자녀세액공제도 받지 못합니다.` },
]

const sources = [
  { label: '소득세법 제59조의2 (자녀세액공제 — 대상·금액·출산입양)', url: 'https://www.law.go.kr/법령/소득세법/제59조의2' },
  { label: '소득세법 부칙 (법률 제21548호, 2026.4.21.) 제2조 — 2026~2029년 대상 나이, 2017년생 제외', url: 'https://www.law.go.kr/법령/소득세법/(21548,20260421)' },
  { label: '소득세법 제50조 (기본공제 — 직계비속 20세 이하, 장애인 나이 제한 없음)', url: 'https://www.law.go.kr/법령/소득세법/제50조' },
  { label: '소득세법 제53조 (나이 판정 — 과세기간 중 하루라도 해당하면 인정)', url: 'https://www.law.go.kr/법령/소득세법/제53조' },
  { label: '복지로 — 아동수당 지급 대상 연령 확대', url: 'https://www.bokjiro.go.kr/ssis-tbu/cms/pc/news/news/1309692_1114.html' },
]

export default function ChildTaxCreditPage() {
  const jsonLd = {
    '@context': 'https://schema.org', '@type': 'WebApplication',
    name: '자녀세액공제 계산기',
    description: '자녀 출생연도로 올해 자녀세액공제 대상 여부와 공제액, 출산·입양 공제, 실제로 줄어드는 세금, 맞벌이 배분을 계산하는 도구.',
    url: 'https://toolhub.ai.kr/child-tax-credit/',
    applicationCategory: 'FinanceApplication', operatingSystem: 'Any', browserRequirements: 'JavaScript',
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'KRW' },
    featureList: [`${Y}년 귀속 자녀세액공제 대상 판정(${bornBy(Y)}년 이전 출생, ${EXCLUDED_BORN}년생 제외)`, '자녀별 대상·제외 이유', '1명 25만·2명 55만·3명부터 40만 추가', '출산·입양 공제 30·50·70만', '줄어드는 세금(지방소득세·결정세액 한도 반영)', '맞벌이 누구 앞으로 받을지 비교', '자녀별 연도표(2030년 13세 기준까지)', '연말정산 계산기로 이어서 계산', '결과 공유 링크·이미지'],
  }

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <div className="min-h-screen py-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <I18nWrapper>
            <ChildTaxCreditCalculator />
            <ToolFaq items={faqs} />
            <div className="mt-8">
              <RelatedTools />
            </div>
          </I18nWrapper>
        </div>
      </div>
      <section className="max-w-4xl mx-auto px-4 pb-12">
        <div className="mt-12 border-t border-line pt-8">
          <h2 className="text-xl font-bold text-fg mb-4">자녀세액공제 계산기란?</h2>
          <p className="text-body leading-relaxed mb-6">
            자녀세액공제 계산기는 아이의 출생연도로 올해 연말정산에서 자녀세액공제를 받는지, 받으면 세금이 얼마나 줄어드는지 계산하는 도구입니다. 2026년 4월 개정 소득세법으로 대상 나이가 8세 이상에서 단계적으로 13세 이상으로 올라가고, 2017년생은 2026~2029년 귀속에서 빠지는 등 해마다 기준이 달라져 헷갈리기 쉽습니다. 이 계산기는 자녀마다 대상 여부와 이유, 몇 년 귀속부터 언제까지 받는지를 보여 주고, 결정세액 한도와 지방소득세까지 반영해 &lsquo;실제로 줄어드는 세금&rsquo;과 맞벌이 부부의 유리한 배분을 계산합니다.
          </p>

          <h3 className="text-lg font-semibold text-fg mb-3">귀속연도별 대상 출생연도</h3>
          <ul className="list-disc list-inside space-y-2 text-body mb-6">
            {RULES.map((y) => (
              <li key={y}>
                <strong>{y}년 귀속:</strong> {minAge(y)}세 이상 → {bornBy(y)}년 이전 출생{y >= 2026 && minAge(y) < 13 ? ` (${EXCLUDED_BORN}년생 제외)` : ''}, 기본공제는 {y - 20}년 이후 출생(장애인은 나이 무관)
              </li>
            ))}
          </ul>

          <h3 className="text-lg font-semibold text-fg mb-3">예시 ({Y}년 귀속, 다른 공제가 없다고 가정)</h3>
          <ul className="list-disc list-inside space-y-3 text-body mb-6">
            <li>
              <strong>총급여 5,000만원, 2014·2018년생 자녀:</strong> 2014년생만 대상 → 공제 {won(D.credit)}, 세금 {won(D.saving)} 감소 (지방소득세 포함). 2018년생은 {D.rows[1].from}년 귀속부터
            </li>
            <li>
              <strong>총급여 6,000만원, 대상 자녀 3명:</strong> 25만 + 30만 + 40만 = 공제 {won(T.credit)}, 세금 {won(T.saving)} 감소
            </li>
            <li>
              <strong>총급여 5,000만원, 2016년생 첫째 + 올해 둘째 출산:</strong> 자녀세액공제 {won(B.child)} + 출산 공제 {won(B.born)} = {won(B.credit)}, 세금 {won(B.saving)} 감소
            </li>
            <li>
              <strong>맞벌이 3,000만원 + 3,000만원, 대상 자녀 2명:</strong> 한 사람에게 몰지 않고 1명씩 나누면 두 사람 세금 합이 {won(S.gain)} 적음
            </li>
          </ul>

          <p className="text-sm text-muted mb-6">
            전체 환급액은 <a href="/year-end-tax/" className="text-primary hover:underline">연말정산 계산기</a>, 자녀 소득·부모님 연금까지 기본공제 대상인지는 <a href="/dependent-deduction/" className="text-primary hover:underline">부양가족 공제 판정</a>, 아동수당·부모급여는 <a href="/child-benefit/" className="text-primary hover:underline">부모급여·아동수당 계산기</a>, 자녀 교육비는 <a href="/education-tax-credit/" className="text-primary hover:underline">교육비 세액공제 계산기</a>에서 확인할 수 있습니다.
          </p>

          <h3 className="text-lg font-semibold text-fg mb-3">근거 법령·출처</h3>
          <ul className="space-y-1.5 text-sm text-sub">
            {sources.map((s) => (
              <li key={s.url}>
                <a href={s.url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">{s.label}</a>
              </li>
            ))}
          </ul>
          <p className="text-xs text-muted mt-3">2026년 11월 현재 시행 중인 법령 기준입니다. 국회 심의 중인 세법 개정안은 반영하지 않았습니다.</p>
        </div>
      </section>
    </>
  )
}
