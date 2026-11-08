import { Metadata } from 'next'
import PrepaymentFeeCalculator from '@/components/PrepaymentFeeCalculator'
import I18nWrapper from '@/components/I18nWrapper'
import RelatedTools from '@/components/RelatedTools'
import ToolFaq from '@/components/ToolFaq'
import { todayKST } from '@/utils/dday'
import { prepaymentFee, refinance, stampTax, EXAMPLES } from '@/utils/prepaymentFee'

// 정적 HTML 은 빌드 날짜(KST) 기준, 브라우저는 마운트 후 오늘 날짜로 (hydration 불일치 방지)
const buildDate = todayKST()

// 본문·FAQ 숫자는 계산기와 같은 함수로 빌드 시 계산 (값은 scripts/check-prepayment-fee.ts가 고정)
const won = (n: number) => `${Math.round(n).toLocaleString('ko-KR')}원`
const manwon = (n: number) => `약 ${Math.round(n / 10_000).toLocaleString('ko-KR')}만원`
const H = prepaymentFee(EXAMPLES.half)
const Y = prepaymentFee(EXAMPLES.year)
const O = prepaymentFee(EXAMPLES.old)
const RF = EXAMPLES.refi
const RFee = prepaymentFee({ amount: RF.balance, rate: RF.feeRate, start: RF.start, repay: RF.repay })
const RStamp = stampTax(RF.balance) / 2
const R = refinance({ balance: RF.balance, rate: RF.rate, months: RF.months, method: RF.method }, RF.newRate, RF.months, RFee.fee, RStamp, 24)

export const metadata: Metadata = {
  title: '중도상환수수료 계산기 - 갈아타기 손익까지 | 툴허브',
  description: `1억원을 1년 만에 갚으면 수수료 ${manwon(Y.fee)}(은행 주담대 평균 0.56%). 2025.1.13 개편 요율, 3년 지나면 0원, 보금자리론 0.5%·디딤돌 0.6%, 대출 갈아타기 순이득과 손익분기까지 계산합니다.`,
  keywords: '중도상환수수료 계산기, 중도상환수수료, 중도상환수수료 계산, 중도상환수수료 면제, 중도상환수수료 3년, 주택담보대출 중도상환수수료, 신용대출 중도상환수수료, 보금자리론 중도상환수수료, 디딤돌 중도상환수수료, 대출 갈아타기 계산기, 대환대출 손익, 인지세',
  openGraph: {
    title: '중도상환수수료 계산기 - 갈아타기 손익까지 | 툴허브',
    description: '갚을 금액·실행일·요율 → 중도상환수수료, 갈아타면 남는 돈과 손익분기 개월.',
    url: 'https://toolhub.ai.kr/prepayment-fee/',
    siteName: '툴허브', locale: 'ko_KR', type: 'website',
    images: [{ url: 'https://toolhub.ai.kr/og/prepayment-fee.png', width: 1200, height: 630, alt: '중도상환수수료 계산기' }],
  },
  twitter: { card: 'summary_large_image', title: '중도상환수수료 계산기 | 툴허브', description: '중도상환수수료와 대출 갈아타기 순이득·손익분기 계산', images: ['https://toolhub.ai.kr/og/prepayment-fee.png'] },
  alternates: { canonical: 'https://toolhub.ai.kr/prepayment-fee/' },
}

