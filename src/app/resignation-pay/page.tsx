import { Metadata } from 'next'
import ResignationPayCalculator from '@/components/ResignationPayCalculator'
import I18nWrapper from '@/components/I18nWrapper'
import RelatedTools from '@/components/RelatedTools'
import ToolFaq from '@/components/ToolFaq'
import { compute, simulate, EXAMPLES } from '@/utils/resignationPay'

export const metadata: Metadata = {
  title: '퇴사하면 받는 돈 계산기 - 퇴직금·실업급여 | 툴허브',
  description: '입사일과 마지막 근무일, 월급만 넣으면 퇴직금(세후)·미사용 연차수당·실업급여·중도퇴사 연말정산까지 퇴사 때 받는 돈 합계를 계산합니다. 퇴사일을 바꿔 보면 1년·연차 발생일에 따라 달라지는 금액과 퇴사 후 할 일(14일 안 정산, 실업급여 신청, 건강보험, IRP, 5월 종합소득세)도 보여 줍니다.',
  keywords: '퇴사하면 받는 돈, 퇴사 정산, 퇴사 시 받는 돈, 퇴직금 실업급여, 권고사직 실업급여, 퇴직금 계산, 연차수당 퇴사, 중도퇴사 연말정산, 퇴사일 정하기, 퇴사 후 할 일, 실업급여 계산, 퇴사 체크리스트',
  openGraph: {
    title: '퇴사하면 받는 돈 계산기 - 퇴직금·실업급여 | 툴허브',
    description: '퇴사일만 정하면 퇴직금·연차수당·실업급여·연말정산 합계와 퇴사 후 할 일.',
    url: 'https://toolhub.ai.kr/resignation-pay/',
    siteName: '툴허브', locale: 'ko_KR', type: 'website',
    images: [{ url: 'https://toolhub.ai.kr/og/resignation-pay.png', width: 1200, height: 630, alt: '퇴사하면 받는 돈 계산기' }],
  },
  twitter: { card: 'summary_large_image', title: '퇴사하면 받는 돈 계산기 | 툴허브', description: '퇴직금·연차수당·실업급여·중도퇴사 연말정산을 한 번에', images: ['https://toolhub.ai.kr/og/resignation-pay.png'] },
  alternates: { canonical: 'https://toolhub.ai.kr/resignation-pay/' },
}

// 본문·FAQ 숫자는 계산기와 같은 함수로 빌드 시 계산 (값은 scripts/check-resignation-pay.ts가 고정)
const won = (n: number) => `${Math.round(n).toLocaleString('ko-KR')}원`
const D = compute(EXAMPLES.d)!
const S = compute(EXAMPLES.short)!
const V = compute(EXAMPLES.voluntary)!
const DS = simulate(EXAMPLES.d, D)
const NL = DS.find((s) => s.key === 'nextLeave')!
const NM = DS.find((s) => s.key === 'nextMonth')!
const SY = simulate(EXAMPLES.short, S).find((s) => s.key === 'oneYear')!
const dot = (d: string) => d.replaceAll('-', '.')

