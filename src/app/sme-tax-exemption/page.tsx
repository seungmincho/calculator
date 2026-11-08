import { Metadata } from 'next'
import SmeTaxExemptionCalculator from '@/components/SmeTaxExemptionCalculator'
import I18nWrapper from '@/components/I18nWrapper'
import RelatedTools from '@/components/RelatedTools'
import ToolFaq from '@/components/ToolFaq'
import { analyze, EXAMPLES } from '@/utils/smeTaxExemption'
import { TAX_YEAR } from '@/utils/yearEndTax'

export const metadata: Metadata = {
  title: '중소기업 소득세 감면 계산기 - 청년 90% 기간 | 툴허브',
  description: '중소기업 취업자 소득세 감면(중기청 감면) 대상인지, 언제 끝나는지, 올해 세금이 얼마나 줄어드는지 계산합니다. 청년 90%·5년, 60세 이상·장애인·경력단절 70%·3년, 연 200만원 한도, 병역 기간 나이 차감, 이직 시 최초 취업일 기준까지.',
  keywords: '중소기업 취업자 소득세 감면, 중기청 감면, 중소기업 청년 소득세 감면, 중소기업 소득세 감면 계산기, 청년 소득세 90% 감면, 중소기업 감면 기간, 중소기업 감면 이직, 중소기업 감면 병역, 중소기업 취업자 감면 신청서, 조세특례제한법 30조',
  openGraph: {
    title: '중소기업 소득세 감면 계산기 - 청년 90% 기간 | 툴허브',
    description: '감면 대상 여부, 끝나는 날, 올해 줄어드는 세금과 남은 기간 합계.',
    url: 'https://toolhub.ai.kr/sme-tax-exemption/',
    siteName: '툴허브', locale: 'ko_KR', type: 'website',
    images: [{ url: 'https://toolhub.ai.kr/og/sme-tax-exemption.png', width: 1200, height: 630, alt: '중소기업 소득세 감면 계산기' }],
  },
  twitter: { card: 'summary_large_image', title: '중소기업 소득세 감면 계산기 | 툴허브', description: '청년 90%·5년, 연 200만원 — 대상 여부·종료일·줄어드는 세금', images: ['https://toolhub.ai.kr/og/sme-tax-exemption.png'] },
  alternates: { canonical: 'https://toolhub.ai.kr/sme-tax-exemption/' },
}

// 본문·FAQ 숫자는 계산기와 같은 함수로 빌드 시 계산 (값은 scripts/check-sme-tax-exemption.ts가 고정)
const won = (n: number) => `${n.toLocaleString('ko-KR')}원`
const day = (s: string) => `${Number(s.slice(0, 4))}년 ${Number(s.slice(5, 7))}월 ${Number(s.slice(8, 10))}일`
const D = analyze(EXAMPLES.d)
const A = analyze(EXAMPLES.army)
const S = analyze(EXAMPLES.senior)
const H = analyze(EXAMPLES.high)
const D30 = D.rows.at(-1)!

