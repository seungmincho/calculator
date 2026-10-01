import { Metadata } from 'next'
import CertifiedLetter from '@/components/CertifiedLetter'
import I18nWrapper from '@/components/I18nWrapper'
import RelatedTools from '@/components/RelatedTools'

export const metadata: Metadata = {
  title: '내용증명 양식 작성기 - 쓰는법·보증금 반환 | 툴허브',
  description: '내용증명 양식을 목적만 골라 바로 만드세요. 전세 보증금 반환, 계약 해지·갱신 거절, 미지급 대금, 빌려준 돈, 임금체불, 하자 보수 초안 자동 작성, 이행 기한·갱신 거절 기간 검사, 우체국 요금 안내, A4 PDF·인쇄 무료.',
  keywords: '내용증명, 내용증명 양식, 내용증명 쓰는법, 내용증명 보내는법, 보증금 반환 내용증명, 전세 내용증명, 임금체불 내용증명, 대여금 내용증명, 계약해지 내용증명, 내용증명 비용',
  openGraph: {
    title: '내용증명 양식 작성기 | 툴허브',
    description: '목적만 고르면 완성되는 내용증명. 보증금 반환·대금 청구·임금체불 초안, 기한 검사, PDF 출력.',
    url: 'https://toolhub.ai.kr/certified-letter',
    siteName: '툴허브',
    locale: 'ko_KR',
    type: 'website',
    images: [{ url: 'https://toolhub.ai.kr/og/certified-letter.png', width: 1200, height: 630, alt: '내용증명 양식 작성기' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: '내용증명 양식 작성기',
    description: '목적만 고르면 완성되는 내용증명 PDF',
    images: ['https://toolhub.ai.kr/og/certified-letter.png'],
  },
  alternates: {
    canonical: 'https://toolhub.ai.kr/certified-letter/',
  },
}

// 컴포넌트 가이드 FAQ(messages certifiedLetter.guide.faq)와 같은 내용 — 화면에 보이는 FAQ만 구조화 데이터로
const faqs = [
  {
    q: '내용증명을 받고 무시하면 어떻게 되나요?',
    a: '내용증명 자체에는 강제력이 없어서 무시했다고 바로 불이익이 생기지는 않습니다. 다만 요구를 받은 사실과 날짜가 증거로 남고, 발신인은 이를 근거로 지급명령·소송·임차권등기명령 같은 다음 절차를 진행할 수 있습니다. 내용에 동의하지 않는다면 반박하는 내용증명을 보내 기록을 남기는 것이 좋습니다.',
  },
  {
    q: '내용증명을 보내면 소멸시효가 중단되나요?',
    a: "내용증명으로 이행을 요구하는 것은 민법상 '최고'에 해당합니다. 최고는 6개월 안에 재판상 청구, 지급명령, 압류·가압류·가처분 등을 해야 시효중단 효력이 생깁니다(민법 제174조). 시효 만료가 가깝다면 내용증명 후 6개월 안에 반드시 법적 절차를 진행하세요.",
  },
  {
    q: '전세 만료 전에 미리 보내도 되나요?',
    a: '네. 만료 전이라면 계약 갱신을 거절한다는 통지와 만료일에 보증금을 돌려 달라는 요구를 함께 보내면 됩니다. 임차인의 갱신 거절은 만료 2개월 전까지, 임대인은 6개월 전부터 2개월 전까지 상대에게 도달해야 합니다(주택임대차보호법 제6조). 만료 후에도 보증금을 받지 못한 채 이사해야 한다면 임차권등기명령을 먼저 신청하세요.',
  },
  {
    q: '내용증명 비용은 얼마인가요?',
    a: '2026년 우정사업본부 고시 기준으로 A4 1장이면 우편요금 500원, 등기 수수료 2,400원, 내용증명 수수료 1,300원을 더해 약 4,200원입니다. 1장을 넘으면 장당 650원이 추가되고, 도달일까지 증명하는 배달증명을 더하면 1,600원이 붙습니다.',
  },
  {
    q: '인터넷으로도 보낼 수 있나요?',
    a: '인터넷우체국에서 작성한 문서 파일을 올리면 우체국이 출력해 등기로 발송하고 등본을 보관합니다. 창구에 가지 않아도 되고, 접수 화면에서 최종 요금을 확인할 수 있습니다. 직접 접수할 때는 같은 문서 3부와 봉투를 들고 가까운 우체국 창구에 가면 됩니다.',
  },
  {
    q: '상대가 받지 않으면 어떻게 하나요?',
    a: '수취인 부재나 주소 불명으로 반송되면 반송된 우편물을 뜯지 말고 보관하세요. 정당한 이유 없이 수령을 거부했다면 도달한 것으로 볼 수 있다는 판례가 있습니다. 다른 주소로 다시 보내거나 문자·이메일로도 같은 내용을 보내 두고, 소송에서는 법원 송달 절차를 이용할 수 있습니다.',
  },
  {
    q: '변호사 이름으로 보내야 효과가 있나요?',
    a: '법적 효력은 본인 명의든 변호사 명의든 같습니다. 사실관계와 요구 사항, 기한, 불이행 시 조치를 분명히 적으면 본인 명의로도 충분합니다. 다툼이 크거나 금액이 큰 사건이라면 변호사 상담을 받아 보세요.',
  },
]

export default function CertifiedLetterPage() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: '내용증명 양식 작성기',
    description: '목적별 내용증명 초안을 자동으로 만들고 A4 PDF로 저장·인쇄합니다. 이행 기한·갱신 거절 기간 검사, 우체국 요금 안내.',
    url: 'https://toolhub.ai.kr/certified-letter',
    applicationCategory: 'BusinessApplication',
    operatingSystem: 'Any',
    browserRequirements: 'JavaScript',
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'KRW' },
    featureList: [
      '목적별 초안 7종 (보증금 반환·계약 해지·미지급 대금·대여금·임금체불·하자 보수·직접 작성)',
      '제목·본문 자동 작성, 모든 문장 편집',
      '이행 기한·수신인 주소 누락 검사',
      '주택임대차 갱신 거절 기간(만료 6개월~2개월 전) 확인',
      '소멸시효 임박 경고 (민법 제174조 최고)',
      '차용증 작성기 내용 불러오기',
      '우체국 내용증명 요금 계산 (2026년 고시)',
      'A4 여러 장 자동 나눔·PDF 저장·인쇄·이름 도장',
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
            <CertifiedLetter />
            <div className="mt-8">
              <RelatedTools />
            </div>
          </I18nWrapper>
        </div>
      </div>
      {/* SEO 콘텐츠 */}
      <section className="max-w-4xl mx-auto px-4 pb-12">
        <div className="mt-12 border-t border-line pt-8">
          <h2 className="text-xl font-bold text-fg mb-4">내용증명 작성기란?</h2>
          <p className="text-body leading-relaxed mb-6">
            내용증명은 어떤 내용의 문서를 언제 누구에게 보냈는지 우체국이 증명해 주는 등기우편입니다. 이 작성기는 보증금 반환, 계약 해지·갱신 거절,
            미지급 대금, 빌려준 돈, 임금체불, 하자 보수 중 목적을 고르고 계약 정보와 이행 기한만 입력하면 한국에서 통용되는 내용증명 문안을
            A4 양식으로 바로 만들어 줍니다. 이행 기한이 작성일보다 빠르거나 수신인 주소가 빠진 경우, 전세 만료 전 갱신 거절 기간을 놓친 경우를
            자동으로 알려 주고, 우체국 요금도 계산해 줍니다. 입력한 내용은 내 브라우저에만 저장됩니다.
          </p>
          <h3 className="text-lg font-semibold text-fg mb-3">내용증명 쓰는 법</h3>
          <ul className="list-disc list-inside space-y-2 text-body">
            <li><strong>당사자:</strong> 발신인과 수신인의 이름, 주소, 연락처. 수신인 주소가 없으면 우체국에서 접수할 수 없습니다.</li>
            <li><strong>사실관계:</strong> 계약일, 금액, 목적물 주소처럼 언제·무엇을·얼마나를 구체적으로 적습니다.</li>
            <li><strong>요구 사항과 기한:</strong> 무엇을 언제까지 해 달라는지 &lsquo;2026년 10월 15일까지&rsquo;처럼 날짜로 분명히 적습니다.</li>
            <li><strong>불이행 시 조치:</strong> 지급명령, 임차권등기명령, 민사소송 등 다음 절차를 예고합니다. 협박성 표현은 피하세요.</li>
            <li><strong>발송:</strong> 같은 문서 3부를 우체국 창구에 내거나 인터넷우체국으로 접수하고, 배달증명을 함께 신청하면 도달일까지 증명됩니다.</li>
          </ul>
        </div>
      </section>
    </>
  )
}
