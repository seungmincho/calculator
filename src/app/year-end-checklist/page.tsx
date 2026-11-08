import { Metadata } from 'next'
import YearEndChecklist from '@/components/YearEndChecklist'
import I18nWrapper from '@/components/I18nWrapper'
import RelatedTools from '@/components/RelatedTools'
import ToolFaq from '@/components/ToolFaq'
import { TAX_YEAR } from '@/utils/yearEndTax'
import { NTS_URL } from '@/utils/yearEndChecklist'

const NEXT = TAX_YEAR + 1

export const metadata: Metadata = {
  title: '연말정산 준비물 체크리스트 2026 - 서류·일정 | 툴허브',
  description: `${TAX_YEAR}년 귀속 연말정산 준비물과 일정을 내 상황에 맞춰 체크합니다. 12월 31일까지 할 일, 1월 15일 간소화 서비스 이후 할 일, 간소화에 안 나오는 서류와 회사 제출까지.`,
  keywords: '연말정산 준비물, 연말정산 서류, 연말정산 일정, 간소화 서비스, 연말정산 간소화 서비스 일정, 연말정산 체크리스트, 연말정산 제출 서류, 간소화 안 나오는 서류, 안경 영수증 연말정산, 종교단체 기부금 영수증, 월세 세액공제 서류, 부양가족 자료제공 동의, 연말정산 경정청구',
  openGraph: {
    title: '연말정산 준비물 체크리스트 2026 - 서류·일정 | 툴허브',
    description: '12월 31일 마감부터 1월 15일 간소화, 회사 제출까지 내 상황에 맞는 할 일과 서류를 체크.',
    url: 'https://toolhub.ai.kr/year-end-checklist/',
    siteName: '툴허브', locale: 'ko_KR', type: 'website',
    images: [{ url: 'https://toolhub.ai.kr/og/year-end-checklist.png', width: 1200, height: 630, alt: '연말정산 준비물 체크리스트 2026' }],
  },
  twitter: { card: 'summary_large_image', title: '연말정산 준비물 체크리스트 | 툴허브', description: '12/31 마감·1/15 간소화·회사 제출까지 할 일과 서류', images: ['https://toolhub.ai.kr/og/year-end-checklist.png'] },
  alternates: { canonical: 'https://toolhub.ai.kr/year-end-checklist/' },
}