const faqs = [
  { q: '중소기업 취업자 소득세 감면은 누가, 얼마나 받나요?', a: `중소기업에 2026년 12월 31일까지 취업한 청년(근로계약일 현재 만 15~34세)은 취업일부터 5년 동안 근로소득세의 90%를, 60세 이상·장애인·경력단절 근로자는 3년 동안 70%를 감면받습니다. 감면액은 한 해 200만원까지입니다(조세특례제한법 제30조). 예를 들어 2025년 3월 2일에 취업한 1999년생 청년이 연봉 3,600만원을 받으면 ${day(D.end.date)}까지 감면되고, ${TAX_YEAR}년 감면세액은 ${won(D.reduction)}, 실제로 줄어드는 세금은 지방소득세를 포함해 ${won(D.saving)}입니다. ${TAX_YEAR}년부터 끝날 때까지 합계는 ${won(D.remaining)}입니다.` },
  { q: '군대를 다녀오면 청년 나이가 늘어나나요?', a: `네. 현역병(상근예비역·의무경찰·의무소방원 포함), 사회복무요원, 현역 장교·준사관·부사관으로 복무한 기간을 6년까지 근로계약일 현재 나이에서 뺀 나이가 만 34세 이하면 청년입니다(조세특례제한법 시행령 제27조제1항제1호). 예를 들어 1990년 1월 10일생이 2025년 3월 4일에 근로계약을 맺으면 만 ${A.age}세지만 현역 21개월을 빼면 만 ${A.adjAge}세라 청년 감면을 받습니다. 병역이 없다면 ${day(A.untilNoMil)}까지, 21개월을 빼면 ${day(A.until)}까지 근로계약을 맺어야 청년으로 인정됩니다.` },
  { q: '감면 기간은 정확히 언제 끝나나요?', a: `취업일부터 5년(청년 외 3년)이 되는 날이 속하는 달까지 받은 급여가 감면 대상입니다. 2025년 3월 2일에 취업했다면 5년이 되는 날은 2030년 3월 1일이고, 그 달인 ${day(D.end.date)}까지 받은 급여에 감면이 적용됩니다. 마지막 해에는 그해 총급여 중 감면 기간 급여의 비율만큼만 감면되어, 이 예에서 2030년에는 12개월 중 ${D30.months}개월분인 ${won(D30.reduction)}이 감면됩니다(조세특례제한법 시행령 제27조제8항).` },
  { q: '이직하면 감면 기간이 다시 5년으로 시작하나요?', a: '아닙니다. 다른 중소기업으로 옮기거나 같은 회사에 재취업하거나 합병·분할로 고용이 승계되어도, 감면 기간은 소득세를 감면받은 최초 취업일부터 계산합니다(조세특례제한법 제30조제1항 후단). 옮긴 회사도 대상 중소기업이면 새 회사에 감면신청서를 다시 내고 남은 기간 동안 감면받습니다. 대기업·공공기관처럼 대상이 아닌 회사에 다니는 동안에도 기간은 흘러갑니다.' },
  { q: '연봉이 높으면 얼마까지 감면되나요?', a: `감면세액은 한 해 200만원이 한도입니다. 연봉 6,000만원인 청년은 산출세액의 90%가 200만원을 넘어 ${won(H.reduction)}만 감면되고, 감면을 받으면 근로소득세액공제도 감면 비율만큼 줄어들어(시행령 제27조제9항) 실제로 줄어드는 세금은 지방소득세를 포함해 ${won(H.saving)}입니다.` },
  { q: '60세 이상·장애인·경력단절 근로자는 어떻게 다른가요?', a: `감면율 70%, 감면 기간 3년이고 한도는 똑같이 연 200만원입니다. 60세 이상과 장애인은 2014년 1월 1일 이후 취업한 경우부터 대상입니다. 예를 들어 1965년생이 2026년 3월 3일 중소기업에 재취업해 연봉 3,000만원을 받으면 ${day(S.end.date)}까지 감면되고, 한 해를 꼬박 일하는 2027년에는 세금이 ${won(S.rows.find((r) => r.year === 2027)!.saving)} 줄어듭니다. 경력단절 근로자는 1년 이상 일한 회사를 결혼·임신·출산·육아·자녀교육·가족돌봄으로 그만두고 2년 이상 15년 미만이 지나 재취업한 사람입니다(조세특례제한법 제29조의8제2항).` },
  { q: '어떻게 신청하나요? 기한을 놓치면요?', a: '회사(원천징수의무자)에 중소기업 취업자 소득세 감면 신청서를 내면 됩니다. 기한은 취업일이 속하는 달의 다음 달 말일이고, 청년은 병역 기간을 증명하는 서류를 함께 냅니다(조세특례제한법 시행령 제27조제5항). 회사는 신청서를 받은 달의 다음 달 월급부터 감면율을 반영해 원천징수할 수 있고, 다음 달 10일까지 명단을 세무서에 냅니다. 신청을 놓쳐 감면받지 못한 해는 5년 안에 홈택스 경정청구로 돌려받을 수 있고, 퇴직했다면 주소지 관할 세무서에 직접 신청합니다.' },
  { q: '어떤 회사에 다니면 감면을 받을 수 없나요?', a: '중소기업기본법상 중소기업이면서 제조업, 건설업, 도소매업, 정보통신업, 음식점업 등 시행령 제27조제3항에 열거된 업종을 주된 사업으로 해야 합니다. 금융·보험업, 병원·의원 같은 보건업, 법무·회계·세무 서비스업, 입시·보습 학원, 주점·카페, 부동산 임대업, 수의업 등은 목록에 없거나 빠져 있어 대상이 아닙니다. 국가·지방자치단체·공공기관·지방공기업은 업종과 관계없이 제외되므로 공무원과 공기업 직원은 받을 수 없습니다.' },
  { q: '계약직이나 임원, 사장 가족도 받을 수 있나요?', a: '계약직·기간제 근로자는 제외 대상이 아니어서 다른 요건을 갖추면 받을 수 있습니다. 제외되는 사람은 임원, 회사의 최대주주·최대출자자(개인사업자는 대표자)와 그 배우자, 그 직계존비속과 친족, 일용근로자, 그리고 국민연금·건강보험 직장가입자 보험료 납부 사실이 확인되지 않는 사람입니다(조세특례제한법 시행령 제27조제2항).' },
  { q: '휴직하거나 군대에 가면 감면 기간이 멈추나요?', a: '감면 기간은 취업일부터 달력 기준으로 세므로 육아휴직 등으로 쉬어도 멈추지 않습니다. 다만 청년이 병역을 마친 뒤 1년 안에 병역 전에 다니던 중소기업에 복직하면 복직한 날부터 2년이 되는 날(복직일이 최초 취업일부터 5년이 지나지 않았다면 최초 취업일부터 7년이 되는 날)이 속하는 달까지 감면받습니다(조세특례제한법 제30조제1항). 이 복직 특례는 계산기에 넣지 않았습니다.' },
  { q: '2027년에 취업하면 받을 수 없나요?', a: '현재 법은 2026년 12월 31일까지 취업한 사람만 대상입니다. 2026년 8월 정부 세제개편안과 국회의원 발의안에 적용 기한을 늘리고 비수도권 취업자의 감면 기간·감면율을 높이는 내용이 있지만 국회를 통과해야 확정됩니다. 이 계산기는 현행법으로 계산하며, 개정되면 반영합니다.' },
]