const faqs = [
  { q: '중도상환수수료는 어떻게 계산하나요?', a: `대부분의 금융회사는 '갚는 원금 × 수수료율 × (3년 − 대출 후 지난 일수) ÷ 3년'으로 계산합니다. 3년은 보통 1,095일로 셉니다. 2025년 1월 13일 이후 은행 주택담보대출(고정금리) 평균 요율 0.56%로 1억원을 6개월(182일) 만에 갚으면 1억원 × 0.56% × 913 ÷ 1,095 = ${won(H.fee)}, 1년 만에 갚으면 ${won(Y.fee)}입니다. 날이 지날수록 매일 조금씩 줄어듭니다.` },
  { q: '3년이 지나면 정말 수수료가 없나요?', a: '네. 금융소비자보호법 제20조는 중도상환수수료를 원칙적으로 금지하고, 대출일부터 3년 안에 갚는 경우에만 예외로 받을 수 있게 합니다. 그래서 3년이 지나면 언제 얼마를 갚아도 수수료가 없습니다. 만기가 3년보다 짧은 대출(1년 신용대출 등)은 대출 기간을 기준으로 계산하는 곳이 많습니다.' },
  { q: '2025년 1월 13일 개편으로 무엇이 바뀌었나요?', a: `금융위원회가 금융소비자보호법 감독규정을 고쳐, 2025년 1월 13일 이후 새로 맺는 대출은 자금 운용 차질에 따른 손실과 인지세·감정평가 등 행정·모집 비용 같은 실제 비용 안에서만 수수료를 받게 했습니다. 은행 평균 요율은 주택담보대출 고정금리 1.43% → 0.56%, 변동금리 1.25% → 0.55%, 신용대출 고정 0.95% → 0.12%, 변동 0.83% → 0.11%로 내려갔습니다. 그 전에 맺은 계약은 예전 요율이 그대로라, 개편 전 평균 1.43%면 1억원을 1년 만에 갚을 때 ${won(O.fee)}입니다.` },
  { q: '보금자리론·디딤돌대출 중도상환수수료는 얼마인가요?', a: '보금자리론은 실행일부터 3년 안에 갚으면 남은 일수에 따라 0.5% 한도에서 받고, 사회적배려층·다자녀(3자녀 이상) 우대금리 대상과 전세사기피해자는 면제입니다(한국주택금융공사 안내). 내집마련 디딤돌대출은 0.6% 한도이지만 2024년 8월 12일부터 2026년 12월 31일까지 갚는 원금은 면제됩니다(주택도시기금 안내). 예전에 받은 대출은 약정서에 적힌 요율을 확인하세요.' },
  { q: '대출 갈아타기가 이득인지 어떻게 판단하나요?', a: `갈아타서 줄어드는 이자에서 중도상환수수료와 인지세 같은 비용을 뺀 값이 플러스면 이득입니다. 예를 들어 1년 전에 받은 잔액 3억원, 금리 4.3%, 남은 기간 29년(원리금균등) 대출을 3.8%로 갈아타면 이자가 ${won(R.saving)} 줄고, 중도상환수수료 ${won(RFee.fee)}(0.56%)와 인지세 ${won(RStamp)}를 빼도 ${won(R.net)}이 남습니다. 비용은 ${R.breakEven}개월이면 회수됩니다. 수수료가 없어지는 2년 뒤까지 기다리면 그동안 더 내는 이자 때문에 순이득이 ${won(R.waitNet ?? 0)}로 줄어듭니다(금리가 그대로라고 가정).` },
  { q: '갈아탈 때 드는 비용에는 무엇이 있나요?', a: '새 대출 약정서에는 인지세가 붙습니다. 금융기관 대출은 5천만원 이하 비과세, 1억원 이하 7만원, 10억원 이하 15만원, 10억원 초과 35만원이고 고객과 금융기관이 반씩 냅니다(인지세법 제3조·제6조). 주택담보대출의 근저당 설정 비용(등록면허세·법무사 수수료)과 감정평가 수수료는 보통 은행이 내고, 기존 근저당 말소 비용은 고객이 냅니다. 보금자리론처럼 국민주택채권 매입 비용을 고객이 내는 상품도 있으니 상품설명서를 확인하세요.' },
  { q: '일부만 갚아도 수수료가 붙나요? 면제 한도는 없나요?', a: '일부를 갚아도 갚은 원금만큼 수수료가 붙습니다. 다만 해마다 처음 빌린 금액의 10%까지는 수수료 없이 갚게 해 주는 상품이 있습니다(예: KB국민은행 부동산담보대출, 쓰지 않은 한도는 다음 해로 넘어가지 않음). 약정서에 이런 조건이 있으면 계산기의 \'수수료 없이 갚을 수 있는 금액\'에 넣으세요.' },
  { q: '대출 계약을 철회하면 수수료를 안 내도 되나요?', a: '금융소비자보호법 제46조의 청약 철회권을 쓰면 중도상환수수료가 면제됩니다. 대출은 계약서류를 받은 날 등부터 14일 안에 철회할 수 있고, 받은 원금과 이자, 금융회사가 낸 인지세 등 부대비용은 돌려줘야 합니다. 철회할 수 있는 대출 금액에 상한이 있으니 은행에 확인하세요.' },
]