const faqs = [
  { q: '연말정산 간소화 서비스는 언제 열리나요?', a: `국세청은 해마다 1월 15일 홈택스·손택스에 연말정산 간소화 서비스를 엽니다. 2025년 귀속(2026년 1월)에는 1월 15일 개통 후 1월 15~18일 병원·기관의 추가·수정 자료를 받아 1월 20일부터 최종 확정 자료를 제공했고, 회사가 일괄제공 서비스를 신청했으면 1월 17일 또는 20일부터 회사로 자료를 보냈습니다. ${TAX_YEAR}년 귀속 일정은 아직 공지 전이라, 예년대로라면 ${NEXT}년 1월 15일 개통입니다. 간소화 화면에 안 보이는 의료비는 예년 기준 1월 15~17일 '조회되지 않는 의료비 신고센터'에 신고하면 확정 자료에 반영됩니다.` },
  { q: '간소화 서비스에 안 나오는 서류는 무엇인가요?', a: '제출 의무가 없는 곳의 자료는 간소화에 나오지 않을 수 있습니다(소득세법 시행령 제216조의3). 국세청은 시력교정용 안경·콘택트렌즈, 취학 전 아동의 학원·체육시설 교육비, 교복 구입비, 전자기부금 영수증이 아닌 기부금(종교단체 등), 카드로 결제한 월세를 조회되지 않을 수 있는 자료로 안내합니다. 2026년 지급분부터 공제되는 초등 1·2학년 예체능 학원비도 학원에 제출 의무가 없어 납입증명서를 받아야 할 수 있습니다. 월세는 공공임대를 빼면 대부분 임대차계약서 사본·주민등록표등본·이체 내역을 직접 냅니다. 장애인복지법에 따른 장애인·국가유공자 증명은 간소화에 나오지만, 항시 치료가 필요한 중증환자는 병원에서 장애인증명서를 받아야 합니다.' },
  { q: '회사 제출 마감은 언제인가요?', a: `법으로 정한 근로자 제출일은 없고 회사가 정합니다. 회사는 다음 해 2월분 급여를 줄 때 연말정산을 하므로(소득세법 제137조제1항) 보통 1월 중순~2월 초에 서류를 받습니다. 회사 공지를 확인하고 간소화 PDF와 간소화에 없는 서류를 함께 내세요. 정산 결과는 2월 급여에서 환급되거나 추가로 떼이며, 더 낼 세금이 10만원을 넘으면 2~4월 급여에서 나눠 내도록 신청할 수 있습니다(같은 조 제4항).` },
  { q: '연말정산을 놓치거나 공제를 빠뜨렸으면 어떻게 하나요?', a: `${NEXT}년 5월 종합소득세 확정신고 기간에 빠뜨린 공제를 넣어 신고하거나, 연말정산 세액 납부기한(다음 해 3월 10일)이 지난 뒤 5년 안에 경정청구를 하면 됩니다(국세기본법 제45조의2제5항). 홈택스 [세금신고] → [종합소득세 신고] → [근로소득 신고] → [경정청구]에서 할 수 있고, 회사에 다시 연말정산을 요청할 필요는 없습니다.` },
  { q: '맞벌이 부부는 공제를 어떻게 나누나요?', a: '같은 가족의 인적공제(기본공제)는 부부 중 한 사람만 받을 수 있고, 그 가족을 위해 쓴 의료비·교육비 공제와 자녀세액공제도 대개 기본공제를 받는 사람 쪽에서 받습니다. 인적공제는 소득공제라 세율이 높은(소득이 많은) 쪽에 몰면 줄어드는 세금이 큰 경우가 많지만, 의료비는 총급여 3%, 카드 사용액은 총급여 25%를 넘어야 공제되므로 총급여가 낮은 쪽이 문턱을 넘기 쉽습니다. 소득이 있는 배우자의 카드 사용액은 합칠 수 없습니다. 아래 부양가족 공제 판정·카드·의료비 계산기로 양쪽을 비교해 보세요.' },
  { q: '12월 31일까지 꼭 해야 하는 일은 무엇인가요?', a: `연금저축·IRP 납입, 기부금, 의료비·교육비 결제, 카드 사용액은 모두 실제로 낸 날이 속한 해에 공제되므로 ${TAX_YEAR}년분은 12월 31일까지 내야 합니다. 월세 세액공제는 과세기간 종료일(12월 31일) 현재 무주택 세대주여야 하고(조세특례제한법 제95조의2), 혼인세액공제 50만원은 2026년 12월 31일까지 혼인신고한 사람이 신고한 해에 받습니다(조세특례제한법 제92조). 주택청약종합저축은 총급여 7천만원 이하 무주택 세대주가 연 300만원까지 40%를 공제받고, 다음 해 2월 말까지 가입 은행에 무주택확인서를 내야 합니다(조세특례제한법 제87조).` },
  { q: '체크한 내용은 어디에 저장되나요?', a: '체크 상태와 고른 상황은 지금 쓰는 브라우저(localStorage)에만 저장되고 서버로 보내지 않습니다. 같은 브라우저로 다시 들어오면 이어서 볼 수 있고, 귀속연도가 바뀌면 새 목록으로 시작합니다. 주소창 링크에는 고른 상황만 들어가므로 링크를 보내도 체크 상태는 전달되지 않습니다. 시크릿 모드나 저장이 막힌 브라우저에서는 페이지를 닫으면 사라집니다.' },
]

const sources = [
  { label: '국세청 보도자료 (2026.1.14) — 「연말정산 간소화 서비스」 1월 15일 개통 (2025년 귀속 일정·간소화 미제공 자료)', url: NTS_URL },
  { label: '소득세법 제137조 (근로소득세액의 연말정산 — 2월분 급여, 분납)', url: 'https://www.law.go.kr/법령/소득세법/제137조' },
  { label: '소득세법 시행령 제216조의3 (간소화 자료 제출 대상)', url: 'https://www.law.go.kr/법령/소득세법시행령/제216조의3' },
  { label: '조세특례제한법 제92조 (혼인에 대한 세액공제 — 2026.12.31 이전 혼인신고)', url: 'https://www.law.go.kr/법령/조세특례제한법/제92조' },
  { label: '조세특례제한법 제95조의2 (월세액 세액공제 — 과세기간 종료일 현재 무주택 세대주)', url: 'https://www.law.go.kr/법령/조세특례제한법/제95조의2' },
  { label: '조세특례제한법 제87조 (주택청약종합저축 소득공제 — 무주택확인서)', url: 'https://www.law.go.kr/법령/조세특례제한법/제87조' },
  { label: '국세기본법 제45조의2 (경정 등의 청구 — 5년)', url: 'https://www.law.go.kr/법령/국세기본법/제45조의2' },
]

const link = 'text-primary hover:underline'