const sources = [
  { label: '조세특례제한법 제30조 (중소기업 취업자에 대한 소득세 감면 — 대상·감면율·기간·200만원 한도·적용 기한)', url: 'https://www.law.go.kr/법령/조세특례제한법/제30조' },
  { label: '조세특례제한법 시행령 제27조 (청년 나이·병역 차감, 제외 대상, 대상 업종, 신청 절차, 감면세액 계산식)', url: 'https://www.law.go.kr/법령/조세특례제한법시행령/제27조' },
  { label: '조세특례제한법 제29조의8 (경력단절 근로자의 범위)', url: 'https://www.law.go.kr/법령/조세특례제한법/제29조의8' },
]

export default function SmeTaxExemptionPage() {
  const jsonLd = {
    '@context': 'https://schema.org', '@type': 'WebApplication',
    name: '중소기업 취업자 소득세 감면 계산기',
    description: '취업일·생년월일·병역 기간·연봉으로 중소기업 취업자 소득세 감면 대상 여부, 감면 종료일, 올해 줄어드는 세금과 남은 기간 합계를 계산하는 도구.',
    url: 'https://toolhub.ai.kr/sme-tax-exemption/',
    applicationCategory: 'FinanceApplication', operatingSystem: 'Any', browserRequirements: 'JavaScript',
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'KRW' },
    featureList: ['청년 90%·5년, 60세 이상·장애인·경력단절 70%·3년', '병역 기간(최대 6년) 나이 차감', '감면 종료일(기간이 되는 날이 속하는 달 말일)', `${TAX_YEAR}년 감면세액과 줄어드는 세금(지방소득세·근로소득세액공제 축소 반영)`, '연 200만원 한도·연중 종료 비율', '이직 시 최초 취업일 기준 기간', '연도별 감면표와 남은 기간 합계', '연말정산 계산기로 이어서 계산', '결과 공유 링크·이미지'],
  }

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <div className="min-h-screen py-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <I18nWrapper>
            <SmeTaxExemptionCalculator />
            <ToolFaq items={faqs} />
            <div className="mt-8">
              <RelatedTools />
            </div>
          </I18nWrapper>
        </div>
      </div>
      <section className="max-w-4xl mx-auto px-4 pb-12">
        <div className="mt-12 border-t border-line pt-8">
          <h2 className="text-xl font-bold text-fg mb-4">중소기업 취업자 소득세 감면 계산기란?</h2>
          <p className="text-body leading-relaxed mb-6">
            중소기업 취업자 소득세 감면(흔히 &lsquo;중기청 감면&rsquo;)은 청년·60세 이상·장애인·경력단절 근로자가 중소기업에 취업하면 일정 기간 근로소득세를 줄여 주는 제도입니다. 이 계산기는 취업일·생년월일·병역 기간으로 대상인지 판정하고, 감면이 끝나는 날과 {TAX_YEAR}년에 실제로 줄어드는 세금, 끝날 때까지의 합계를 보여 줍니다. 감면을 받으면 근로소득세액공제도 감면 비율만큼 줄어들기 때문에, 감면세액이 그대로 세금에서 빠지지 않는다는 점까지 반영했습니다.
          </p>

          <h3 className="text-lg font-semibold text-fg mb-3">예시 ({TAX_YEAR}년 귀속, 다른 공제가 없다고 가정)</h3>
          <ul className="list-disc list-inside space-y-3 text-body mb-6">
            <li>
              <strong>2025년 3월 2일 취업, 1999년생 청년, 연봉 3,600만원:</strong> {day(D.end.date)}까지 90% 감면. {TAX_YEAR}년 감면세액 {won(D.reduction)}, 세금 {won(D.saving)} 감소. {TAX_YEAR}년부터 끝날 때까지 합계 {won(D.remaining)}, 첫해(2025년) 몫 {won(D.past)}은 놓쳤다면 경정청구
            </li>
            <li>
              <strong>1990년 1월 10일생, 2025년 3월 4일 근로계약, 현역 21개월:</strong> 만 {A.age}세지만 병역을 빼면 만 {A.adjAge}세라 청년
            </li>
            <li>
              <strong>60세 이상, 2026년 3월 3일 재취업, 연봉 3,000만원:</strong> 70%·3년, {day(S.end.date)}까지. {TAX_YEAR}년 세금 {won(S.saving)} 감소
            </li>
            <li>
              <strong>청년, 연봉 6,000만원:</strong> 감면세액이 한도 {won(H.reduction)}에 걸려 세금 {won(H.saving)} 감소
            </li>
          </ul>

          <p className="text-sm text-muted mb-6">
            전체 환급액은 <a href="/year-end-tax/" className="text-primary hover:underline">연말정산 계산기</a>, 매달 받는 돈은 <a href="/salary-calculator/" className="text-primary hover:underline">연봉 실수령액 계산기</a>에서 계산할 수 있습니다.
          </p>

          <h3 className="text-lg font-semibold text-fg mb-3">근거 법령·출처</h3>
          <ul className="space-y-1.5 text-sm text-sub">
            {sources.map((s) => (
              <li key={s.url}>
                <a href={s.url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">{s.label}</a>
              </li>
            ))}
          </ul>
          <p className="text-xs text-muted mt-3">기준: 2026년 11월 8일 확인한 현행 조세특례제한법과 시행령(2026년 9월 18일 시행). 국회 심의 중인 세법 개정안은 반영하지 않았습니다.</p>
        </div>
      </section>
    </>
  )
}
