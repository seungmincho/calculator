import { Metadata } from 'next'
import EducationTaxCreditCalculator from '@/components/EducationTaxCreditCalculator'
import I18nWrapper from '@/components/I18nWrapper'
import RelatedTools from '@/components/RelatedTools'
import ToolFaq from '@/components/ToolFaq'
import { analyze, EXAMPLES } from '@/utils/educationTaxCredit'
import { TAX_YEAR } from '@/utils/yearEndTax'

export const metadata: Metadata = {
  title: '교육비 세액공제 계산기 2026 - 학원비·한도 | 툴허브',
  description: '가족별 교육비를 넣으면 1명당 한도(취학 전·초중고 300만원, 대학생 900만원)를 적용해 2026년 귀속 교육비 세액공제와 실제로 줄어드는 세금을 계산합니다. 2026년부터 공제되는 초등 1·2학년 예체능 학원비, 교복·체험학습 한도, 간소화에 안 나오는 영수증까지.',
  keywords: '교육비 세액공제 계산기, 교육비 세액공제, 교육비 공제 한도, 연말정산 교육비, 학원비 세액공제, 초등학생 학원비 공제, 예체능 학원비 공제, 태권도 학원비 연말정산, 교복 구입비 공제, 대학 등록금 세액공제, 대학원 교육비 공제',
  openGraph: {
    title: '교육비 세액공제 계산기 2026 - 학원비·한도 | 툴허브',
    description: '가족별 교육비 → 1명당 한도 적용, 줄어드는 세금. 2026년부터 초등 1·2학년 예체능 학원비도.',
    url: 'https://toolhub.ai.kr/education-tax-credit/',
    siteName: '툴허브', locale: 'ko_KR', type: 'website',
    images: [{ url: 'https://toolhub.ai.kr/og/education-tax-credit.png', width: 1200, height: 630, alt: '교육비 세액공제 계산기 2026' }],
  },
  twitter: { card: 'summary_large_image', title: '교육비 세액공제 계산기 | 툴허브', description: '가족별 교육비 한도와 줄어드는 세금, 초등 1·2학년 예체능 학원비', images: ['https://toolhub.ai.kr/og/education-tax-credit.png'] },
  alternates: { canonical: 'https://toolhub.ai.kr/education-tax-credit/' },
}

// 본문·FAQ 숫자는 계산기와 같은 함수로 빌드 시 계산 (값은 scripts/check-education-tax-credit.ts가 고정)
const won = (n: number) => `${n.toLocaleString('ko-KR')}원`
const man = (n: number) => `${(n / 10_000).toLocaleString('ko-KR')}만원`
const D = analyze(EXAMPLES.d.salary, EXAMPLES.d.people)
const M = analyze(EXAMPLES.mid.salary, EXAMPLES.mid.people)
const U = analyze(EXAMPLES.univ.salary, EXAMPLES.univ.people)
const L = analyze(EXAMPLES.low.salary, EXAMPLES.low.people)
const lowerBirth = TAX_YEAR - 8