const sources = [
  { label: '금융위원회 보도자료 (2025.1.9) — 1월 13일 신규 대출부터 중도상환수수료율 인하, 업권별 평균 요율', url: 'https://www.fsc.go.kr/edu/news/83839' },
  { label: '금융소비자보호법 제20조 (불공정영업행위 — 3년 이내 상환 시에만 중도상환수수료)', url: 'https://www.law.go.kr/법령/금융소비자보호에관한법률/제20조' },
  { label: '금융소비자보호법 제46조 (청약의 철회)', url: 'https://www.law.go.kr/법령/금융소비자보호에관한법률/제46조' },
  { label: '한국주택금융공사 — 보금자리론 (조기상환수수료 0.5% 한도, 면제 대상)', url: 'https://www.hf.go.kr/ko/sub01/sub01_01_01.do' },
  { label: '주택도시기금 — 내집마련 디딤돌대출 (0.6% 한도, 산식, 2026.12.31까지 면제)', url: 'https://nhuf.molit.go.kr/FP/FP05/FP0503/FP05030101.jsp' },
  { label: '인지세법 제3조 (금융기관 금전소비대차 증서 세액)', url: 'https://www.law.go.kr/법령/인지세법/제3조' },
  { label: '인지세법 제6조 (5천만원 이하 금전소비대차 비과세)', url: 'https://www.law.go.kr/법령/인지세법/제6조' },
  { label: '하나은행 보금자리론 상품설명서 (2024.10 — 산식 1,095일 예시, 인지세 50% 분담, 비용 부담 주체)', url: 'https://image.kebhana.com/cont/download/documents/manual/0000516010621_20241017_m.pdf' },
  { label: 'KB국민은행 KB Think — 중도상환수수료 산식, 연 10% 면제, 대출기간 3년 미만 기준', url: 'https://kbthink.com/main/asset-management/wealth-manage-tip/kbthink-original/202501/early-repayment-fee-reduction.html' },
]

