import { Metadata } from 'next'
import BackgroundRemover from '@/components/BackgroundRemover'
import I18nWrapper from '@/components/I18nWrapper'
import RelatedTools from '@/components/RelatedTools'

export const metadata: Metadata = {
  title: '이미지 배경 제거 - 색상 기반 크로마키 배경 투명화 | 툴허브',
  description: '이미지에서 배경을 제거하여 투명 PNG로 저장하세요. 색상 기반 크로마키 방식으로 클릭 한 번에 배경색을 선택하고 허용 오차를 조절해 정밀한 배경 제거가 가능합니다. 서버 업로드 없이 브라우저에서 바로 처리됩니다.',
  keywords: '배경제거, 배경투명화, 크로마키, 이미지배경삭제, 투명PNG, 배경색제거, 누끼따기, 포토샵대체, 온라인배경제거',
  openGraph: {
    title: '이미지 배경 제거 - 색상 기반 크로마키 | 툴허브',
    description: '클릭으로 배경색 선택 후 허용 오차 조절로 정밀한 배경 제거. 서버 업로드 없이 브라우저에서 처리.',
    url: 'https://toolhub.ai.kr/background-remover',
    siteName: '툴허브',
    locale: 'ko_KR',
    type: 'website',
    images: [{ url: 'https://toolhub.ai.kr/og/background-remover.png', width: 1200, height: 630, alt: '이미지 배경 제거' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: '이미지 배경 제거 - 색상 기반 크로마키 | 툴허브',
    description: '클릭으로 배경색 선택 후 허용 오차 조절로 정밀한 배경 제거. 서버 업로드 없이 브라우저에서 처리.',
    images: ['https://toolhub.ai.kr/og/background-remover.png'],
  },
  alternates: {
    canonical: 'https://toolhub.ai.kr/background-remover/',
  },
}

export default function BackgroundRemoverPage() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: '이미지 배경 제거',
    description: '이미지에서 배경을 제거하여 투명 PNG로 저장하세요. 색상 기반 크로마키 방식으로 배경색을 선택하고 허용 오차를 조절해 정밀한 배경 제거가 가능합니다.',
    url: 'https://toolhub.ai.kr/background-remover',
    applicationCategory: 'UtilityApplication',
    operatingSystem: 'Any',
    browserRequirements: 'JavaScript',
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'KRW' },
    featureList: ['배경색 자동 감지', '가장자리 연결 영역만 제거(피사체 속 같은 색 보존)', '스포이트로 여러 배경색 지정', '경계 부드럽게·색 번짐 제거', '지우기·되살리기 브러시, 실행 취소', '증명사진 배경색 교체(흰색·하늘색·파랑)', '투명 PNG·JPG 저장', '클립보드 붙여넣기'],
  }

  const faqJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
      {
        '@type': 'Question',
        name: '색상 기반 배경 제거란 무엇인가요?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: '색상 기반 배경 제거(크로마키)는 특정 색상과 유사한 픽셀을 투명하게 만드는 방법입니다. 사용자가 배경 영역을 클릭하면 해당 픽셀의 색상이 선택되고, 허용 오차 범위 내의 유사한 색상을 가진 모든 픽셀이 투명 처리됩니다. 단색 배경(흰 배경, 녹색 스튜디오 등)이 있는 이미지에 가장 효과적입니다. AI 기반 방식과 달리 계산이 단순해 브라우저에서 빠르게 처리할 수 있습니다.',
        },
      },
      {
        '@type': 'Question',
        name: '배경 제거 결과가 만족스럽지 않을 때 어떻게 하나요?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: '결과가 만족스럽지 않을 경우 다음을 시도해보세요. ① 허용 오차를 높이면 더 많은 배경이 제거되고 낮추면 더 정밀하게 제거됩니다. ② 경계 부드럽게 값을 높이면 경계선이 부드러워집니다. ③ 배경의 여러 부분을 클릭해 다른 색조를 각각 제거해보세요. ④ 복잡한 배경(그라데이션, 패턴)이나 피사체와 배경색이 비슷한 이미지는 색상 기반 방식의 한계가 있을 수 있습니다. 이 경우 Adobe Photoshop이나 AI 기반 remove.bg 같은 전문 도구를 사용하는 것이 좋습니다.',
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
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />
      <div className="min-h-screen py-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
            <I18nWrapper>
              <BackgroundRemover />
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
            이미지 배경 제거 도구란?
          </h2>
          <p className="text-body leading-relaxed mb-6">
            이미지 배경 제거 도구는 색상 기반 크로마키 방식으로 이미지의 배경색을 투명하게 만들어 PNG 파일로 저장하는 무료 온라인 누끼 따기 도구입니다. 클릭 한 번으로 배경색을 선택하고 허용 오차와 경계 부드럽게을 조절해 정밀하게 배경을 제거할 수 있으며, 모든 처리가 브라우저에서 로컬로 이루어져 이미지가 서버에 업로드되지 않습니다. 증명사진 배경 제거, 상품 사진 편집, 디자인 작업에 유용합니다.
          </p>
          <h3 className="text-lg font-semibold text-fg mb-3">
            배경 제거 도구 활용 팁
          </h3>
          <ul className="list-disc list-inside space-y-2 text-body">
            <li><strong>단색 배경에 최적:</strong> 흰 배경, 녹색 스튜디오 배경, 파란 배경처럼 균일한 단색 배경에서 가장 깔끔한 결과를 얻을 수 있습니다.</li>
            <li><strong>허용 오차 조절:</strong> 배경이 너무 많이 남으면 허용 오차를 높이고, 피사체 색상까지 투명해지면 허용 오차를 낮춰 세밀하게 조정하세요.</li>
            <li><strong>여러 번 클릭:</strong> 배경에 다양한 색조가 있다면 각 영역을 순서대로 클릭하여 단계적으로 배경을 제거할 수 있습니다.</li>
            <li><strong>경계 부드럽게:</strong> 경계선이 딱딱하게 잘린 느낌이 있을 때 경계 부드럽게 값을 높이면 자연스러운 경계선을 만들 수 있습니다.</li>
            <li><strong>개인정보 보호:</strong> 서버 업로드 없이 브라우저에서만 처리되므로 민감한 사진도 안심하고 사용할 수 있습니다.</li>
          </ul>
        </div>
      </section>
    </>
  )
}