const faqs = [
  { q: '퇴사하면 받는 돈에는 무엇이 있나요?', a: `회사에서 받는 돈은 마지막 월급, 퇴직금(1년 이상 근무), 쓰지 못한 연차수당, 중도퇴사 연말정산 환급(또는 추가 납부)이고, 비자발적으로 그만두면 고용센터에서 실업급여를 받습니다. 예를 들어 2023년 3월 2일에 입사해 2026년 12월 31일까지 월 350만원을 받고 일하다 권고사직으로 나가고 연차가 5일 남았다면 퇴직금 세후 ${won(D.sev.net)}, 연차수당 ${won(D.leavePay)}, 연말정산 ${D.tax.refund >= 0 ? `환급 ${won(D.tax.refund)}` : `추가 납부 ${won(-D.tax.refund)}`}, 실업급여 ${won(D.ue.total)}(1일 ${won(D.ue.daily)} × ${D.ue.days}일)으로 모두 ${won(D.total)}입니다.` },
  { q: '퇴직금과 연차수당은 언제까지 받아야 하나요?', a: `퇴직일(마지막 근무일 다음 날)부터 14일 안에 임금·퇴직금 등 모든 금품을 받아야 합니다(근로기준법 제36조, 근로자퇴직급여 보장법 제9조). 특별한 사정이 있을 때 당사자가 합의하면 미룰 수 있습니다. 2026년 12월 31일이 마지막 근무일이면 ${dot(D.payBy)}까지입니다. 기한이 지나도 주지 않으면 고용노동부(국번 없이 1350)나 관할 노동청에 임금체불 진정을 낼 수 있습니다.` },
  { q: '1년 미만 일하고 퇴사하면 퇴직금이 없나요?', a: `계속근로기간이 1년이 안 되면 퇴직금 지급 의무가 없습니다(근로자퇴직급여 보장법 제4조). 2026년 3월 2일에 입사해 12월 31일에 나가면 퇴직금은 0원이지만, ${dot(SY.last)}까지 일하면 1년을 채워 퇴직금 세후 ${won(SY.sev)}이 생깁니다. 연차수당과 실업급여(고용보험 가입 일수 180일 이상)는 1년 미만이어도 받을 수 있습니다.` },
  { q: '자발적으로 퇴사해도 실업급여를 받을 수 있나요?', a: `원칙적으로는 받을 수 없습니다(고용보험법 제58조). 다만 이직 전 1년 안에 2개월 이상 임금체불, 직장 내 괴롭힘, 사업장 이전 등으로 통근 왕복 3시간 이상, 질병인데 휴직을 거부당함, 임신·육아 휴직 거부처럼 고용노동부령이 정한 정당한 사유가 있으면 받을 수 있습니다. 기본 예시 조건에서 자발적 퇴사로 바꾸면 받는 돈이 ${won(V.total)}로 실업급여 ${won(D.ue.total)}만큼 줄어듭니다.` },
  { q: '실업급여는 얼마나, 며칠 동안 받나요?', a: `1일 구직급여는 퇴직 전 3개월 평균임금의 60%인데, 2026년 이직자는 하루 상한 68,100원, 하한 66,048원(최저임금 10,320원 × 80% × 8시간)입니다. 받는 일수는 나이와 고용보험 가입 기간에 따라 120~270일입니다(고용보험법 별표 1). 월 350만원이면 60%가 상한을 넘어 하루 ${won(D.ue.daily)}이고, 50세 미만·가입 3~5년이면 ${D.ue.days}일, 모두 ${won(D.ue.total)}입니다. 2027년에 이직하면 최저임금이 올라 하한이 상한보다 높아져 하루 ${won(NM.ueDaily)}을 받습니다.` },
  { q: '퇴사일을 며칠 바꾸면 받는 돈이 달라지나요?', a: `달라질 수 있습니다. 연차는 입사일 기준이면 매년 입사일과 같은 날 새로 생기는데 그날 재직 중이어야 합니다(1년 근로를 마친 다음 날 근로관계가 있어야 발생). 2023년 3월 2일 입사자가 2026년 12월 31일에 나가면 새 연차가 생기지 않지만, ${dot(NL.last)}까지 일하면 ${NL.added}일이 더 생겨 연차수당이 ${won(D.leavePay)}에서 ${won(NL.leavePay)}로 늘어납니다(새 연차를 쓰지 않는다고 볼 때). 1년 미만이면 1년을 채우는 날이 퇴직금 기준입니다. 계산기의 '퇴사일 바꿔 보기' 표에서 비교할 수 있습니다.` },
  { q: '중도퇴사하면 연말정산은 어떻게 하나요?', a: `회사가 마지막 급여 때 그해 받은 급여로 연말정산을 합니다. 이때는 보통 기본공제와 표준세액공제 정도만 들어가 카드·의료비·연금저축 공제가 빠지므로, 매달 뗀 세금(간이세액표)보다 결정세액이 많아 추가로 내는 경우도 있습니다. 기본 예시는 총급여 ${won(D.tax.salary)}, 이미 낸 소득세 약 ${won(D.tax.prepaid)}, 결정세액 ${won(D.tax.determined)}으로 지방소득세까지 ${D.tax.refund >= 0 ? `${won(D.tax.refund)} 환급` : `${won(-D.tax.refund)} 추가 납부`}입니다. 그해 다시 취업하지 않았다면 다음 해 5월 종합소득세 신고로 빠진 공제를 받을 수 있고, 재취업했다면 새 회사 연말정산에 합산합니다.` },
  { q: '퇴직금에서 세금은 얼마나 떼나요?', a: `퇴직금에는 근로소득과 따로 퇴직소득세가 붙습니다. 근속연수공제와 환산급여공제를 빼고 계산해 세율이 낮은 편입니다(소득세법 제48조·제55조). 기본 예시의 퇴직금 ${won(D.sev.pay)}에는 지방소득세를 합쳐 ${won(D.sev.totalTax)}이 붙어 ${won(D.sev.net)}을 받습니다. IRP 계좌로 옮겨 연금으로 받으면 실수령 10년차까지 세금이 30% 줄어 ${won(D.sev.irp70)}가 됩니다.` },
  { q: '퇴사하면 건강보험은 어떻게 되나요?', a: '퇴사 다음 날 지역가입자로 바뀌어 재산·소득으로 보험료가 다시 매겨집니다. 직장가입자 자격을 통산 1년 이상 유지했다면 지역가입자가 된 뒤 처음 받은 지역보험료의 납부기한부터 2개월이 지나기 전까지 임의계속가입을 신청해, 퇴사 다음 날부터 최대 36개월 동안 직장 때와 비슷한 보험료를 낼 수 있습니다(국민건강보험법 제110조, 시행령 제77조). 가족의 피부양자로 들어갈 수 있는지도 함께 확인하세요.' },
  { q: '실업급여는 언제까지 신청해야 하나요?', a: `실업급여는 이직 다음 날부터 12개월 안에 소정급여일수만큼 받을 수 있고, 이 기간이 지나면 남은 일수는 받지 못합니다(고용보험법 제48조). 2026년 12월 31일에 그만두면 ${dot(D.ue.applyUntil)}까지라서, 늦게 신청할수록 다 받지 못할 수 있습니다. 회사가 이직확인서를 냈는지 확인하고 고용24에서 구직 등록과 수급자격 신청을 하세요.` },
]

