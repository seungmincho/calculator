import { Metadata } from 'next'
import ReceiptGenerator from '@/components/ReceiptGenerator'
import I18nWrapper from '@/components/I18nWrapper'
import RelatedTools from '@/components/RelatedTools'

export const metadata: Metadata = {
  title: '영수증 양식 작성기 - 간이 영수증 무료 PDF | 툴허브',
  description: '영수증 양식을 빈칸만 채워 바로 만드세요. 월세·회비·중고거래·개인 간 돈 거래 간이 영수증, 금액 한글 표기, 품목·부가세 계산, 공급자·공급받는자 보관용 2부 절취선, 도장 자동 생성, A4 PDF·인쇄까지 무료.',
  keywords: '영수증, 영수증 양식, 간이영수증, 간이 영수증 양식, 영수증 서식, 월세 영수증, 회비 영수증, 개인 영수증, 영수증 작성법, 영수증 PDF, 현금 영수증 양식',
  openGraph: {
    title: '영수증 양식 작성기 | 툴허브',
    description: '빈칸만 채우면 완성되는 간이 영수증. 금액 한글 표기·2부 절취선·PDF 출력.',
    url: 'https://toolhub.ai.kr/receipt-generator',
    siteName: '툴허브',
    locale: 'ko_KR',
    type: 'website',
    images: [{ url: 'https://toolhub.ai.kr/og/receipt-generator.png', width: 1200, height: 630, alt: '영수증 양식 작성기' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: '영수증 양식 작성기',
    description: '빈칸만 채우면 완성되는 간이 영수증 PDF',
    images: ['https://toolhub.ai.kr/og/receipt-generator.png'],
  },
  alternates: {
    canonical: 'https://toolhub.ai.kr/receipt-generator/',
  },
}

// 컴포넌트 가이드 FAQ(messages receiptGenerator.guide.faq)와 같은 내용 — 화면에 보이는 FAQ만 구조화 데이터로
const faqs = [
  {
    q: '영수증은 정해진 양식이 있나요?',
    a: '없습니다. 받은 금액, 명목, 날짜, 돈을 낸 사람, 돈을 받은 사람의 서명이나 날인이 있으면 영수증으로 쓸 수 있습니다. 금액은 한글과 숫자를 함께 적고, 2부를 만들어 양쪽이 하나씩 보관하는 것이 좋습니다.',
  },
  {
    q: '간이영수증은 얼마까지 경비로 인정되나요?',
    a: '사업자의 지출은 건당 3만원(부가세 포함) 이하라면 간이영수증으로도 증빙이 됩니다. 3만원을 넘으면 세금계산서, 카드 매출전표, 현금영수증 같은 적격증빙을 받아야 하고, 간이영수증만 있으면 거래금액의 2%가 증빙불비 가산세로 붙습니다.',
  },
  {
    q: '개인끼리 거래할 때도 영수증을 써야 하나요?',
    a: '의무는 아니지만 써 두는 것이 안전합니다. 민법 제474조에 따라 돈을 낸 사람은 받은 사람에게 영수증을 요구할 수 있고, 현금으로 주고받았다면 영수증이 사실상 유일한 증거가 됩니다.',
  },
  {
    q: '현금영수증 대신 이 영수증을 줘도 되나요?',
    a: '안 됩니다. 현금영수증 의무발행업종 사업자는 건당 10만원 이상 현금·계좌이체 거래에 현금영수증을 발급해야 하며, 간이영수증으로 대신할 수 없습니다. 발급하지 않으면 미발급액의 20%가 가산세로 부과됩니다.',
  },
  {
    q: '개인이 영수증에 부가세를 따로 받아도 되나요?',
    a: '부가세는 사업자등록을 한 과세사업자가 거래 상대방에게서 받아 신고·납부하는 세금입니다. 사업자가 아닌 개인 간 거래라면 부가세를 붙이지 말고 금액만 적으세요.',
  },
  {
    q: '영수증과 차용증은 무엇이 다른가요?',
    a: '영수증은 돈을 받았다는 사실만 확인합니다. 빌려준 돈이라면 갚을 날짜와 이자 같은 조건을 적은 차용증을 따로 작성해야 나중에 돌려받을 근거가 됩니다.',
  },
]

export default function ReceiptGeneratorPage() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: '영수증 양식 작성기',
    description: '간이 영수증 양식을 작성하고 A4 PDF로 저장·인쇄합니다. 금액 한글 표기, 품목·부가세 계산, 2부 절취선.',
    url: 'https://toolhub.ai.kr/receipt-generator',
    applicationCategory: 'BusinessApplication',
    operatingSystem: 'Any',
    browserRequirements: 'JavaScript',
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'KRW' },
    featureList: [
      '용도별 영수증 문구 (물품·월세·회비·금전 수령·중고거래·레슨비)',
      '금액 한글·숫자 병기 (금 일십만원정)',
      '품목별 수량·단가·금액, 부가세 포함/별도/없음',
      '공급자·공급받는자 보관용 2부 절취선 인쇄',
      '사업자등록번호 검증',
      '현금영수증 의무발행·3만원 증빙 기준 안내',
      '이름 도장 자동 생성·도장 이미지',
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
            <ReceiptGenerator />
            <div className="mt-8">
              <RelatedTools />
            </div>
          </I18nWrapper>
        </div>
      </div>
      {/* SEO 콘텐츠 */}
      <section className="max-w-4xl mx-auto px-4 pb-12">
        <div className="mt-12 border-t border-line pt-8">
          <h2 className="text-xl font-bold text-fg mb-4">영수증 작성기란?</h2>
          <p className="text-body leading-relaxed mb-6">
            영수증은 돈을 받은 사람이 받은 금액과 명목을 확인해 주는 문서입니다. 이 작성기는 용도(물품·월세·회비·중고거래·레슨비 등)를 고르고
            금액과 이름만 입력하면 &lsquo;위 금액을 ○○ 명목으로 정히 영수합니다&rsquo; 문구가 들어간 간이 영수증을 A4 양식으로 바로 만들어 줍니다.
            금액은 &lsquo;금 일십만원정 (₩100,000)&rsquo;처럼 한글과 숫자를 함께 적고, 공급자 보관용과 공급받는자 보관용 2부를 절취선으로 나눠
            한 장에 인쇄할 수 있습니다. 입력한 내용은 내 브라우저에만 저장됩니다.
          </p>
          <h3 className="text-lg font-semibold text-fg mb-3">영수증에 꼭 들어가야 할 것</h3>
          <ul className="list-disc list-inside space-y-2 text-body">
            <li><strong>금액:</strong> 한글과 숫자를 함께 적어 고쳐 쓰기 어렵게 합니다.</li>
            <li><strong>명목:</strong> &lsquo;10월분 월세·관리비&rsquo;처럼 무엇에 대한 돈인지 구체적으로 적습니다.</li>
            <li><strong>날짜와 당사자:</strong> 돈을 받은 날, 돈을 낸 사람(귀하), 돈을 받은 사람의 이름과 연락처.</li>
            <li><strong>서명·날인:</strong> 돈을 받은 사람이 서명하거나 도장을 찍습니다.</li>
            <li><strong>세금 증빙 구분:</strong> 사업자 경비는 건당 3만원 초과 시 세금계산서·카드전표·현금영수증이 필요하며, 간이 영수증으로 대신할 수 없습니다.</li>
          </ul>
        </div>
      </section>
    </>
  )
}