const faqs = [
  { q: '교육비 세액공제는 어떻게 계산하나요?', a: `근로자가 본인과 기본공제대상자인 배우자·자녀·형제자매를 위해 낸 교육비의 15%를 세금에서 뺍니다. 본인 교육비는 한도가 없고, 취학 전 아동과 초·중·고등학생은 1명당 연 300만원, 대학생은 1명당 연 900만원까지 공제됩니다(소득세법 제59조의4제3항). 예를 들어 총급여 5,000만원인 사람이 초등 2학년 자녀의 피아노·태권도 학원비로 월 30만원씩 ${man(D.spent)}을 냈다면 300만원까지만 인정되어 공제액은 ${won(D.credit)}, 지방소득세를 포함해 세금이 ${won(D.saving)} 줄어듭니다.` },
  { q: '초등학생 학원비도 교육비 공제가 되나요?', a: `${TAX_YEAR}년 1월 1일 이후 낸 것부터, 과세기간 종료일(${TAX_YEAR}년 12월 31일) 현재 만 9세 미만(${lowerBirth}년 이후 출생)이거나 2학년 이하인 초등학생의 예능 학원과 체육시설 수강료가 공제됩니다(2025년 12월 23일 개정 소득세법 제59조의4제3항제1호마목). 피아노·미술 같은 예능 교습 학원이나 태권도장·수영장 같은 체육시설에서 월 단위로 주 1회 이상 하는 과정이어야 하고(시행령 제118조의6제8항~제10항), 영어·수학 같은 교과 학원과 3학년 이상의 학원비는 여전히 공제되지 않습니다. 한도는 따로 있지 않고 학교 교육비와 합쳐 1명당 연 300만원입니다.` },
  { q: '교복과 수학여행비도 공제되나요?', a: `중·고등학생 교복 구입비는 1명당 연 50만원, 학교 교육과정으로 하는 현장체험학습비(수학여행·수련활동 등)는 1명당 연 30만원까지 교육비에 들어가며(소득세법 시행령 제118조의6제1항제4호·제6호), 이 금액도 1명당 300만원 한도 안에서 합쳐집니다. 예를 들어 연봉 6,000만원인 사람이 중학생 자녀의 방과후·급식비 180만원, 교복 60만원, 수학여행 40만원을 냈다면 ${man(M.eligible)}이 공제 대상이 되어 세금이 ${won(M.saving)} 줄고, 남은 한도 ${man(M.rows[0].room)}을 더 채우면 ${won(M.rows[0].more)}이 더 줄어듭니다.` },
  { q: '대학생 자녀 등록금은 얼마까지 공제되나요?', a: `대학생은 1명당 연 900만원까지입니다. 연봉 8,000만원인 사람이 대학생 자녀 등록금으로 ${man(U.spent)}을 냈다면 900만원 × 15% = ${won(U.credit)}이 공제되어 세금이 ${won(U.saving)} 줄어듭니다. 자녀의 대학원 교육비와 자녀가 학자금 대출을 받아 낸 등록금은 부모가 공제받을 수 없고, 학자금 대출은 자녀가 취업한 뒤 원리금을 갚을 때 자녀 본인의 교육비로 공제받습니다. 장학금을 받은 만큼은 빼고 계산합니다(시행령 제118조의6제2항).` },
  { q: '자녀가 아르바이트로 소득이 있어도 공제되나요?', a: `${TAX_YEAR}년 1월 1일 이후 낸 교육비부터는 됩니다. 2025년 12월 23일 개정된 소득세법은 교육비 세액공제 대상 부양가족의 '나이 제한'에 더해 '소득 제한'도 없앴습니다(제59조의4제3항 본문, 부칙 제5조). 다만 부모·조부모 같은 직계존속의 교육비는 여전히 공제 대상이 아니고, 장애인 특수교육비만 직계존속도 공제받을 수 있습니다.` },
  { q: '간소화 서비스에 안 나오는 교육비는 어떻게 하나요?', a: '간소화 자료 제출 의무는 유치원·학교·어린이집·직업능력개발훈련시설과 학자금 대출 기관에만 있습니다(소득세법 시행령 제216조의3제1항제4호). 학원과 체육시설은 제출 의무가 없으므로 취학 전 아동과 초등 1·2학년의 학원비·체육시설 수강료는 학원에서 교육비 납입증명서를 받아 회사에 내야 합니다. 교복 구입비나 현장체험학습비가 간소화에 빠져 있으면 판매처·학교에서 영수증을 받으세요.' },
  { q: '학원비나 교복을 카드로 내면 카드 소득공제도 받나요?', a: '학교·유치원·어린이집에 내는 수업료·입학금·보육비용 등 공납금은 신용카드 사용액에서 빠지지만(조세특례제한법 시행령 제121조의2제6항제2호), 학원·체육시설 수강료와 교복 구입비는 그 제외 목록에 없어 카드로 내면 신용카드 소득공제와 교육비 세액공제를 함께 받습니다.' },
  { q: '맞벌이 부부는 누가 자녀 교육비를 공제받나요?', a: '자녀 교육비는 그 자녀를 기본공제(인적공제) 받는 쪽이 공제받습니다. 기본공제를 누가 받느냐에 따라 인적공제 150만원과 자녀세액공제도 함께 옮겨가므로, 연말정산 계산기로 두 사람 각각의 세금을 계산해 보고 정하세요.' },
  { q: '교육비 공제를 받았는데 환급이 생각보다 적은 이유는?', a: `세액공제는 낼 세금(결정세액)까지만 효과가 있고 남는 공제는 다음 해로 넘어가지 않습니다. 총급여 2,500만원인 사람이 본인 대학원 등록금 ${man(L.spent)}을 냈다면 공제액은 ${won(L.credit)}이지만 원래 낼 세금이 지방소득세 포함 ${won(L.tax)}이라 그만큼만 줄어듭니다. 공제가 작으면 특별세액공제 대신 표준세액공제 13만원이 적용되어 교육비 공제 효과가 없을 수도 있습니다.` },
  { q: '연말정산 때 교육비를 빠뜨렸다면 어떻게 하나요?', a: '5월 종합소득세 신고 기간에 홈택스에서 연말정산 내용을 불러와 빠진 교육비를 더하면 되고, 그 뒤에도 연말정산 세액 납부기한(보통 다음 해 3월 10일)부터 5년 안에 경정청구로 돌려받을 수 있습니다(국세기본법 제45조의2). 학원 교육비 납입증명서 같은 증빙을 함께 내세요.' },
]

