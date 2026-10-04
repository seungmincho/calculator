import { Metadata } from 'next'
import OneRepMaxCalculator from '@/components/OneRepMaxCalculator'
import I18nWrapper from '@/components/I18nWrapper'
import RelatedTools from '@/components/RelatedTools'
import ToolFaq from '@/components/ToolFaq'

export const metadata: Metadata = {
  title: '1RM 계산기 - 벤치·스쿼트·데드 최대 중량 | 툴허브',
  description: '든 무게와 반복 횟수로 벤치프레스·스쿼트·데드리프트 1RM(1회 최대 중량)을 Epley·Brzycki 등 4개 공식으로 추정하세요. 강도별 훈련 무게표, 원판 계산, 3대 합계와 체중 대비 배수까지 한 번에.',
  keywords: '1rm 계산기, 벤치프레스 1rm, 스쿼트 1rm, 데드리프트 1rm, 3대 중량 계산, 3대 500, 1rm 공식, 최대 중량 계산, 원판 계산기, 훈련 강도 계산',
  openGraph: {
    title: '1RM 계산기 - 벤치·스쿼트·데드 최대 중량 | 툴허브',
    description: '무게와 횟수만 넣으면 1RM 추정, 강도별 훈련 무게, 원판 구성, 3대 합계까지.',
    url: 'https://toolhub.ai.kr/one-rep-max/',
    siteName: '툴허브', locale: 'ko_KR', type: 'website',
    images: [{ url: 'https://toolhub.ai.kr/og/one-rep-max.png', width: 1200, height: 630, alt: '1RM 계산기' }],
  },
  twitter: { card: 'summary_large_image', title: '1RM 계산기 | 툴허브', description: '벤치프레스·스쿼트·데드리프트 1RM 추정과 3대 합계 계산', images: ['https://toolhub.ai.kr/og/one-rep-max.png'] },
  alternates: { canonical: 'https://toolhub.ai.kr/one-rep-max/' },
}

const faqs = [
  { q: '1RM이 무엇인가요?', a: '1RM(One Repetition Maximum)은 정확한 자세로 딱 한 번 들 수 있는 최대 무게입니다. 근력 수준을 비교하는 기준이자, "1RM의 80%로 8회"처럼 훈련 무게를 정하는 기준으로 씁니다. 직접 재면 부상 위험이 있어 보통 몇 회 든 무게로 추정합니다.' },
  { q: '1RM 계산기는 얼마나 정확한가요?', a: '3~10회 범위에서 가장 잘 맞고, 반복이 많아질수록 오차가 커집니다. 공식마다 값이 조금씩 달라 이 계산기는 Epley·Brzycki·Lombardi·O\'Conner 네 공식의 평균과 범위를 함께 보여 줍니다. 연구(LeSuer 외, 1997)에서는 데드리프트가 공식으로 낮게 추정되는 경향이 있었습니다.' },
  { q: '어떤 공식을 믿어야 하나요?', a: 'Epley(w × (1 + r/30))와 Brzycki(w × 36/(37 − r))가 가장 널리 쓰이고 10회에서는 두 값이 같습니다. 반복이 적을수록 Brzycki·O\'Conner가 보수적으로, Epley·Lombardi가 조금 높게 나옵니다. 한 공식보다 평균과 범위를 보고 판단하는 편이 안전합니다.' },
  { q: '3대 중량(3대 500)은 어떻게 계산하나요?', a: '스쿼트·벤치프레스·데드리프트 세 종목 1RM의 합계입니다. "3대 합계" 모드에서 1RM을 알면 횟수를 1회로 두고 그 무게를, 모르면 든 무게와 횟수를 넣으면 종목별 1RM을 추정해 더하고, 체중을 넣으면 체중 대비 배수도 보여 줍니다.' },
  { q: '1RM의 몇 %로 운동해야 하나요?', a: 'NSCA 지침 기준으로 근력은 1RM의 85% 이상으로 6회 이하, 근비대는 67~85%로 6~12회, 근지구력은 67% 이하로 12회 이상이 일반적입니다. 계산 결과의 강도별 무게표에서 원판 단위로 반올림한 무게를 바로 확인할 수 있습니다.' },
  { q: '1RM을 직접 측정해도 되나요?', a: '충분히 워밍업하고 무게를 단계적으로 올리면 직접 잴 수 있지만, 초보자나 혼자 운동할 때는 부상 위험이 커 추정값을 권합니다. 직접 잴 때는 보조자(스파터)나 세이프티 바를 꼭 쓰고, 통증이 있으면 바로 멈추세요.' },
  { q: '덤벨이나 머신 운동에도 쓸 수 있나요?', a: '"기타 운동"을 고르면 어떤 운동이든 같은 공식으로 계산됩니다. 다만 공식은 주로 바벨 운동 연구에서 나와서, 덤벨·머신·맨몸 운동은 오차가 더 클 수 있습니다.' },
  { q: 'lb(파운드)를 kg으로 바꾸려면?', a: '1lb는 0.45359237kg입니다. 예를 들어 225lb는 약 102.1kg이고, 100kg은 약 220.5lb입니다. 단위를 lb로 바꾸면 입력한 무게도 함께 환산되고, 원판 계산은 45lb 바와 lb 원판 기준으로 바뀝니다.' },
]