const sources = [
  { label: '근로기준법 제36조 (퇴직 후 14일 안 금품 청산)', url: 'https://www.law.go.kr/법령/근로기준법/제36조' },
  { label: '근로기준법 제60조·제61조 (연차 유급휴가, 사용 촉진)', url: 'https://www.law.go.kr/법령/근로기준법/제60조' },
  { label: '근로자퇴직급여 보장법 제8조 (퇴직금 = 30일분 평균임금 × 근속연수)', url: 'https://www.law.go.kr/법령/근로자퇴직급여보장법/제8조' },
  { label: '근로자퇴직급여 보장법 제9조 (14일 안 지급, IRP 이전)', url: 'https://www.law.go.kr/법령/근로자퇴직급여보장법/제9조' },
  { label: '고용보험법 제40조 (구직급여 수급 요건 — 피보험 단위기간 180일)', url: 'https://www.law.go.kr/법령/고용보험법/제40조' },
  { label: '고용보험법 제45조·제46조 (기초일액, 구직급여일액 상·하한)', url: 'https://www.law.go.kr/법령/고용보험법/제46조' },
  { label: '고용보험법 제48조·제50조 (수급기간 12개월, 소정급여일수)', url: 'https://www.law.go.kr/법령/고용보험법/제50조' },
  { label: '고용보험법 제58조 (이직 사유에 따른 수급자격 제한)', url: 'https://www.law.go.kr/법령/고용보험법/제58조' },
  { label: '국민건강보험법 제110조 (실업자 임의계속가입)', url: 'https://www.law.go.kr/법령/국민건강보험법/제110조' },
  { label: '소득세법 제48조·제55조 (퇴직소득공제, 세율)', url: 'https://www.law.go.kr/법령/소득세법/제48조' },
]