export default function PrepaymentFeePage() {
  const jsonLd = {
    '@context': 'https://schema.org', '@type': 'WebApplication',
    name: '중도상환수수료 계산기',
    description: '대출 실행일·갚을 금액·수수료율로 중도상환수수료를 계산하고, 대출을 갈아탈 때 이자 절감에서 수수료·인지세를 뺀 순이득과 손익분기 개월을 보여 주는 도구.',
    url: 'https://toolhub.ai.kr/prepayment-fee/',
    applicationCategory: 'FinanceApplication', operatingSystem: 'Any', browserRequirements: 'JavaScript',
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'KRW' },
    featureList: ['중도상환수수료 일할 계산(3년 = 1,095일)', '2025.1.13 개편 전·후 은행 평균 요율 자동 입력', '보금자리론·디딤돌대출 요율과 면제', '연 10% 면제 금액 반영', '날짜별 수수료 변화 표', '일부 상환 시 줄어드는 이자', '대출 갈아타기 순이득·손익분기', '수수료 없어질 때까지 기다리면 비교', '인지세 자동 계산', '결과 공유 링크·이미지'],
  }

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <div className="min-h-screen py-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <I18nWrapper>
            <PrepaymentFeeCalculator buildDate={buildDate} />
            <ToolFaq items={faqs} />
            <div className="mt-8">
              <RelatedTools />
            </div>
          </I18nWrapper>
        </div>
      </div>
      <section className="max-w-4xl mx-auto px-4 pb-12">
        <div className="mt-12 border-t border-line pt-8">
          <h2 className="text-xl font-bold text-fg mb-4">중도상환수수료 계산기란?</h2>
          <p className="text-body leading-relaxed mb-6">
            중도상환수수료 계산기는 대출을 만기 전에 갚을 때 금융회사에 내는 수수료를 대출 실행일·갚을 날·갚을 금액·수수료율로 계산하는 도구입니다. 수수료는 대출일부터 3년 안에 갚을 때만 붙고, 남은 일수에 비례해 매일 줄어듭니다. 2025년 1월 13일부터는 실제 비용 안에서만 받도록 바뀌어 은행 주택담보대출 평균 요율이 1%대에서 0.5%대로 낮아졌지만, 그 전에 맺은 계약은 예전 요율이 그대로입니다. 이 계산기는 대출 실행일에 맞춰 개편 전·후 평균 요율을 넣어 주고, 대출을 갈아탈 때 줄어드는 이자에서 수수료와 인지세를 뺀 &lsquo;실제로 남는 돈&rsquo;과 비용을 회수하는 데 걸리는 개월 수까지 보여 줍니다.
          </p>

          <h3 className="text-lg font-semibold text-fg mb-3">계산 예시</h3>
          <ul className="list-disc list-inside space-y-3 text-body mb-6">
            <li>
              <strong>은행 주담대(2025.1.13 이후, 0.56%) 1억원을 6개월(182일) 만에 상환:</strong> 1억원 × 0.56% × 913 ÷ 1,095 = {won(H.fee)}
            </li>
            <li>
              <strong>같은 대출을 1년(365일) 만에 상환:</strong> 1억원 × 0.56% × 730 ÷ 1,095 = {won(Y.fee)}
            </li>
            <li>
              <strong>2025.1.13 전 계약(개편 전 평균 1.43%) 1억원을 1년 만에 상환:</strong> {won(O.fee)}
            </li>
            <li>
              <strong>잔액 3억원 4.3% → 3.8% 갈아타기(남은 29년, 실행 1년 뒤):</strong> 이자 절감 {won(R.saving)} − 중도상환수수료 {won(RFee.fee)} − 인지세 {won(RStamp)} = 순이득 {won(R.net)}, {R.breakEven}개월이면 비용 회수
            </li>
          </ul>

          <h3 className="text-lg font-semibold text-fg mb-3">갚기 전에 확인할 것</h3>
          <ul className="list-disc list-inside space-y-2 text-body mb-6">
            <li>약정서·은행 앱에서 실제 수수료율과 대출 실행일을 확인하세요. 은행·상품마다 요율이 다르고 해마다 다시 산정됩니다.</li>
            <li>3년이 몇 달 안 남았다면 수수료가 0원이 되는 날 이후로 미루는 것이 나을 수 있습니다. 위 &lsquo;언제 갚으면&rsquo; 표로 비교하세요.</li>
            <li>갈아탈 새 대출도 실행일부터 3년 동안 중도상환수수료가 붙고, LTV·DSR 심사를 다시 받습니다.</li>
          </ul>

          <p className="text-sm text-muted mb-6">
            회차별 원금·이자는 <a href="/loan-schedule/" className="text-primary hover:underline">대출 상환 스케줄</a>, 월 상환액은 <a href="/loan-calculator/" className="text-primary hover:underline">대출 이자 계산기</a>, 새 대출 한도는 <a href="/dsr-calculator/" className="text-primary hover:underline">DSR 계산기</a>에서 계산할 수 있습니다.
          </p>

          <h3 className="text-lg font-semibold text-fg mb-3">근거 법령·출처</h3>
          <ul className="space-y-1.5 text-sm text-sub">
            {sources.map((s) => (
              <li key={s.url}>
                <a href={s.url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">{s.label}</a>
              </li>
            ))}
          </ul>
          <p className="text-xs text-muted mt-3">기준: 2026년 11월 8일 확인. 은행 평균 요율은 금융위원회가 2025년 1월 개편 때 발표한 값이며, 실제 요율과 비용 부담은 대출 약정서와 금융회사 안내를 따릅니다.</p>
        </div>
      </section>
    </>
  )
}
