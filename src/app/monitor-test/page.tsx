import { Metadata } from 'next'
import MonitorTest from '@/components/MonitorTest'
import I18nWrapper from '@/components/I18nWrapper'
import RelatedTools from '@/components/RelatedTools'

export const metadata: Metadata = {
  title: '모니터 테스트 - 불량화소, 명암비, 색상, 감마, 번인 검사 | 툴허브',
  description: '모니터 불량화소(데드픽셀)·빛샘·균일도·밴딩·잔상(UFO)·번인·선명도·감마 등 18가지 전체화면 테스트와 중고거래용 빠른 점검 체크리스트, 주사율·해상도·HDR 확인까지 무료로 제공합니다.',
  keywords: '모니터 테스트, 데드픽셀 테스트, 빛샘 테스트 방법, 모니터 중고거래 확인, 주사율 확인, UFO 테스트, 밴딩 테스트, 불량화소 테스트, 데드픽셀 검사, 모니터 불량화소, 명암비 테스트, 감마 테스트, 빛샘 테스트, 번인 테스트, 모니터 점검, 화이트밸런스, 블랙밸런스, 응답속도 테스트, 모니터 캘리브레이션',
  openGraph: {
    title: '모니터 테스트 - 18가지 종합 모니터 품질 검사 | 툴허브',
    description: '불량화소부터 빛샘·번인·주사율까지! 18가지 모니터 테스트와 빠른 점검 결과 카드. 무료 온라인 모니터 품질 검사 도구.',
    url: 'https://toolhub.ai.kr/monitor-test',
    siteName: '툴허브',
    locale: 'ko_KR',
    type: 'website',
    images: [{ url: 'https://toolhub.ai.kr/og/monitor-test.png', width: 1200, height: 630, alt: '모니터 테스트' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: '모니터 테스트 - 18가지 종합 검사 | 툴허브',
    description: '불량화소, 빛샘, 밴딩, 잔상, 번인 등 18가지 모니터 품질 테스트를 무료로 제공합니다.',
    images: ['https://toolhub.ai.kr/og/monitor-test.png'],
  },
  alternates: {
    canonical: 'https://toolhub.ai.kr/monitor-test/',
  },
}

export default function MonitorTestPage() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: '모니터 테스트 - 18가지 종합 품질 검사',
    description: '불량화소, 빛샘, 균일도, 시야각, 암부·명부 계조, 명암비, 감마, 밴딩, 색상비, 가독성, 선명도, 잔상(UFO), 번인, 화이트밸런스, 블랙밸런스, 이미지표현, 화면조정, 불량화소 복구 등 18가지 모니터 테스트',
    url: 'https://toolhub.ai.kr/monitor-test',
    applicationCategory: 'UtilityApplication',
    operatingSystem: 'Any',
    browserRequirements: 'JavaScript, Fullscreen API',
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'KRW',
    },
    featureList: [
      '불량화소(데드픽셀) 11색 전체화면 테스트',
      '빠른 점검 9단계 연속 테스트 + 결함 체크리스트 + 결과 카드 공유',
      '주사율(rAF 측정)·해상도·배율·색역(Display P3)·HDR 확인',
      '균일도 9칸 격자, 암부/명부 계조(1~20, 235~254)',
      '그라데이션 밴딩(6비트 참고 비교), 1픽셀 선명도 패턴',
      '키보드(←/→/Space/Esc)·탭·스와이프 조작',
      '시야각 도트 패턴 6단계',
      '명암비 그라데이션 14단계',
      '가독성 텍스트 12단계',
      '색상비 RGB 채널별 테스트',
      '응답속도 UFO 잔상 테스트 + FPS 카운터',
      '감마 4색 보정 테스트',
      '빛샘/멍(클라우딩) 검정·어두운 회색 5단계',
      '잔상/번인 7색 모자이크 비교',
      '화이트밸런스 15단계',
      '블랙밸런스 15단계',
      '이미지표현 테스트 패턴 + 사용자 업로드',
      '화면조정 그리드/크로스헤어/컬러바/세이프에어리어',
      '불량화소 복구 랜덤 픽셀 플래싱(광과민성 경고 확인 후 실행)',
    ],
  }

  const faqJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
      {
        '@type': 'Question',
        name: '모니터 테스트로 확인할 수 있는 것은?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: '① 데드픽셀: 검정/흰색/빨강/초록/파랑 등 전체 화면으로 불량 픽셀 확인 ② 밴딩: 색상 그라디언트에서 계단 같은 줄무늬 확인 ③ 명암비(Contrast): 검정과 흰색 경계에서 디테일 확인 ④ 백라이트 균일성: 전체 회색 화면에서 밝기 불균일 확인 ⑤ 응답 속도: 움직이는 물체로 잔상 확인 ⑥ 시야각: 다른 각도에서 색상 변화 확인. 새 모니터 구매 후 불량 교환 기간 내 테스트를 권장합니다.',
        },
      },
      {
        '@type': 'Question',
        name: '중고 모니터·폰을 살 때 무엇을 확인해야 하나요?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: '빠른 점검을 실행해 데드픽셀·빛샘·균일도·밴딩·선명도·잔상·번인·시야각을 차례로 확인하세요. OLED 기기는 번인, LCD 모니터는 빛샘과 균일도를 특히 꼼꼼히 보고, 주사율이 광고 사양만큼 나오는지도 확인하세요. 결과는 이미지나 링크로 저장해 둘 수 있습니다.',
        },
      },
      {
        '@type': 'Question',
        name: '주사율(Hz) 측정은 정확한가요?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: '브라우저의 화면 갱신 간격(requestAnimationFrame)을 측정해 60·120·144·165Hz 등 흔한 값으로 맞춥니다. 대부분 정확하지만 절전 모드, 배터리 모드, 다른 모니터로 창 이동, 가변 주사율(VRR) 설정에 따라 낮게 나올 수 있습니다.',
        },
      },
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
              <MonitorTest />
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
              모니터 테스트란?
            </h2>
            <p className="text-body leading-relaxed mb-6">
              모니터 테스트는 새 모니터 구매 후 불량화소(데드픽셀)·명암비·색상 정확도·감마·빛샘·번인(잔상) 등 디스플레이 품질을 직접 확인할 수 있는 무료 온라인 검사 도구입니다. 18가지 테스트 항목을 전체 화면으로 실행해 육안으로 문제를 발견하고, 교환·반품 기간 내 신속하게 대처할 수 있습니다. PC·노트북·TV·태블릿 모니터 모두 테스트 가능합니다.
            </p>
            <h3 className="text-lg font-semibold text-fg mb-3">
              모니터 테스트 활용 팁
            </h3>
            <ul className="list-disc list-inside space-y-2 text-body">
              <li><strong>불량화소 확인:</strong> 검정·흰색·빨강·초록·파랑 등 11가지 전체 화면 색상 테스트를 실행해 밝거나 어두운 점(불량화소)을 확인하세요.</li>
              <li><strong>구매 직후 테스트:</strong> 새 모니터는 반품·교환 기간(보통 7~14일) 내에 반드시 테스트해 불량이면 즉시 교환을 요청하세요.</li>
              <li><strong>빛샘 테스트:</strong> 완전 어두운 방에서 검정 화면 테스트를 실행하면 모서리·가장자리의 백라이트 빛샘을 쉽게 확인할 수 있습니다.</li>
              <li><strong>번인 확인:</strong> 오래된 OLED·플라즈마 모니터는 잔상 테스트로 특정 이미지 잔상(번인) 발생 여부를 확인하세요.</li>
            </ul>
          </div>
        </section>
    </>
  )
}
