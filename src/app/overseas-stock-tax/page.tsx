import { Metadata } from 'next'
import OverseasStockTaxCalculator from '@/components/OverseasStockTaxCalculator'
import I18nWrapper from '@/components/I18nWrapper'
import RelatedTools from '@/components/RelatedTools'
import ToolFaq from '@/components/ToolFaq'
import { analyze, EXAMPLES } from '@/utils/overseasStockTax'

export const metadata: Metadata = {
  title: '해외주식 양도세 계산기 - 250만원 공제·연말 절세 | 툴허브',
  description: '해외주식 양도차익에서 기본공제 250만원을 빼고 22%(지방소득세 포함)로 2026년 양도세를 계산하고, 손실 종목 정리·250만원 공제 채우기로 줄일 세금과 연내 결제 기한, 2027년 5월 신고를 안내합니다.',
  keywords: '해외주식 양도세 계산기, 해외주식 양도소득세, 미국주식 양도세, 해외주식 250만원 공제, 해외주식 손익통산, 해외주식 절세, 미국주식 세금, 해외주식 양도세 신고, 양도세 22%, 해외주식 연말 매도, 미국주식 결제일',
  openGraph: {
    title: '해외주식 양도세 계산기 - 250만원 공제·연말 절세 | 툴허브',
    description: '판 종목 손익 → 22% 양도세, 손실 종목 정리·250만원 공제 채우기로 줄일 세금.',
    url: 'https://toolhub.ai.kr/overseas-stock-tax/',
    siteName: '툴허브', locale: 'ko_KR', type: 'website',
    images: [{ url: 'https://toolhub.ai.kr/og/overseas-stock-tax.png', width: 1200, height: 630, alt: '해외주식 양도세 계산기' }],
  },
  twitter: { card: 'summary_large_image', title: '해외주식 양도세 계산기 | 툴허브', description: '250만원 공제·22% 양도세와 연말 손익통산·공제 채우기 절세', images: ['https://toolhub.ai.kr/og/overseas-stock-tax.png'] },
  alternates: { canonical: 'https://toolhub.ai.kr/overseas-stock-tax/' },
}

// 본문·FAQ 숫자는 계산기와 같은 함수로 빌드 시 계산 (값은 scripts/check-overseas-stock-tax.ts가 고정)
const won = (n: number) => `${n.toLocaleString('ko-KR')}원`
const D = analyze(EXAMPLES.d)
const F = analyze(EXAMPLES.fill)
const [NV, TS, AP] = D.items
const FL = F.fill[0]