const sources = [
  { label: '소득세법 제59조의4 (특별세액공제 — 교육비 15%, 1명당 300만·900만원 한도, 2026년 초등 1·2학년 예체능 학원비 신설·소득요건 폐지)', url: 'https://www.law.go.kr/법령/소득세법/제59조의4' },
  { label: '소득세법 시행령 제118조의6 (교육비 범위 — 교복 50만원·체험학습 30만원, 학원·체육시설 월 단위·주 1회 이상)', url: 'https://www.law.go.kr/법령/소득세법시행령/제118조의6' },
  { label: '소득세법 시행령 제216조의3 (간소화 자료 제출 대상 — 학원·체육시설 제외)', url: 'https://www.law.go.kr/법령/소득세법시행령/제216조의3' },
  { label: '조세특례제한법 시행령 제121조의2 (신용카드 사용액에서 빼는 학교 공납금)', url: 'https://www.law.go.kr/법령/조세특례제한법시행령/제121조의2' },
  { label: '국세기본법 제45조의2 (경정 등의 청구 — 5년)', url: 'https://www.law.go.kr/법령/국세기본법/제45조의2' },
]

export default function EducationTaxCreditPage() {
  const jsonLd = {
    '@context': 'https://schema.org', '@type': 'WebApplication',
    name: '교육비 세액공제 계산기',
    description: '가족별 교육비에 1명당 공제 한도를 적용해 교육비 세액공제액과 실제로 줄어드는 세금, 남은 한도를 계산하는 도구.',
    url: 'https://toolhub.ai.kr/education-tax-credit/',
    applicationCategory: 'FinanceApplication', operatingSystem: 'Any', browserRequirements: 'JavaScript',
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'KRW' },
    featureList: [`${TAX_YEAR}년 귀속 교육비 세액공제`, '가족별 입력(본인·취학 전·초등 1·2학년·초중고·대학생·장애인 특수교육)', '1명당 한도(300만·900만원)와 한도 초과분', `${TAX_YEAR}년 신설 초등 1·2학년 예체능 학원비`, '교복 50만원·현장체험학습 30만원 한도', '줄어드는 세금(지방소득세·결정세액 한도·표준세액공제 반영)', '남은 한도를 채우면 더 줄어드는 세금', '공제 대상·제외 교육비 표', '연말정산 계산기로 이어서 계산', '결과 공유 링크·이미지'],
  }

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <div className="min-h-screen py-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <I18nWrapper>
            <EducationTaxCreditCalculator />
            <ToolFaq items={faqs} />
            <div className="mt-8">
              <RelatedTools />
            </div>
          </I18nWrapper>
        </div>
      </div>
      <section className="max-w-4xl mx-auto px-4 pb-12">
        <div className="mt-12 border-t border-line pt-8">
          <h2 className="text-xl font-bold text-fg mb-4">교육비 세액공제 계산기란?</h2>
          <p className="text-body leading-relaxed mb-6">
            교육비 세액공제 계산기는 본인과 가족이 한 해 동안 낸 교육비를 사람별로 넣으면, 사람마다 다른 공제 한도를 적용해 연말정산에서 받을 교육비 세액공제액과 그만큼 실제로 줄어드는 세금을 계산하는 도구입니다. 교육비는 낸 금액의 15%가 공제되지만 취학 전 아동과 초·중·고등학생은 1명당 300만원, 대학생은 900만원까지만 인정되고, 교복은 50만원·현장체험학습은 30만원까지만 들어갑니다. 공제액이 낼 세금보다 크면 남는 공제는 사라지므로, 이 계산기는 결정세액 한도와 표준세액공제(13만원) 선택까지 반영해 &lsquo;진짜로 돌려받는 금액&rsquo;과 한도가 남은 가족을 보여 줍니다.
          </p>

          <h3 className="text-lg font-semibold text-fg mb-3">{TAX_YEAR}년에 달라진 점</h3>
          <ul className="list-disc list-inside space-y-2 text-body mb-6">
            <li>{TAX_YEAR}년 1월 1일 이후 낸 것부터 초등 1·2학년(또는 만 9세 미만) 자녀의 예능 학원·체육시설 수강료가 공제됩니다. 전에는 취학 전 아동의 학원비만 공제됐습니다.</li>
            <li>교육비 공제 대상 부양가족의 소득 요건이 없어졌습니다. 대학생 자녀가 아르바이트로 소득이 있어도 부모가 낸 등록금을 공제받을 수 있습니다.</li>
          </ul>

          <h3 className="text-lg font-semibold text-fg mb-3">예시 ({TAX_YEAR}년 귀속, 다른 공제가 없다고 가정)</h3>
          <ul className="list-disc list-inside space-y-3 text-body mb-6">
            <li>
              <strong>연봉 5,000만원, 초등 2학년 피아노 월 15만원 + 태권도 월 15만원:</strong> 연 {man(D.spent)} 중 300만원까지 인정(한도 초과 {man(D.over)}) → 공제 {won(D.credit)}, 세금 {won(D.saving)} 감소 (지방소득세 포함)
            </li>
            <li>
              <strong>연봉 6,000만원, 중학생 방과후·급식 180만원 + 교복 60만원 + 수학여행 40만원:</strong> 교복은 50만원, 수학여행은 30만원까지라 공제 대상 {man(M.eligible)} → 공제 {won(M.credit)}, 세금 {won(M.saving)} 감소
            </li>
            <li>
              <strong>연봉 8,000만원, 대학생 자녀 등록금 1,000만원:</strong> 900만원 한도 → 공제 {won(U.credit)}, 세금 {won(U.saving)} 감소
            </li>
          </ul>

          <p className="text-sm text-muted mb-6">
            전체 환급액은 <a href="/year-end-tax/" className="text-primary hover:underline">연말정산 계산기</a>, 카드로 낸 학원비의 카드 공제는 <a href="/card-deduction/" className="text-primary hover:underline">신용카드 소득공제 계산기</a>, 가족 의료비는 <a href="/medical-tax-credit/" className="text-primary hover:underline">의료비 세액공제 계산기</a>에서 계산할 수 있습니다.
          </p>

          <h3 className="text-lg font-semibold text-fg mb-3">근거 법령·출처</h3>
          <ul className="space-y-1.5 text-sm text-sub">
            {sources.map((s) => (
              <li key={s.url}>
                <a href={s.url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">{s.label}</a>
              </li>
            ))}
          </ul>
          <p className="text-xs text-muted mt-3">2026년 11월 현재 시행 중인 법령 기준입니다(소득세법 2025년 12월 23일 개정, 시행령 2026년 2월 27일 개정 반영). 국회 심의 중인 세법 개정안은 반영하지 않았습니다.</p>
        </div>
      </section>
    </>
  )
}
