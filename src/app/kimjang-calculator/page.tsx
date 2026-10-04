import { Metadata } from 'next'
import KimjangCalculator from '@/components/KimjangCalculator'
import I18nWrapper from '@/components/I18nWrapper'
import RelatedTools from '@/components/RelatedTools'

export const metadata: Metadata = {
  title: '김장 계산기 - 배추 포기별 양념 재료·비용 | 툴허브',
  description: '배추 20포기 김장에 고춧가루·마늘·무·젓갈이 얼마나 필요한지, 김장 비용은 얼마인지 바로 계산하세요. aT 김장비용 조사 기준 재료량과 단가, 절임배추 kg 환산, 직접 절임 vs 절임배추 비교, 장보기 체크리스트까지.',
  keywords: '김장 계산기, 김장 재료 양, 배추 20포기 양념, 김장 비용, 김장비용 2025, 절임배추 20kg 몇 포기, 배추 10포기 양념, 김장 재료 목록, 김장 고춧가루 양, 찹쌀풀 비율, 김장 시기',
  openGraph: {
    title: '김장 계산기 - 배추 포기별 양념·비용 | 툴허브',
    description: '배추 포기 수만 넣으면 양념 재료량, 김장 비용, 장보기 목록이 한 번에.',
    url: 'https://toolhub.ai.kr/kimjang-calculator/',
    siteName: '툴허브', locale: 'ko_KR', type: 'website',
    images: [{ url: 'https://toolhub.ai.kr/og/kimjang-calculator.png', width: 1200, height: 630, alt: '김장 계산기' }],
  },
  twitter: { card: 'summary_large_image', title: '김장 계산기 | 툴허브', description: '배추 포기별 양념 재료량과 김장 비용 계산', images: ['https://toolhub.ai.kr/og/kimjang-calculator.png'] },
  alternates: { canonical: 'https://toolhub.ai.kr/kimjang-calculator/' },
}

// 컴포넌트 가이드 FAQ(messages kimjangCalculator.guide.faq)와 같은 내용 — 화면에 보이는 FAQ만 구조화 데이터로
const faqs = [
  { q: '배추 20포기 김장 비용은 얼마인가요?', a: 'aT(한국농수산식품유통공사)가 2025년 11월 17일 조사한 4인 가족(배추 20포기) 김장비용은 201,151원으로 1년 전보다 5.6% 낮았습니다. 이 계산기는 품목별 값이 공개된 2024년 11월 21일 aT 조사(204,315원)를 기본 단가로 쓰며, 단가를 직접 바꿔 지금 시세로 다시 계산할 수 있습니다.' },
  { q: '절임배추 20kg은 배추 몇 포기인가요?', a: '산지와 배추 크기에 따라 다르지만 20kg 상자에는 보통 배추 8~10포기가 들어갑니다. 이 계산기는 절인 배추 1포기를 약 2.2kg(20kg은 약 9포기)으로 보고 환산합니다.' },
  { q: '4인 가족은 배추 몇 포기를 담가야 하나요?', a: 'aT 김장비용 조사는 4인 가족 기준을 배추 20포기로 잡습니다. 1인당 약 5포기꼴이지만 김치를 먹는 양과 보관 공간에 맞춰 조절하세요.' },
  { q: '직접 절이는 것과 절임배추 중 무엇이 더 싼가요?', a: '배추와 소금값만 보면 직접 절이는 쪽이 대개 싸지만, 절이고 씻고 물 빼는 데 하루가 걸리고 큰 통과 물도 많이 필요합니다. 계산기 결과에서 두 방식의 금액을 나란히 비교할 수 있습니다.' },
  { q: '배추 절일 때 소금물 농도와 시간은 어떻게 하나요?', a: '농사로(농촌진흥청) 레시피는 약 15% 소금물에 배추를 담갔다가 줄기 사이에 굵은소금을 뿌려 8시간쯤 절입니다. 시간보다는 줄기를 구부렸을 때 부러지지 않고 휘는지로 확인하는 것이 정확합니다.' },
  { q: '김장은 언제 하는 게 좋나요?', a: '기상청은 하루 평균기온 4℃ 이하, 최저기온 0℃ 이하가 이어질 때를 김장 적기로 봅니다. 서울·경기는 보통 11월 중하순, 남부 지방은 11월 하순에서 12월 중순, 남해안은 12월 하순 이후입니다.' },
  { q: '찹쌀풀은 얼마나 쑤면 되나요?', a: '농사로 레시피는 찹쌀가루와 물을 1:9로 풀을 쑤고, 절인 배추 5kg당 풀 약 425g을 넣습니다. 배추 20포기(절임 약 44kg)라면 찹쌀가루 약 370g이 필요합니다.' },
  { q: '배추 20포기로 김치가 몇 kg 나오나요?', a: '절임배추 무게에 양념 무게를 더하면 대략적인 양이 나옵니다. 20포기면 절임배추 약 44kg에 양념 약 23kg이 더해져 67kg 안팎이 되지만, 버무리면서 물이 빠져 실제로는 조금 적습니다.' },
]