const faqs = [
  { q: '해외주식 양도세는 어떻게 계산하나요?', a: `1월 1일부터 12월 31일까지 결제된 해외주식의 매도금액에서 매수금액과 매매 수수료를 뺀 손익을 모두 합치고, 기본공제 250만원을 뺀 금액에 20%를 곱합니다. 지방소득세 2%가 더해져 실제로는 22%입니다. 예를 들어 1,500만원에 산 엔비디아를 2,500만원에 팔았다면(수수료 0.25%) 손익 ${won(NV.gain)}에서 250만원을 뺀 ${won(D.tax.base)}에 22%가 붙어 ${won(D.tax.total)}을 냅니다.` },
  { q: '손실 난 종목을 팔면 세금이 줄어드나요?', a: `줄어듭니다. 같은 해에 결제된 해외주식 손익은 모두 합산(손익통산)하므로, 이익을 낸 해에 손실 종목을 팔면 그만큼 과세 이익이 줄어듭니다. 위 예시에서 평가손실 중인 테슬라(${won(TS.gain)})를 연내에 팔면 세금이 ${won(D.tax.total)}에서 ${won(D.taxAfterLoss)}으로 ${won(D.lossSaving)} 줄어듭니다. 손실은 다음 해로 넘어가지 않으므로 그해 이익이 250만원 아래로 내려가는 만큼만 실현하면 충분합니다.` },
  { q: '250만원 공제를 다 못 쓰면 어떻게 하나요?', a: `기본공제 250만원은 쓰지 않으면 그해로 사라집니다. 남은 공제만큼 이익 종목을 팔았다가 다시 사면 그 이익은 세금 없이 확정되고 매수가가 올라가, 나중에 팔 때 낼 세금이 줄어듭니다. 예를 들어 올해 판 이익이 ${won(F.realized)}이고 애플 평가이익이 ${won(AP.gain)}이라면 약 ${won(FL.sell)}어치를 팔고 다시 사서 이익 ${won(FL.gain)}을 비과세로 확정할 수 있고, 나중에 팔 때 세금이 최대 ${won(F.futureSaving)} 줄어듭니다. 수수료와 환전 비용, 그 사이 가격 변동은 감안해야 합니다.` },
  { q: '12월 며칠까지 팔아야 올해 손익에 들어가나요?', a: '양도 시기는 주문이 체결된 날이 아니라 결제일입니다. 미국 주식은 체결 다음 영업일(T+1)에 결제되므로 12월 31일까지 결제되도록 그 전에 팔아야 올해 손익에 들어갑니다. 증권사마다 마지막 매도일과 시각을 따로 공지하므로 12월에 거래하는 증권사의 안내를 확인하고, 마지막 날보다 여유 있게 매도하는 것이 안전합니다.' },
  { q: '국내 주식 손실과도 합칠 수 있나요?', a: '국내 상장주식 중 대주주가 판 주식과 비상장주식처럼 양도소득세가 붙는 국내 주식은 2020년 양도분부터 해외주식과 손익을 합칠 수 있고, 기본공제 250만원도 합쳐서 한 번만 받습니다. 대주주가 아닌 사람이 장내에서 판 국내 상장주식은 과세 대상이 아니라서 합칠 수 없습니다.' },
  { q: '환율은 어떤 날 기준으로 계산하나요?', a: '매도금액은 매도대금이 들어온 날, 매수금액과 수수료는 대금이 빠져나간 날(각 결제일)의 기준환율 또는 재정환율로 원화로 바꿉니다. 그래서 달러 기준 주가가 그대로여도 산 때보다 환율이 오르면 원화 이익이 생겨 세금이 붙을 수 있습니다. 증권사 앱의 원화 손익은 환율 기준이 조금 다를 수 있어 신고 때는 증권사가 주는 양도소득 계산 자료를 쓰는 것이 좋습니다.' },
  { q: '신고는 언제, 어떻게 하나요?', a: '해외주식은 예정신고 없이 판 다음 해 5월 1일부터 31일까지 확정신고·납부합니다. 2026년에 결제된 거래는 2027년 5월 31일까지 홈택스에서 신고하고, 지방소득세는 위택스에서 이어서 신고·납부합니다. 여러 증권사가 3~4월쯤 신청을 받아 신고를 대신해 주는 서비스를 운영하니 거래하는 증권사의 공지를 확인하세요. 증권사를 여러 곳 썼다면 손익을 모두 합쳐 한 번에 신고해야 합니다.' },
  { q: '배우자에게 주식을 증여한 뒤 팔면 세금이 줄어드나요?', a: '배우자나 직계존비속에게 증여받은 주식을 증여받은 날부터 1년 안에 팔면 증여한 사람이 처음 산 가격을 취득가액으로 보고 양도차익을 계산합니다(소득세법 제97조의2). 따라서 증여로 취득가액을 높이는 효과를 보려면 증여받은 뒤 1년이 지나서 팔아야 합니다. 증여세 공제 한도와 신고 여부는 별도로 확인해야 합니다.' },
  { q: '가족 명의 해외주식으로 이익이 나면 연말정산에 영향이 있나요?', a: '있습니다. 부양가족 기본공제를 받으려면 그 가족의 연간 소득금액 합계가 100만원 이하여야 하는데 양도소득금액도 여기에 들어갑니다(소득세법 제50조). 배우자나 자녀 계좌에서 해외주식 양도소득금액이 100만원을 넘으면 그해에는 부양가족으로 공제받을 수 없습니다.' },
]