export default function YearEndChecklistPage() {
  const jsonLd = {
    '@context': 'https://schema.org', '@type': 'WebApplication',
    name: '연말정산 준비물 체크리스트',
    description: '12월 31일 마감부터 1월 15일 간소화 서비스, 회사 제출과 경정청구까지 내 상황에 맞는 연말정산 할 일과 간소화에 안 나오는 서류를 체크하는 도구.',
    url: 'https://toolhub.ai.kr/year-end-checklist/',
    applicationCategory: 'FinanceApplication', operatingSystem: 'Any', browserRequirements: 'JavaScript',
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'KRW' },
    featureList: [`${TAX_YEAR}년 귀속 연말정산 할 일 체크리스트`, '내 상황(월세·자녀·부모님·맞벌이·종교 기부·안경·장애인·중소기업 청년·결혼·청약)별 항목', '12월 31일·1월 15일 D-day', '간소화 서비스에 안 나오는 서류 목록', '진행률과 브라우저 저장(다시 와도 이어서)', '캘린더(.ics) 일정 추가', '항목별 계산기 연결'],
  }

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <div className="min-h-screen py-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <I18nWrapper>
            <YearEndChecklist />
            <ToolFaq items={faqs} />
            <div className="mt-8">
              <RelatedTools />
            </div>
          </I18nWrapper>
        </div>
      </div>
      <section className="max-w-4xl mx-auto px-4 pb-12">
        <div className="mt-12 border-t border-line pt-8">
          <h2 className="text-xl font-bold text-fg mb-4">연말정산 준비물 체크리스트란?</h2>
          <p className="text-body leading-relaxed mb-6">
            연말정산은 12월 31일까지 낸 돈으로 공제가 정해지고, 다음 해 1월 15일 간소화 서비스가 열린 뒤 서류를 모아 회사에 내면 2월 급여에서 정산됩니다. 이 체크리스트는 그 사이에 해야 할 일을 마감 순서대로 묶고, 월세·자녀·부모님 부양·맞벌이·종교단체 기부처럼 내 상황을 고르면 해당 항목만 보여 줍니다. 체크한 내용은 브라우저에 저장돼 12월과 1월에 다시 와도 이어서 볼 수 있습니다.
          </p>

          <h3 className="text-lg font-semibold text-fg mb-3">{TAX_YEAR}년 귀속 연말정산 일정</h3>
          <ul className="list-disc list-inside space-y-2 text-body mb-2">
            <li><strong>{TAX_YEAR}년 12월 31일:</strong> 연금저축·IRP 납입, 기부, 의료비·교육비 결제, 카드 사용, 혼인신고의 마감이자 월세 공제의 무주택 세대주 판정일</li>
            <li><strong>{NEXT}년 1월 15일:</strong> 홈택스·손택스 연말정산 간소화 서비스 개통 (예년 기준)</li>
            <li><strong>{NEXT}년 1월 20일:</strong> 병원·기관이 고친 자료까지 반영한 최종 확정 자료 제공 (예년 기준)</li>
            <li><strong>1월 중순~2월 초:</strong> 회사가 정한 서류 제출 마감 (회사마다 다름)</li>
            <li><strong>{NEXT}년 2월 급여:</strong> 환급 또는 추가 납부</li>
            <li><strong>{NEXT}년 5월:</strong> 빠뜨린 공제는 종합소득세 신고, 그 뒤로는 5년 안에 경정청구</li>
          </ul>
          <p className="text-sm text-muted mb-6">
            &lsquo;예년 기준&rsquo;은 국세청이 2025년 귀속 연말정산 때 안내한 일정입니다. {TAX_YEAR}년 귀속 일정은 국세청 공지가 나오면 바뀔 수 있습니다.
          </p>

          <h3 className="text-lg font-semibold text-fg mb-3">항목별로 자세히 계산하기</h3>
          <p className="text-body leading-relaxed mb-6">
            전체 환급액은 <a href="/year-end-tax/" className={link}>연말정산 계산기</a>, 12월에 더 넣을 금액은 <a href="/pension-tax-credit/" className={link}>연금저축·IRP 세액공제</a>·<a href="/card-deduction/" className={link}>신용카드 소득공제</a>, 맞벌이 부부가 누구에게 공제를 몰지는 <a href="/dependent-deduction/" className={link}>부양가족 공제 판정</a>과 <a href="/medical-tax-credit/" className={link}>의료비 세액공제</a>, 서류가 따로 필요한 공제는 <a href="/education-tax-credit/" className={link}>교육비</a>·<a href="/donation-tax-credit/" className={link}>기부금</a>·<a href="/rent-tax-credit/" className={link}>월세 세액공제</a> 계산기에서 확인할 수 있습니다.
          </p>

          <h3 className="text-lg font-semibold text-fg mb-3">근거 법령·출처</h3>
          <ul className="space-y-1.5 text-sm text-sub">
            {sources.map((s) => (
              <li key={s.url}>
                <a href={s.url} target="_blank" rel="noopener noreferrer" className={link}>{s.label}</a>
              </li>
            ))}
          </ul>
          <p className="text-xs text-muted mt-3">2026년 11월 현재 시행 중인 법령과 국세청 안내 기준입니다. 국회 심의 중인 세법 개정안은 반영하지 않았습니다.</p>
        </div>
      </section>
    </>
  )
}
