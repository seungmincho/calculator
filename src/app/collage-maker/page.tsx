import { Metadata } from 'next'
import { Suspense } from 'react'
import CollageMaker from '@/components/CollageMaker'
import I18nWrapper from '@/components/I18nWrapper'

export const metadata: Metadata = {
  title: '사진 콜라주 메이커 - 여러 사진 합치기 도구 | 툴허브',
  description: '여러 사진을 다양한 레이아웃 템플릿으로 합쳐 콜라주를 만드세요. 2분할, 3분할, 4분할, 6분할, 9분할(인스타그램) 레이아웃을 지원하며 간격, 모서리 둥글기, 배경색을 자유롭게 설정하고 PNG로 다운로드할 수 있습니다.',
  keywords: '콜라주 만들기, 사진합치기, 포토콜라주, 사진편집, 이미지합치기, 인스타그램콜라주, 사진레이아웃, 콜라주메이커, 온라인콜라주',
  openGraph: {
    title: '사진 콜라주 메이커 - 여러 사진 합치기 | 툴허브',
    description: '2~9분할 레이아웃으로 여러 사진을 합쳐 콜라주 이미지를 만드세요. 서버 업로드 없이 브라우저에서 바로 처리.',
    url: 'https://toolhub.ai.kr/collage-maker',
    siteName: '툴허브',
    locale: 'ko_KR',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: '사진 콜라주 메이커 - 여러 사진 합치기 | 툴허브',
    description: '2~9분할 레이아웃으로 여러 사진을 합쳐 콜라주 이미지를 만드세요.',
  },
  alternates: {
    canonical: 'https://toolhub.ai.kr/collage-maker/',
  },
}

export default function CollageMakerPage() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: '사진 콜라주 메이커',
    description: '여러 사진을 다양한 레이아웃 템플릿으로 합쳐 콜라주를 만드세요. 2분할, 3분할, 4분할, 6분할, 9분할 레이아웃을 지원합니다.',
    url: 'https://toolhub.ai.kr/collage-maker',
    applicationCategory: 'UtilityApplication',
    operatingSystem: 'Any',
    browserRequirements: 'JavaScript',
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'KRW' },
    featureList: [
      '드래그앤드롭 사진 업로드',
      '5가지 레이아웃 템플릿 (2/3/4/6/9분할)',
      '이미지 center-crop 렌더링',
      '간격 및 모서리 둥글기 조절',
      '배경색 설정',
      '출력 크기 프리셋 (인스타그램/OG/HD)',
      'PNG 다운로드',
      '서버 업로드 없음',
    ],
  }

  const faqJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
      {
        '@type': 'Question',
        name: '사진 콜라주 메이커에서 몇 장의 사진을 사용할 수 있나요?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: '레이아웃에 따라 필요한 사진 수가 다릅니다. 2분할은 2장, 3분할은 3장, 4분할은 4장, 6분할은 6장, 9분할은 9장의 사진을 사용합니다. 사진이 레이아웃 칸 수보다 적으면 업로드된 사진이 순서대로 반복 사용됩니다. 모든 처리는 브라우저에서 이루어지며 서버에 업로드되지 않습니다.',
        },
      },
      {
        '@type': 'Question',
        name: '콜라주 이미지의 출력 크기를 어떻게 설정하나요?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: '인스타그램 정사각형(1080×1080), OG 이미지(1200×630), HD 와이드스크린(1920×1080) 세 가지 프리셋을 제공합니다. 원하는 출력 크기를 선택하면 캔버스가 해당 해상도로 렌더링되며 PNG 파일로 다운로드됩니다.',
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
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 py-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <Suspense fallback={<div className="text-center py-12 text-gray-500 dark:text-gray-400">Loading...</div>}>
            <I18nWrapper>
              <CollageMaker />
            </I18nWrapper>
          </Suspense>
        </div>
      </div>
        {/* SEO 콘텐츠 */}
        <section className="max-w-4xl mx-auto px-4 pb-12">
          <div className="mt-12 border-t border-gray-200 dark:border-gray-700 pt-8">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
              사진 콜라주 메이커란?
            </h2>
            <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-6">
              사진 콜라주 메이커는 <strong>여러 장의 사진을 2·3·4·6·9분할 레이아웃으로 하나의 이미지로 합쳐주는</strong> 무료 온라인 도구입니다. 인스타그램용 정사각형(1080×1080), OG 이미지(1200×630), HD 와이드(1920×1080) 등 다양한 크기를 지원하며 모든 처리가 브라우저에서 이루어져 사진이 서버에 업로드되지 않습니다. 여행 사진 정리, SNS 포스팅, 기념 앨범 제작에 활용하세요.
            </p>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
              사진 콜라주 메이커 활용 팁
            </h3>
            <ul className="list-disc list-inside space-y-2 text-gray-700 dark:text-gray-300">
              <li><strong>인스타그램 9분할:</strong> 인스타그램 그리드에 9장을 일관된 레이아웃으로 올릴 때 9분할 프리셋을 활용하세요.</li>
              <li><strong>모서리 둥글기:</strong> 모서리를 둥글게 설정하면 더 부드럽고 트렌디한 콜라주를 만들 수 있습니다.</li>
              <li><strong>배경색 선택:</strong> 흰색 배경은 깔끔한 느낌, 검정 배경은 고급스러운 느낌을 줍니다.</li>
              <li><strong>드래그 앤 드롭:</strong> 사진을 원하는 순서로 드래그해 배치를 자유롭게 조정할 수 있습니다.</li>
              <li><strong>개인정보 안전:</strong> 모든 이미지 처리가 브라우저에서 이루어지므로 사진이 외부 서버로 전송되지 않습니다.</li>
            </ul>
          </div>
        </section>
    </>
  )
}