export default function KimjangCalculatorPage() {
  const jsonLd = {
    '@context': 'https://schema.org', '@type': 'WebApplication',
    name: '김장 계산기',
    description: '배추 포기 수 또는 절임배추 무게로 김장 양념 재료량과 비용을 계산하고 장보기 목록을 만드는 도구.',
    url: 'https://toolhub.ai.kr/kimjang-calculator/',
    applicationCategory: 'UtilityApplication', operatingSystem: 'Any', browserRequirements: 'JavaScript',
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'KRW' },
    featureList: ['배추 포기 수·절임배추 kg 기준 계산', '가족 수별 추천 포기 수', '재료 19종 양·단가·금액', '단가 직접 수정', '직접 절임 vs 절임배추 비용 비교', '맛 조절(젓갈 진하게·덜 맵게)', '김치 예상량', '장보기 체크리스트 저장·복사', '결과 공유 링크·이미지'],
  }
  const faqJsonLd = {
    '@context': 'https://schema.org', '@type': 'FAQPage',
    mainEntity: faqs.map((f) => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })),
  }

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />
      <div className="min-h-screen py-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <I18nWrapper>
            <KimjangCalculator />
            <div className="mt-8">
              <RelatedTools />
            </div>
          </I18nWrapper>
        </div>
      </div>
      <section className="max-w-4xl mx-auto px-4 pb-12">
        <div className="mt-12 border-t border-line pt-8">
          <h2 className="text-xl font-bold text-fg mb-4">김장 계산기란?</h2>
          <p className="text-body leading-relaxed mb-6">
            김장 계산기는 담글 배추 포기 수나 주문할 절임배추 무게를 넣으면 무·고춧가루·마늘·생강·파·젓갈 같은 양념 재료가 얼마나 필요한지와 전체 김장 비용을 함께 알려 주는 도구입니다. 재료량과 기본 단가는 한국농수산식품유통공사(aT)가 매년 11월 발표하는 4인 가족 배추 20포기 김장비용 조사를 기준으로 하고, 찹쌀풀 비율은 농사로(농촌진흥청) 배추김치 레시피를 따릅니다. 동네 시세에 맞게 단가를 고치면 합계가 바로 다시 계산되고, 장보기 목록은 체크해 두거나 복사해 가족과 나눌 수 있습니다.
          </p>
          <h3 className="text-lg font-semibold text-fg mb-3">김장 비용 계산 예시</h3>
          <ul className="list-disc list-inside space-y-2 text-body">
            <li><strong>배추 20포기(4인 가족, 직접 절임):</strong> aT 14개 품목 기준 배추 20포기, 무 5개, 고춧가루 2kg, 깐마늘 1.3kg, 굵은소금 6kg 등으로 204,315원(2024년 11월 21일 조사)입니다.</li>
            <li><strong>절임배추로 바꾸면:</strong> 20포기는 절임배추 약 44kg(20kg 상자 2.2개)입니다. 상자당 4만원이면 배추·소금 72,214원 대신 약 88,000원이 들어 직접 절일 때보다 1만 6천원가량 더 듭니다.</li>
            <li><strong>배추 10포기(1~2인 가구):</strong> 재료량과 비용이 모두 절반이 되어 고춧가루 1kg, 깐마늘 650g 정도면 됩니다.</li>
            <li><strong>2025년 조사:</strong> aT가 2025년 11월 17일 조사한 4인 가족 김장비용은 201,151원으로 1년 전보다 5.6% 낮았습니다.</li>
          </ul>
        </div>
      </section>
    </>
  )
}