const sources = [
  { label: '국세청 「2025년 신고안내 해외주식과 세금(개인투자자용)」 — 세율 20%, 국내·국외주식 합산 기본공제 250만원, 손익통산, 결제일 환율, 선입선출·이동평균법, 확정신고', url: 'https://taxlaw.nts.go.kr/downloadPDFFile.do?fleId=300000000001047678&fleSn=923559' },
  { label: '소득세법 제94조 (양도소득의 범위 — 제1항제3호다목 외국법인 발행·해외 상장 주식)', url: 'https://www.law.go.kr/법령/소득세법/제94조' },
  { label: '소득세법 제102조 (양도소득금액 구분 계산 — 주식등 그룹 안에서 양도차손 공제)', url: 'https://www.law.go.kr/법령/소득세법/제102조' },
  { label: '소득세법 제103조 (양도소득 기본공제 — 소득 그룹별 연 250만원)', url: 'https://www.law.go.kr/법령/소득세법/제103조' },
  { label: '소득세법 제110조 (양도소득 확정신고 — 다음 연도 5월 1일~31일)', url: 'https://www.law.go.kr/법령/소득세법/제110조' },
  { label: '소득세법 제97조의2 (배우자·직계존비속 증여 후 양도 — 주식등 1년 이월과세)', url: 'https://www.law.go.kr/법령/소득세법/제97조의2' },
  { label: '소득세법 제50조 (기본공제 — 부양가족 연간 소득금액 100만원 이하)', url: 'https://www.law.go.kr/법령/소득세법/제50조' },
  { label: '소득세법 시행령 제162조 (양도·취득 시기, 선입선출)', url: 'https://www.law.go.kr/법령/소득세법시행령/제162조' },
  { label: '지방세법 제103조의3 (양도소득 개인지방소득세 — 주식등 1천분의 20)', url: 'https://www.law.go.kr/법령/지방세법/제103조의3' },
  { label: '조세특례제한법 제91조의26 (국내시장복귀계좌를 통한 투자에 대한 과세특례)', url: 'https://www.law.go.kr/법령/조세특례제한법/제91조의26' },
]

