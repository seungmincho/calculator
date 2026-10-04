import { Metadata } from 'next'
import SleepCalculator from '@/components/SleepCalculator'
import I18nWrapper from '@/components/I18nWrapper'
import RelatedTools from '@/components/RelatedTools'

export const metadata: Metadata = {
  title: '수면 계산기 - 최적 취침·기상 시간 계산 | 툴허브',
  description:
    '90분 수면 주기를 기반으로 최적의 취침 시간과 기상 시간을 계산합니다. 지금 잠들면 언제 일어나야 하는지, 원하는 시간에 일어나려면 언제 자야 하는지 알려드립니다. 연령별 권장 수면 시간과 수면 습관 가이드 제공.',
  keywords:
    '수면 계산기, 수면 주기, 취침 시간, 기상 시간, 90분 수면, 렘수면, 수면 사이클, 수면 시간 계산, 잠 계산기, sleep calculator',
  openGraph: {
    title: '수면 계산기 - 최적 취침·기상 시간 계산 | 툴허브',
    description:
      '90분 수면 주기를 기반으로 최적의 취침 시간과 기상 시간을 계산합니다. 개운한 아침을 위한 수면 계산기.',
    url: 'https://toolhub.ai.kr/sleep-calculator',
    siteName: '툴허브',
    locale: 'ko_KR',
    type: 'website',
    images: [{ url: 'https://toolhub.ai.kr/og/sleep-calculator.png', width: 1200, height: 630, alt: '수면 계산기' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: '수면 계산기 - 최적 취침·기상 시간 계산',
    description:
      '90분 수면 주기를 기반으로 최적의 취침 시간과 기상 시간을 계산합니다. 개운한 아침을 위한 수면 계산기.',
    images: ['https://toolhub.ai.kr/og/sleep-calculator.png'],
  },
  alternates: {
    canonical: 'https://toolhub.ai.kr/sleep-calculator/',
  },
}

export default function SleepCalculatorPage() {
  const jsonLd = [
    {
      '@context': 'https://schema.org',
      '@type': 'WebApplication',
      name: '수면 계산기',
      description:
        '90분 수면 주기를 기반으로 최적의 취침 시간과 기상 시간을 계산합니다. 연령별 권장 수면 시간과 수면 습관 가이드를 제공합니다.',
      url: 'https://toolhub.ai.kr/sleep-calculator',
      applicationCategory: 'HealthApplication',
      operatingSystem: 'Any',
      browserRequirements: 'JavaScript',
      offers: { '@type': 'Offer', price: '0', priceCurrency: 'KRW' },
      featureList: [
        '기상 시각 → 추천 취침 시각 (수면 주기 기반)',
        '지금 자면 / 지정 취침 시각 → 추천 기상 시각',
        '낮잠 알람 (10분·20분 파워냅·한 주기)',
        '수면 주기 길이(80~110분)·잠드는 시간(0~60분) 조정',
        '연령별 권장 수면(NSF·AASM) 기준 추천·미달 경고',
        '카페인 마지막 섭취 시각 안내, 알람 문구 복사',
        '7일 수면 부채 기록, 결과 이미지·링크 공유',
      ],
    },
    {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: [
        {
          '@type': 'Question',
          name: '수면 주기란 무엇인가요?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: '수면 주기는 약 90분 단위로 반복되는 수면의 단계입니다. 각 주기는 가벼운 수면(NREM 1-2단계), 깊은 수면(NREM 3단계), 렘수면(REM)으로 구성됩니다. 하룻밤에 보통 4~6회 반복되며, 수면 주기의 끝에서 기상하면 더 개운하게 일어날 수 있습니다.',
          },
        },
        {
          '@type': 'Question',
          name: '왜 90분 단위로 수면을 계산하나요?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: '수면 주기 한 바퀴가 평균 약 90분(사람·주기마다 약 70~120분)이기 때문입니다. 주기 도중, 특히 깊은 수면 단계에서 깨면 수면 관성(sleep inertia)으로 인해 피로감과 몽롱함이 심해집니다. 주기가 완료되는 시점에 맞춰 기상하면 보다 상쾌하게 깨어날 수 있습니다.',
          },
        },
        {
          '@type': 'Question',
          name: '90분 주기에 맞추면 누구나 개운하게 일어나나요?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: '아닙니다. 90분은 평균치이고 실제 주기는 약 70~120분으로 사람마다, 같은 밤에도 주기마다 다릅니다. 계산 결과는 참고값이며, 알람 전에 자주 깨거나 늦게 깬다면 주기 길이와 잠드는 시간을 조정해 보세요. 총 수면 시간과 일정한 기상 시각이 더 중요합니다.',
          },
        },
        {
          '@type': 'Question',
          name: '커피는 몇 시까지 마셔도 되나요?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: '일반적으로 취침 6시간 전까지를 권합니다. 취침 6시간 전에 마신 카페인 400mg도 총수면을 1시간 넘게 줄였다는 연구(Drake 외, 2013)가 있습니다. 카페인 대사 속도는 개인차가 커서 민감하다면 더 일찍 끊는 것이 좋습니다.',
          },
        },
        {
          '@type': 'Question',
          name: '성인의 적정 수면 시간은 얼마인가요?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: '미국 수면 재단(National Sleep Foundation) 기준으로 성인(18~64세)의 적정 수면 시간은 7~9시간입니다. 이는 수면 주기 5~6회(7.5~9시간)에 해당합니다. 65세 이상은 7~8시간이 권장되며, 미국수면의학회(AASM)도 성인에게 하루 7시간 이상을 권장합니다.',
          },
        },
      ],
    },
  ]

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <div className="min-h-screen py-8">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <I18nWrapper>
              <SleepCalculator />
              <div className="mt-8">

                <RelatedTools />

              </div>

            </I18nWrapper>
        </div>
      </div>
      {/* SEO 콘텐츠 */}
      <section className="max-w-4xl mx-auto px-4 pb-12">
        <div className="mt-12 border-t border-line pt-8">
          <h2 className="text-xl font-bold text-fg mb-4">
            수면 계산기란?
          </h2>
          <p className="text-body leading-relaxed mb-6">
            수면 계산기는 90분 단위의 수면 주기(렘수면·깊은수면 사이클)를 기반으로 최적의 취침 시간과 기상 시간을 계산해 주는 건강 도구입니다. 수면 주기 중간에 깨면 피로와 수면 관성이 심해지므로, 주기가 끝나는 시점에 맞춰 기상하면 성인 기준 7~9시간 권장 수면을 더 개운하게 채울 수 있습니다.
          </p>
          <h3 className="text-lg font-semibold text-fg mb-3">
            수면 계산기 활용 팁
          </h3>
          <ul className="list-disc list-inside space-y-2 text-body">
            <li><strong>잠들기까지 시간 반영:</strong> 잠자리에 눕고 실제로 잠드는 데 보통 10~20분이 걸리므로, 계산기에서 이 시간을 설정하면 더 정확한 기상 시각을 얻을 수 있습니다.</li>
            <li><strong>수면 주기 5~6회 목표:</strong> 성인에게 권장되는 7.5~9시간 수면은 수면 주기 5~6회에 해당합니다. 4주기(6시간)는 성인 권장(7시간 이상)보다 짧으므로 가능하면 5주기 이상을 확보하세요.</li>
            <li><strong>일관된 기상 시간 유지:</strong> 주말에도 평일과 같은 시간에 일어나면 일주기 리듬(서카디언 리듬)이 안정되어 취침 시간에 자연스럽게 졸음이 옵니다.</li>
            <li><strong>취침 전 습관 관리:</strong> 취침 1시간 전 스마트폰·TV의 블루라이트를 줄이고, 18~20°C의 서늘한 환경을 만들면 깊은 수면 진입이 빨라집니다.</li>
          </ul>
        </div>
      </section>
    </>
  )
}
