import { Metadata } from 'next'
import ScreenCompare from '@/components/ScreenCompare'
import I18nWrapper from '@/components/I18nWrapper'
import RelatedTools from '@/components/RelatedTools'
import { FaqJsonLd } from '@/components/ToolFaq'
import screenCompareMessages from '../../../messages/generated/ko/ns/screenCompare.json'

export const metadata: Metadata = {
  title: '화면 크기 비교 - 디바이스 비교 | 툴허브',
  description: '스마트폰, 태블릿, 노트북, 모니터 등 다양한 디바이스의 화면 크기를 비율에 맞게 시각적으로 비교하세요. PPI, 해상도, 화면 넓이 등 상세 스펙 비교 제공.',
  keywords: '화면 크기 비교, 디바이스 비교, 스마트폰 화면 비교, 모니터 크기 비교, PPI 계산, 해상도 비교, 아이폰 갤럭시 비교, 화면 인치 비교, TV 크기 비교, 65인치 TV 크기, 모니터 크기 비교 cm, 27인치 32인치 비교, TV 시청거리',
  openGraph: {
    title: '화면 크기 비교 | 툴허브',
    description: '스마트폰·태블릿·모니터 화면 크기 시각적 비교',
    url: 'https://toolhub.ai.kr/screen-compare/',
    siteName: '툴허브',
    locale: 'ko_KR',
    type: 'website',
    images: [{ url: 'https://toolhub.ai.kr/og/screen-compare.png', width: 1200, height: 630, alt: '화면 크기 비교' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: '화면 크기 비교 | 툴허브',
    description: '스마트폰·태블릿·모니터 화면 크기 시각적 비교',
    images: ['https://toolhub.ai.kr/og/screen-compare.png'],
  },
  alternates: {
    canonical: 'https://toolhub.ai.kr/screen-compare/',
  },
}

export default function ScreenComparePage() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: '화면 크기 비교',
    description: '스마트폰, 태블릿, 노트북, 모니터 화면 크기 시각적 비교 도구',
    url: 'https://toolhub.ai.kr/screen-compare/',
    applicationCategory: 'UtilityApplication',
    operatingSystem: 'Any',
    browserRequirements: 'JavaScript',
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'KRW' },
    featureList: ['모니터·TV·노트북·폰 크기 비교(최대 4개)', '같은 비율로 겹쳐 그리기', '실제 가로·세로 cm와 면적 차이 %', 'PPI·도트 피치 비교', 'Windows 배율 적용 작업 공간 비교', '권장 시청거리(SMPTE·THX·레티나)', '링크·이미지로 비교 결과 공유'],
  }

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <FaqJsonLd items={screenCompareMessages.screenCompare.guide.faq.items} />
      <div className="min-h-screen py-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
            <I18nWrapper>
              <ScreenCompare />
              <div className="mt-8">
                <RelatedTools />
              </div>
            </I18nWrapper>
        </div>
      </div>
      <section className="max-w-4xl mx-auto px-4 pb-12">
        <div className="mt-12 border-t border-line pt-8">
          <h2 className="text-xl font-bold text-fg mb-4">
            화면 크기 비교 도구란?
          </h2>
          <p className="text-body leading-relaxed mb-6">
            화면 크기 비교 도구는 스마트폰, 태블릿, 노트북, 모니터 등 다양한 전자기기의 화면 크기를 실제 비율에 맞게 시각적으로 비교할 수 있는 무료 온라인 도구입니다. PPI(인치당 픽셀), 해상도, 화면 넓이, 화면 비율 등 상세 스펙을 한눈에 비교하고, 최대 4개 디바이스를 동시에 비교할 수 있습니다.
          </p>
          <h3 className="text-lg font-semibold text-fg mb-3">
            화면 크기 비교 활용 팁
          </h3>
          <ul className="list-disc list-inside space-y-2 text-body">
            <li><strong>스마트폰 구매:</strong> iPhone과 Galaxy 모델을 직접 비교해 실제 크기 차이를 확인하세요.</li>
            <li><strong>모니터 선택:</strong> 24인치 FHD와 27인치 QHD의 실제 크기 및 PPI 차이를 비교해보세요.</li>
            <li><strong>태블릿 비교:</strong> iPad와 Galaxy Tab의 화면 크기와 비율 차이를 시각적으로 확인하세요.</li>
            <li><strong>커스텀 크기:</strong> 목록에 없는 기기도 인치와 해상도를 직접 입력해 비교할 수 있습니다.</li>
            <li><strong>PPI 분석:</strong> 같은 크기 화면이라도 PPI에 따라 화질이 크게 달라집니다.</li>
          </ul>
        </div>
      </section>
    </>
  )
}
