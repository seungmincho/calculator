import { Metadata } from 'next'
import NoiseMeter from '@/components/NoiseMeter'
import I18nWrapper from '@/components/I18nWrapper'
import RelatedTools from '@/components/RelatedTools'
import { FaqJsonLd } from '@/components/ToolFaq'
import noiseMeterMessages from '../../../messages/generated/ko/ns/noiseMeter.json'

export const metadata: Metadata = {
  title: '소음 측정기 - 데시벨(dB) 측정, 층간소음 측정 | 툴허브',
  description: '마이크로 주변 소음을 dB(A)로 실시간 측정. 평균(Leq)·최대·최소, 60초 그래프, 층간소음 기준(주간 39dB·야간 34dB) 비교와 초과 시각 기록·CSV 내보내기까지 앱 설치 없이.',
  keywords: '소음 측정기, 데시벨 측정, dB 측정, 층간소음 측정, 소음 레벨, 소리 크기 측정, 소음 측정 앱, 데시벨 미터',
  openGraph: {
    title: '소음 측정기 (데시벨 미터) | 툴허브',
    description: '마이크로 주변 소음을 실시간 측정. 층간소음 체크에 유용.',
    url: 'https://toolhub.ai.kr/noise-meter',
    siteName: '툴허브',
    locale: 'ko_KR',
    type: 'website',
    images: [{ url: 'https://toolhub.ai.kr/og/noise-meter.png', width: 1200, height: 630, alt: '소음 측정기 (데시벨 미터)' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: '소음 측정기 | 툴허브',
    description: '실시간 데시벨(dB) 소음 측정.',
    images: ['https://toolhub.ai.kr/og/noise-meter.png'],
  },
  alternates: {
    canonical: 'https://toolhub.ai.kr/noise-meter/',
  },
}

export default function NoiseMeterPage() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: '소음 측정기',
    description: '마이크를 이용한 실시간 소음(데시벨) 측정 도구',
    url: 'https://toolhub.ai.kr/noise-meter/',
    applicationCategory: 'UtilityApplication',
    operatingSystem: 'Any',
    browserRequirements: 'JavaScript, Microphone access',
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'KRW' },
    featureList: [
      'A-가중 dB(A) 실시간 측정',
      '등가소음도(Leq)·최대·최소 통계',
      '최근 60초 그래프와 소음 분포',
      '층간소음 기준 비교와 초과 기록 CSV',
      '마이크 보정',
    ],
  }


  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      {/* 컴포넌트가 화면에 보여 주는 FAQ와 같은 문구 */}
      <FaqJsonLd items={noiseMeterMessages.noiseMeter.guide.faq.items} />
      <div className="min-h-screen py-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
            <I18nWrapper>
              <NoiseMeter />
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
            소음 측정기(데시벨 미터)란?
          </h2>
          <p className="text-body leading-relaxed mb-6">
            소음 측정기는 스마트폰이나 PC의 마이크를 이용하여 주변 소음을 실시간으로 측정하는 무료 온라인 도구입니다. 사람 귀의 감도를 반영한 A-가중 dB(A) 값과 등가소음도(Leq)·최대·최소값, 최근 60초 그래프를 확인할 수 있어 층간소음 체크, 작업환경 소음 확인, 강의실·회의실 소음 측정에 유용합니다. 별도 앱 설치 없이 브라우저에서 바로 사용 가능합니다.
          </p>
          <h3 className="text-lg font-semibold text-fg mb-3">
            데시벨 측정기 활용 팁
          </h3>
          <ul className="list-disc list-inside space-y-2 text-body">
            <li><strong>층간소음 기록:</strong> 층간소음 모드를 켜 두면 1분 등가소음도(주간 39dB·야간 34dB)와 최고소음도(주간 57dB·야간 52dB)를 넘은 시각이 자동으로 기록되고 CSV로 내보낼 수 있습니다. 스마트폰 값은 추정치라 법적 증거는 아니지만 발생 시각·빈도를 정리하는 데 유용합니다.</li>
            <li><strong>작업환경 점검:</strong> 85dB 이상 소음에 지속 노출되면 청력 손실 위험이 있으므로, 공장이나 공사 현장 근무 시 소음 수준을 주기적으로 체크하세요.</li>
            <li><strong>마이크 위치 조정:</strong> 소음 발생원에 가까이 두면 더 정확한 측정값을 얻을 수 있습니다. 직접 소음원과 측정 기기 사이에 장애물이 없도록 하세요.</li>
            <li><strong>참고용으로 활용:</strong> 웹 측정기는 전문 장비 대비 오차가 있으므로 법적 분쟁용 공식 측정은 전문 기관에 의뢰하세요.</li>
          </ul>
        </div>
      </section>
    </>
  )
}