export default function OverseasStockTaxPage() {
  const jsonLd = {
    '@context': 'https://schema.org', '@type': 'WebApplication',
    name: '해외주식 양도세 계산기',
    description: '판 해외주식 손익으로 기본공제 250만원·세율 22%(지방소득세 포함) 양도소득세를 계산하고, 연말 손실 종목 정리와 250만원 공제 채우기로 줄일 세금을 보여 주는 도구.',
    url: 'https://toolhub.ai.kr/overseas-stock-tax/',
    applicationCategory: 'FinanceApplication', operatingSystem: 'Any', browserRequirements: 'JavaScript',
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'KRW' },
    featureList: ['종목별 손익 입력(판 종목·보유 종목)', '기본공제 250만원·양도소득세 20%·지방소득세 2%', '매매 수수료 필요경비 반영', '손실 종목 정리(손익통산) 절세액과 매도 금액', '250만원 공제 채우기(매도 후 재매수) 금액', '보유 종목까지 모두 팔 때 세금 비교', '연내 결제 기한·2027년 5월 확정신고 안내', '결과 공유 링크·이미지'],
  }

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <div className="min-h-screen py-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <I18nWrapper>
            <OverseasStockTaxCalculator />
            <ToolFaq items={faqs} />
            <div className="mt-8">
              <RelatedTools />
            </div>
          </I18nWrapper>
        </div>
      </div>
      <section className="max-w-4xl mx-auto px-4 pb-12">
        <div className="mt-12 border-t border-line pt-8">
          <h2 className="text-xl font-bold text-fg mb-4">해외주식 양도세 계산기란?</h2>
          <p className="text-body leading-relaxed mb-6">
            해외주식 양도세 계산기는 한 해 동안 판 미국·일본·홍콩 등 해외주식의 손익을 모두 합쳐 다음 해 5월에 낼 양도소득세를 계산하는 도구입니다. 해외주식은 1인당 연 250만원까지 기본공제를 받고, 넘는 금액에 양도소득세 20%와 지방소득세 2%, 모두 22%가 붙습니다. 이 계산기는 판 종목으로 올해 세금을 계산하는 데서 그치지 않고, 아직 들고 있는 종목을 이용해 12월 안에 할 수 있는 절세 방법 두 가지 — 손실 종목을 팔아 이익과 상계하는 손익통산, 남은 250만원 공제만큼 이익을 실현했다가 다시 사는 공제 채우기 — 를 각각 얼마어치 팔면 되는지와 줄어드는 세금으로 보여 줍니다.
          </p>

          <h3 className="text-lg font-semibold text-fg mb-3">계산 예시 (수수료 0.25%)</h3>
          <ul className="list-disc list-inside space-y-3 text-body mb-6">
            <li>
              <strong>엔비디아 1,500만원에 사서 2,500만원에 매도:</strong> 손익 {won(NV.gain)} − 기본공제 250만원 = 과세표준 {won(D.tax.base)} → 양도소득세 {won(D.tax.income)} + 지방소득세 {won(D.tax.local)} = {won(D.tax.total)}
            </li>
            <li>
              <strong>같은 해에 평가손실 {won(-TS.gain)}인 테슬라를 연내 매도:</strong> 과세 손익 {won(D.afterLoss)} → 세금 {won(D.taxAfterLoss)}, {won(D.lossSaving)} 절세
            </li>
            <li>
              <strong>판 이익이 {won(F.realized)}뿐이고 애플 평가이익이 {won(AP.gain)}일 때:</strong> 남은 공제 {won(F.room)}만큼 애플 약 {won(FL.sell)}어치를 팔고 다시 사면 이익 {won(FL.gain)}이 비과세로 확정되고, 나중에 낼 세금이 최대 {won(F.futureSaving)} 줄어듭니다
            </li>
          </ul>

          <h3 className="text-lg font-semibold text-fg mb-3">12월 31일 전에 할 일</h3>
          <ul className="list-disc list-inside space-y-2 text-body mb-6">
            <li>증권사 앱에서 올해 실현 손익(원화)을 확인하고, 250만원을 넘었는지 먼저 봅니다.</li>
            <li>넘었다면 평가손실 종목을 넘은 만큼만 매도해 손익을 상계합니다. 손실은 다음 해로 넘어가지 않습니다.</li>
            <li>250만원에 못 미치면 남은 공제만큼 이익 종목을 팔았다가 다시 사 매수가를 올려 둡니다.</li>
            <li>매도는 12월 31일까지 결제되도록 해야 합니다. 미국 주식은 체결 다음 영업일에 결제되므로 증권사의 연말 마감 공지를 확인하세요.</li>
          </ul>

          <p className="text-sm text-muted mb-6">
            한 종목의 수익률·환차익은 <a href="/stock-calculator/" className="text-primary hover:underline">주식 수익률 계산기</a>, 달러 환산은 <a href="/exchange-calculator/" className="text-primary hover:underline">환율 계산기</a>, 배당금은 <a href="/dividend-calculator/" className="text-primary hover:underline">배당금 계산기</a>에서 계산할 수 있습니다.
          </p>

          <h3 className="text-lg font-semibold text-fg mb-3">근거 법령·출처</h3>
          <ul className="space-y-1.5 text-sm text-sub">
            {sources.map((s) => (
              <li key={s.url}>
                <a href={s.url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">{s.label}</a>
              </li>
            ))}
          </ul>
          <p className="text-xs text-muted mt-3">기준: 2026년 11월 8일 확인. 2026년 11월 현재 시행 중인 법령 기준이며 국회 심의 중인 세법 개정안은 반영하지 않았습니다. 국내시장복귀계좌(RIA) 특례와 해외 상장 중소기업 주식 10% 세율은 계산에 넣지 않았습니다.</p>
        </div>
      </section>
    </>
  )
}