export default function ResignationPayPage() {
  const jsonLd = {
    '@context': 'https://schema.org', '@type': 'WebApplication',
    name: '퇴사하면 받는 돈 계산기',
    description: '입사일·마지막 근무일·월급으로 퇴직금(세후), 미사용 연차수당, 실업급여, 중도퇴사 연말정산을 합쳐 퇴사 때 받는 돈을 계산하는 도구.',
    url: 'https://toolhub.ai.kr/resignation-pay/',
    applicationCategory: 'FinanceApplication', operatingSystem: 'Any', browserRequirements: 'JavaScript',
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'KRW' },
    featureList: ['퇴직금·퇴직소득세(세후)', '미사용 연차수당(발생 연차 자동 계산)', '실업급여 1일 금액·소정급여일수(이직 연도별 상·하한)', '자발적 퇴사 예외 사유 안내', '중도퇴사 연말정산 환급·추가 납부 추정', '퇴사일 바꿔 보기(1년·연차 발생일·한 달 뒤)', '퇴사 후 할 일 일정', '상세 계산기로 입력값 넘기기', '결과 공유 링크·이미지'],
  }

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <div className="min-h-screen py-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <I18nWrapper>
            <ResignationPayCalculator />
            <ToolFaq items={faqs} />
            <div className="mt-8">
              <RelatedTools />
            </div>
          </I18nWrapper>
        </div>
      </div>
      <section className="max-w-4xl mx-auto px-4 pb-12">
        <div className="mt-12 border-t border-line pt-8">
          <h2 className="text-xl font-bold text-fg mb-4">퇴사하면 받는 돈 계산기란?</h2>
          <p className="text-body leading-relaxed mb-6">
            퇴사를 앞두면 퇴직금, 남은 연차, 실업급여, 연말정산을 각각 따로 찾아봐야 합니다. 이 계산기는 입사일과 마지막 근무일, 최근 월급만 넣으면 네 가지를 같은 기준으로 계산해 퇴사 때 받는 돈을 한 번에 보여 줍니다. 퇴직금은 퇴직소득세를 뺀 세후 금액, 연차수당은 입사일 기준으로 생긴 연차와 남은 일수로, 실업급여는 퇴사 사유·나이·가입 기간과 이직한 해의 상·하한으로, 중도퇴사 연말정산은 그해 받은 급여와 매달 뗀 세금으로 추정합니다. 실업급여는 받을 수 있을 때만 합계에 넣습니다.
          </p>

          <h3 className="text-lg font-semibold text-fg mb-3">예시 (월 350만원, 연차 5일 남음, 50세 미만)</h3>
          <ul className="list-disc list-inside space-y-3 text-body mb-6">
            <li>
              <strong>2023.3.2 입사, 2026.12.31 권고사직:</strong> 퇴직금 세후 {won(D.sev.net)} + 연차수당 {won(D.leavePay)} {D.tax.refund >= 0 ? `+ 연말정산 환급 ${won(D.tax.refund)}` : `− 연말정산 추가 납부 ${won(-D.tax.refund)}`} + 실업급여 {won(D.ue.total)} = <strong>{won(D.total)}</strong>
            </li>
            <li>
              <strong>같은 조건, 자발적 퇴사:</strong> 실업급여가 빠져 {won(V.total)}
            </li>
            <li>
              <strong>같은 조건, {dot(NL.last)}까지 근무:</strong> 새 연차 {NL.added}일이 생겨 연차수당 {won(NL.leavePay)}, 퇴직금 세후 {won(NL.sev)}
            </li>
            <li>
              <strong>2026.3.2 입사, 2026.12.31 퇴사(1년 미만):</strong> 퇴직금 0원. {dot(SY.last)}까지 일하면 퇴직금 세후 {won(SY.sev)}
            </li>
          </ul>

          <h3 className="text-lg font-semibold text-fg mb-3">퇴사 전에 확인할 것</h3>
          <ul className="list-disc list-inside space-y-2 text-body mb-6">
            <li>마지막 근무일이 입사 1년이 되는 날이나 연차가 새로 생기는 날 바로 앞이면, 며칠 늦춰 퇴직금·연차가 생기는지 확인하세요.</li>
            <li>권고사직·계약만료라면 사직서와 이직확인서에 &lsquo;개인 사정&rsquo;이 아니라 실제 사유가 적히도록 하세요. 실업급여 수급을 가릅니다.</li>
            <li>퇴직금을 받을 IRP 계좌를 미리 만들어 두고, 남은 연차를 쓸지 수당으로 받을지 회사와 정해 두세요.</li>
          </ul>

          <p className="text-sm text-muted mb-6">
            항목별로 더 자세히 계산하려면 <a href="/retirement-calculator/" className="text-primary hover:underline">퇴직금 계산기</a>, <a href="/annual-leave/" className="text-primary hover:underline">연차 계산기</a>, <a href="/unemployment-benefit/" className="text-primary hover:underline">실업급여 계산기</a>, <a href="/year-end-tax/" className="text-primary hover:underline">연말정산 계산기</a>를 이용하세요. 사직서는 <a href="/resignation-letter/" className="text-primary hover:underline">사직서 작성기</a>에서 만들 수 있습니다.
          </p>

          <h3 className="text-lg font-semibold text-fg mb-3">근거 법령·출처</h3>
          <ul className="space-y-1.5 text-sm text-sub">
            {sources.map((s) => (
              <li key={s.url}>
                <a href={s.url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">{s.label}</a>
              </li>
            ))}
          </ul>
          <p className="text-xs text-muted mt-3">2026년 11월 현재 시행 중인 법령 기준 예상 금액입니다. 실제 금액은 회사의 임금 구성·연차 운영 방식과 고용센터 판단에 따라 다를 수 있습니다.</p>
        </div>
      </section>
    </>
  )
}
