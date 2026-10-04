import { Metadata } from 'next'
import HousingSubscription from '@/components/HousingSubscription'
import I18nWrapper from '@/components/I18nWrapper'
import RelatedTools from '@/components/RelatedTools'

export const metadata: Metadata = {
  title: '청약가점 계산기 - 청약 점수 자동 계산 | 툴허브',
  description: '생년월일·혼인신고일·통장 가입일만 넣으면 무주택기간·부양가족·청약통장 점수(84점 만점)를 자동 계산. 배우자 통장 합산, 1년 뒤 점수, 특별공급 자격까지 2026년 기준.',
  keywords: '청약가점 계산기, 청약 점수 계산, 무주택기간 점수, 부양가족 가점, 청약통장 가점, 아파트 청약, 분양 가점',
  openGraph: {
    title: '청약가점 계산기 | 툴허브',
    description: '무주택기간·부양가족·청약통장 가입기간으로 청약가점 84점 만점을 자동 계산하세요.',
    url: 'https://toolhub.ai.kr/housing-subscription/',
    siteName: '툴허브',
    locale: 'ko_KR',
    type: 'website',
    images: [{ url: 'https://toolhub.ai.kr/og/housing-subscription.png', width: 1200, height: 630, alt: '청약가점 계산기' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: '청약가점 계산기',
    description: '무주택기간·부양가족·청약통장 가입기간으로 청약가점 84점 만점 계산',
    images: ['https://toolhub.ai.kr/og/housing-subscription.png'],
  },
  alternates: {
    canonical: 'https://toolhub.ai.kr/housing-subscription/',
  },
}

export default function HousingSubscriptionPage() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: '청약가점 계산기',
    description: '무주택기간, 부양가족 수, 청약통장 가입기간을 입력하면 청약가점 84점 만점을 자동 계산합니다.',
    url: 'https://toolhub.ai.kr/housing-subscription/',
    applicationCategory: 'FinanceApplication',
    operatingSystem: 'Any',
    browserRequirements: 'JavaScript',
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'KRW' },
    featureList: [
      '무주택기간 자동 계산 (최대 32점)',
      '부양가족 수 가점 계산 (최대 35점)',
      '청약통장 가입기간 계산 (최대 17점)',
      '84점 만점 총 가점 계산',
      '1년 뒤·5년 뒤 가점 예측',
      '배우자 청약통장 가점 합산 (최대 3점)',
      '특별공급 자격 체크 (신혼·생애최초·신생아·다자녀)',
      '가점제·추첨제 비율표',
    ],
  }

  const faqJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
      { '@type': 'Question', name: "무주택기간은 정확히 언제부터 세나요?", acceptedAnswer: { '@type': 'Answer', text: "만 30세가 되는 날부터입니다. 그 전에 혼인신고를 했다면 혼인신고일부터 셉니다. 주택을 가졌다가 판 적이 있다면 마지막으로 무주택이 된 날과 비교해 더 늦은 날이 기산일이에요. 무주택 여부는 본인뿐 아니라 배우자·세대원 전원 기준입니다." } },
      { '@type': 'Question', name: "만 30세 미만 미혼이면 정말 0점인가요?", acceptedAnswer: { '@type': 'Answer', text: "네. 만 30세 미만 미혼은 무주택기간 점수가 0점이고, 30세가 되는 날부터 2점으로 시작해 1년마다 2점씩 오릅니다. 이 계산기는 생년월일로 30세 되는 날을 계산해 보여드려요." } },
      { '@type': 'Question', name: "부모님을 부양가족으로 넣으려면?", acceptedAnswer: { '@type': 'Answer', text: "신청자가 세대주이고, 모집공고일 기준 3년 이상 계속 같은 주민등록표에 올라 있어야 합니다. 부모님 중 한 분이라도 주택(분양권 포함)이 있으면 두 분 모두 부양가족에서 빠집니다. 위장전입을 막기 위해 2025년부터 부양가족 실거주 확인용으로 직계존속 3년·30세 이상 자녀 1년치 건강보험 요양급여내역을 제출해야 해요. 2026년 4월에는 30세 이상 미혼 자녀의 같은 등본 요건을 1년에서 3년으로 늘리는 개정안이 입법예고됐으니 공고문의 기준과 제출서류를 꼭 확인하세요." } },
      { '@type': 'Question', name: "배우자 청약통장도 점수에 들어가나요?", acceptedAnswer: { '@type': 'Answer', text: "2024년 3월 25일부터 민영주택 일반공급 가점에서 배우자 통장 가입기간의 50%를 환산해 최대 3점까지 더합니다. 합계는 17점을 넘지 않아요. 예: 본인 5년(7점) + 배우자 4년(2년분 3점) = 10점." } },
      { '@type': 'Question', name: "작은 집이 있어도 무주택으로 보나요?", acceptedAnswer: { '@type': 'Answer', text: "민영주택 일반공급에 한해 전용 60㎡ 이하이면서 공시가격이 수도권 1억 6천만 원·지방 1억 원 이하인 주택 1채는 무주택으로 봅니다. 특별공급에서는 유주택으로 보니 공고문을 꼭 확인하세요." } },
      { '@type': 'Question', name: "점수가 같으면 누가 당첨되나요?", acceptedAnswer: { '@type': 'Answer', text: "2024년 3월 25일부터 동점자는 청약통장 가입기간이 긴 사람이 우선이고, 그래도 같으면 추첨합니다." } },
      { '@type': 'Question', name: "공공분양(국민주택)도 가점으로 뽑나요?", acceptedAnswer: { '@type': 'Answer', text: "아니요. 국민주택 일반공급은 가점제가 아니라 순차제(납입인정금액·납입 횟수)로 뽑습니다. 가점제는 민영주택 일반공급에 적용돼요." } },
      { '@type': 'Question', name: "당첨 커트라인은 어디서 보나요?", acceptedAnswer: { '@type': 'Answer', text: "청약홈(applyhome.co.kr)에서 단지별 경쟁률과 당첨가점(최저·최고·평균)을 볼 수 있어요. 같은 지역이라도 단지·평형마다 차이가 커서 관심 단지의 지난 분양 결과를 직접 보는 게 가장 정확합니다." } }
    ],
  }

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />
      <div className="min-h-screen py-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
            <I18nWrapper>
              <HousingSubscription />
              <div className="mt-8">

                <RelatedTools />

              </div>

            </I18nWrapper>
        </div>
      </div>
    </>
  )
}