export default function OneRepMaxPage() {
  const jsonLd = {
    '@context': 'https://schema.org', '@type': 'WebApplication',
    name: '1RM 계산기',
    description: '든 무게와 반복 횟수로 벤치프레스·스쿼트·데드리프트 1RM을 4개 공식으로 추정하고 강도별 훈련 무게, 원판 구성, 3대 합계를 계산하는 도구.',
    url: 'https://toolhub.ai.kr/one-rep-max/',
    applicationCategory: 'HealthApplication', operatingSystem: 'Any', browserRequirements: 'JavaScript',
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'KRW' },
    featureList: ['Epley·Brzycki·Lombardi·O\'Conner 공식별 1RM과 평균', '1RM 50~100% 강도별 훈련 무게표', '원판 단위 반올림(2.5kg·1.25kg)', '바벨 원판 구성 계산', '3대 합계와 체중 대비 배수', 'kg·lb 단위 전환', '결과 공유 링크·이미지'],
  }

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <div className="min-h-screen py-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <I18nWrapper>
            <OneRepMaxCalculator />
            <ToolFaq items={faqs} />
            <div className="mt-8">
              <RelatedTools />
            </div>
          </I18nWrapper>
        </div>
      </div>
      <section className="max-w-4xl mx-auto px-4 pb-12">
        <div className="mt-12 border-t border-line pt-8">
          <h2 className="text-xl font-bold text-fg mb-4">1RM 계산기란?</h2>
          <p className="text-body leading-relaxed mb-6">
            1RM 계산기는 한 세트에서 든 무게와 반복 횟수로 1회 최대 중량(1RM)을 추정하는 도구입니다. 무거운 무게를 직접 들어 보지 않아도 Epley(1985), Brzycki(1993), Lombardi(1989), O&apos;Conner(1989) 네 가지 공식으로 1RM을 계산하고, 그 평균을 기준으로 50~100% 강도별 훈련 무게를 원판 단위로 반올림해 보여 줍니다. 목표 무게에 맞춰 바벨 한쪽에 끼울 원판을 알려 주고, 스쿼트·벤치프레스·데드리프트 3대 합계와 체중 대비 배수도 계산합니다.
          </p>
          <h3 className="text-lg font-semibold text-fg mb-3">1RM 계산 예시 (4개 공식 평균)</h3>
          <ul className="list-disc list-inside space-y-2 text-body">
            <li><strong>벤치프레스 80kg × 5회:</strong> Epley 93.3kg, Brzycki 90kg, Lombardi 94kg, O&apos;Conner 90kg → 평균 약 91.8kg</li>
            <li><strong>스쿼트 100kg × 8회:</strong> 평균 약 123.5kg, 85%(약 6회) 훈련 무게는 105kg</li>
            <li><strong>데드리프트 140kg × 3회:</strong> 평균 약 152.2kg</li>
            <li><strong>원판 구성:</strong> 20kg 바로 100kg을 만들려면 한쪽에 25kg + 15kg</li>
          </ul>
        </div>
      </section>
    </>
  )
}
