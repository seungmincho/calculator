import { Metadata } from 'next'
import PaySlip from '@/components/PaySlip'
import I18nWrapper from '@/components/I18nWrapper'
import RelatedTools from '@/components/RelatedTools'

export const metadata: Metadata = {
  title: '급여명세서 양식 작성기 - 4대보험 자동 계산 | 툴허브',
  description: '임금명세서 법정 기재사항을 갖춘 급여명세서 양식을 무료로 만드세요. 연장·야간·휴일수당 계산방법, 4대보험·소득세(2026 간이세액표) 자동 공제, 식대 비과세, 최저임금 확인, A4 PDF·인쇄까지.',
  keywords: '급여명세서, 급여명세서 양식, 임금명세서, 임금명세서 양식, 월급명세서, 급여명세서 작성, 임금명세서 교부의무, 알바 급여명세서, 5인미만 급여명세서, 간이세액표',
  openGraph: {
    title: '급여명세서 양식 작성기 | 툴허브',
    description: '법정 기재사항을 갖춘 임금명세서. 4대보험·소득세 자동 공제, 연장·야간·휴일수당 계산방법, PDF 출력.',
    url: 'https://toolhub.ai.kr/pay-slip',
    siteName: '툴허브',
    locale: 'ko_KR',
    type: 'website',
    images: [{ url: 'https://toolhub.ai.kr/og/pay-slip.png', width: 1200, height: 630, alt: '급여명세서 양식 작성기' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: '급여명세서 양식 작성기',
    description: '4대보험·소득세 자동 계산 임금명세서 PDF',
    images: ['https://toolhub.ai.kr/og/pay-slip.png'],
  },
  alternates: {
    canonical: 'https://toolhub.ai.kr/pay-slip/',
  },
}

// 컴포넌트 가이드 FAQ(messages paySlip.guide.faq)와 같은 내용 — 화면에 보이는 FAQ만 구조화 데이터로
const faqs = [
  { q: "임금명세서를 안 주면 어떻게 되나요?", a: "2021년 11월 19일부터 임금을 줄 때마다 임금명세서를 서면이나 전자문서로 줘야 합니다(근로기준법 제48조 제2항). 주지 않으면 500만원 이하 과태료 대상이고, 시행령 별표 7 기준으로 근로자 1인당 1차 30만원, 2차 50만원, 3차 이상 100만원입니다. 기재사항을 빠뜨리거나 사실과 다르게 적어도 1차 20만원부터 부과됩니다." },
  { q: "5인 미만 사업장이나 아르바이트도 줘야 하나요?", a: "네. 임금명세서 교부 의무는 상시 근로자 수와 관계없이 근로자를 1명이라도 쓰는 모든 사업장에 적용되고, 아르바이트·단시간·일용 근로자도 포함됩니다. 다만 5인 미만 사업장은 연장·야간·휴일근로 가산수당이 적용되지 않아 실제 일한 시간만큼 1배로 계산합니다." },
  { q: "카카오톡이나 이메일로 보내도 되나요?", a: "됩니다. 임금명세서는 전자문서로 줄 수 있어서 이메일, 문자, 카카오톡, 사내 전산망으로 보내도 됩니다. 이 작성기에서 PDF로 저장해 보내면 되고, 보낸 기록을 남겨 두면 교부 사실을 증명하기 쉽습니다." },
  { q: "꼭 적어야 하는 항목은 무엇인가요?", a: "근로기준법 시행령 제27조의2에 따라 성명과 생년월일 또는 사원번호, 지급일, 임금 총액, 기본급·수당·상여금 등 항목별 금액, 출근일수·근로시간에 따라 달라지는 항목의 계산방법(연장·야간·휴일근로 시간수 포함), 공제 항목별 금액과 총액을 적어야 합니다." },
  { q: "식대 20만원은 4대보험에서도 빠지나요?", a: "비과세 요건을 갖춘 식대(현물 식사를 따로 받지 않는 경우) 월 20만원까지는 소득세뿐 아니라 국민연금·건강보험·고용보험 보수에서도 빠집니다. 20만원을 넘는 부분은 과세 급여로 보고 세금과 보험료를 계산합니다. 자가운전보조금, 6세 이하 자녀 출산·보육수당도 각각 월 20만원까지 비과세입니다." },
  { q: "소득세는 어떻게 계산되나요?", a: "국세청 근로소득 간이세액표(소득세법 시행령 별표 2, 2026년 2월 개정)에서 비과세를 뺀 월급여와 공제대상가족 수로 찾은 금액이고, 8~20세 자녀가 있으면 자녀 1명 20,830원, 2명 45,830원을 뺍니다. 근로자가 80%·120%를 고를 수 있고, 지방소득세는 소득세의 10%입니다. 상여가 있는 달 등은 회사 방식에 맞게 금액을 직접 고칠 수 있습니다." },
]

export default function PaySlipPage() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: '급여명세서 양식 작성기',
    description: '근로기준법 시행령 제27조의2 기재사항을 갖춘 임금명세서를 작성하고 A4 PDF로 저장·인쇄합니다. 4대보험·소득세 자동 공제.',
    url: 'https://toolhub.ai.kr/pay-slip',
    applicationCategory: 'BusinessApplication',
    operatingSystem: 'Any',
    browserRequirements: 'JavaScript',
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'KRW' },
    featureList: [
      '임금명세서 법정 기재사항 자동 구성',
      '연장·야간·휴일수당 계산방법과 시간수 표기',
      '5인 미만 사업장 가산수당 미적용 옵션',
      '국민연금·건강·장기요양·고용보험 2026 요율 자동 공제',
      '근로소득 간이세액표(2026.2.27 개정) 소득세·지방소득세',
      '식대·자가운전보조금·보육수당 비과세 한도 확인',
      '최저임금 2026 미달 검사',
      '3.3% 사업소득 모드',
      'A4 PDF 저장·인쇄',
    ],
  }
  const faqJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map((f) => ({
      '@type': 'Question',
      name: f.q,
      acceptedAnswer: { '@type': 'Answer', text: f.a },
    })),
  }

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />
      <div className="min-h-screen py-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <I18nWrapper>
            <PaySlip />
            <div className="mt-8">
              <RelatedTools />
            </div>
          </I18nWrapper>
        </div>
      </div>
      {/* SEO 콘텐츠 */}
      <section className="max-w-4xl mx-auto px-4 pb-12">
        <div className="mt-12 border-t border-line pt-8">
          <h2 className="text-xl font-bold text-fg mb-4">급여명세서 작성기란?</h2>
          <p className="text-body leading-relaxed mb-6">
            2021년 11월 19일부터 사업주는 임금을 줄 때마다 근로자에게 임금명세서를 줘야 합니다. 5인 미만 사업장과 아르바이트도 예외가 아니고,
            주지 않으면 500만원 이하 과태료 대상입니다. 이 작성기는 기본급과 근로시간만 넣으면 연장·야간·휴일수당과 그 계산방법,
            국민연금·건강보험·장기요양·고용보험, 근로소득 간이세액표에 따른 소득세까지 2026년 기준으로 채워 A4 임금명세서를 만들어 줍니다.
            입력한 내용은 내 브라우저에만 저장됩니다.
          </p>
          <h3 className="text-lg font-semibold text-fg mb-3">임금명세서에 꼭 들어가야 하는 것</h3>
          <ul className="list-disc list-inside space-y-2 text-body">
            <li><strong>근로자 정보:</strong> 성명과 생년월일 또는 사원번호.</li>
            <li><strong>지급일과 총액:</strong> 임금 지급일, 공제 전 임금 총액.</li>
            <li><strong>항목별 금액:</strong> 기본급, 각종 수당, 상여금, 성과금을 항목별로.</li>
            <li><strong>계산방법:</strong> 연장·야간·휴일수당처럼 근로시간에 따라 달라지는 항목은 시간수와 산출식까지.</li>
            <li><strong>공제내역:</strong> 4대보험, 소득세·지방소득세 등 공제 항목별 금액과 총액.</li>
          </ul>
        </div>
      </section>
    </>
  )
}
