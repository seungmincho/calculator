import { Metadata } from 'next'
import GreetingGenerator from '@/components/GreetingGenerator'
import I18nWrapper from '@/components/I18nWrapper'
import RelatedTools from '@/components/RelatedTools'

export const metadata: Metadata = {
  title: '인사말 생성기 - 연말·새해·명절 인사말 모음 | 툴허브',
  description: '연말·새해 인사말, 크리스마스 문구, 송년회 건배사, 수능 응원 문구, 설날·추석 인사말을 상황·받는 사람·말투만 골라 바로 만드세요. 거래처·상사·친구·부모님별 문구, 이름 넣기, 복사·카드 이미지 저장까지 무료.',
  keywords: '인사말, 연말 인사말, 새해 인사말, 신년 인사말, 설날 인사말, 추석 인사말, 거래처 인사말, 감사 인사말, 단체 문자 인사말, 연말 인사 문구, 명절 인사 문구, 퇴사 인사말, 생일 축하 문구, 크리스마스 문구, 크리스마스 인사말, 송년회 건배사, 회식 건배사, 건배사 삼행시, 수능 응원 문구, 수능 응원 메시지, 새해 인사말 2027, 정미년 인사말',
  openGraph: {
    title: '인사말 생성기 | 툴허브',
    description: '연말·새해·명절 인사말부터 크리스마스 문구, 송년회 건배사, 수능 응원까지 바로 만들기.',
    url: 'https://toolhub.ai.kr/greeting-generator',
    siteName: '툴허브',
    locale: 'ko_KR',
    type: 'website',
    images: [{ url: 'https://toolhub.ai.kr/og/greeting-generator.png', width: 1200, height: 630, alt: '인사말 생성기' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: '인사말 생성기',
    description: '연말·새해·명절 인사말을 관계와 말투에 맞춰 바로 만들기',
    images: ['https://toolhub.ai.kr/og/greeting-generator.png'],
  },
  alternates: {
    canonical: 'https://toolhub.ai.kr/greeting-generator/',
  },
}

// 컴포넌트 가이드 FAQ(messages greetingGenerator.guide.faq)와 같은 내용 — 화면에 보이는 FAQ만 구조화 데이터로
const faqs = [
  {
    q: '연말 인사는 언제 보내는 게 좋나요?',
    a: '12월 중순부터 말 사이가 무난합니다. 크리스마스 전후와 마지막 주에는 문자가 몰려 묻히기 쉬우니, 거래처라면 마지막 근무일 며칠 전인 12월 셋째 주쯤 보내는 편이 좋습니다. 새해 인사는 1월 1일부터 첫 주 안에 보내면 됩니다.',
  },
  {
    q: '설날·추석 인사는 언제 보내나요?',
    a: '연휴 시작 2~3일 전이 가장 좋습니다. 연휴 중에는 가족과 시간을 보내느라 확인이 늦고, 연휴 첫날 아침에는 문자가 한꺼번에 몰립니다. 거래처라면 연휴 직전 마지막 근무일 오전까지 보내세요.',
  },
  {
    q: '단체 문자처럼 보이지 않게 하려면 어떻게 하나요?',
    a: "받는 사람 이름을 첫머리에 넣고, 그 사람과 함께한 일을 한 문장만 덧붙이면 됩니다. 이 도구에 이름을 입력하면 문구 앞에 자동으로 붙고, 여러 명에게 보낼 때는 '다른 문구 보기'로 사람마다 다른 문구를 고를 수 있습니다.",
  },
  {
    q: '거래처에 카톡으로 인사해도 되나요?',
    a: '평소 카톡으로 업무 연락을 주고받았다면 괜찮습니다. 처음 인사하거나 격식이 필요한 관계라면 문자나 이메일이 무난하고, 이모지는 빼는 것이 안전합니다.',
  },
  {
    q: 'SMS와 LMS는 무엇이 다른가요?',
    a: "문자 발송 서비스 기준으로 SMS는 90바이트(한글 약 45자)까지 보내는 단문 문자이고, 이를 넘으면 장문 문자(LMS)로 바뀝니다. 이모지가 들어가도 단문으로 보내지지 않는 경우가 많습니다. 요금제에 따라 LMS는 요금이 더 붙을 수 있어, 많은 사람에게 보낼 때는 '짧게'를 고르면 비용을 줄일 수 있습니다.",
  },
]

export default function GreetingGeneratorPage() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: '인사말 생성기',
    description: '연말·새해·설날·추석·크리스마스·감사·생일·승진·퇴사 인사말과 송년회 건배사, 수능 응원 문구를 받는 사람과 말투에 맞춰 만들어 주는 무료 도구.',
    url: 'https://toolhub.ai.kr/greeting-generator',
    applicationCategory: 'UtilityApplication',
    operatingSystem: 'Any',
    browserRequirements: 'JavaScript',
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'KRW' },
    featureList: [
      '상황 11가지 (연말·새해·설날·추석·감사·생일·승진·퇴사·크리스마스·송년회 건배사·수능 응원)',
      '받는 사람 6가지 (상사·동료·거래처·친구·가족·선생님)',
      '격식·해요체·반말 말투, 길이 3단계',
      '새해 연도·간지·띠 자동 반영 (2027 정미년 붉은 양의 해)',
      '송년회 건배사 선창·후창 구호와 삼행시',
      '받는 사람 이름·보내는 사람 자동 넣기',
      '글자 수·SMS/LMS 표시, 복사',
      '카드 이미지 저장, 링크 공유, 즐겨찾기',
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
            <GreetingGenerator />
            <div className="mt-8">
              <RelatedTools />
            </div>
          </I18nWrapper>
        </div>
      </div>
      {/* SEO 콘텐츠 */}
      <section className="max-w-4xl mx-auto px-4 pb-12">
        <div className="mt-12 border-t border-line pt-8">
          <h2 className="text-xl font-bold text-fg mb-4">인사말 생성기란?</h2>
          <p className="text-body leading-relaxed mb-6">
            연말 인사말, 새해 인사말, 설날·추석 명절 인사말처럼 해마다 보내야 하는 문구를 상황과 받는 사람에 맞춰 바로 만들어 주는 도구입니다.
            거래처에는 격식 있는 합니다체로, 동료에게는 해요체로, 친구에게는 반말로 말투가 달라지고, 존댓말과 반말이 한 문구에 섞이지 않습니다.
            받는 사람 이름을 넣으면 &lsquo;김 부장님,&rsquo;처럼 첫머리에 붙어 단체 문자 티가 덜 나고, 글자 수와 SMS·LMS 여부도 함께 보여 줍니다.
          </p>
          <h3 className="text-lg font-semibold text-fg mb-3">상황별 인사말 보내는 시기</h3>
          <ul className="list-disc list-inside space-y-2 text-body">
            <li><strong>크리스마스·송년회 건배사:</strong> 12월 셋째 주부터. 건배사는 선창·후창을 미리 알려 주면 호응이 좋습니다.</li>
            <li><strong>수능 응원:</strong> 시험 2~3일 전, 늦어도 전날 저녁까지 보냅니다.</li>
            <li><strong>연말 인사:</strong> 12월 중순~말. 거래처는 마지막 근무일 며칠 전이 좋습니다.</li>
            <li><strong>새해·신년 인사:</strong> 1월 1일부터 첫 주 안에 보냅니다.</li>
            <li><strong>설날·추석 인사:</strong> 연휴 시작 2~3일 전에 보내야 묻히지 않습니다.</li>
            <li><strong>감사·축하 인사:</strong> 일이 끝난 날이나 소식을 들은 당일이 가장 좋습니다.</li>
          </ul>
        </div>
      </section>
    </>
  )
}
