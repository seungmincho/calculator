import { Metadata } from 'next'
import { Suspense } from 'react'
import GifMaker from '@/components/GifMaker'
import I18nWrapper from '@/components/I18nWrapper'
import Breadcrumb from '@/components/Breadcrumb'
import RelatedTools from '@/components/RelatedTools'

export const metadata: Metadata = {
  title: 'GIF 메이커 - 이미지로 애니메이션 GIF 만들기 | 툴허브',
  description: '여러 이미지를 업로드하여 애니메이션 GIF를 무료로 만들어보세요. 프레임 간격, 크기, 반복 횟수를 설정하고 GIF 파일로 다운로드할 수 있습니다.',
  keywords: 'GIF 만들기, 애니메이션 GIF, GIF 메이커, 이미지 GIF 변환, GIF 생성기, 움짤 만들기, 이미지 애니메이션',
  openGraph: {
    title: 'GIF 메이커 - 이미지로 애니메이션 GIF 만들기 | 툴허브',
    description: '여러 이미지를 업로드하여 애니메이션 GIF를 무료로 만들어보세요. 프레임 간격, 크기, 반복 횟수 설정 가능.',
    url: 'https://toolhub.ai.kr/gif-maker',
    siteName: '툴허브',
    locale: 'ko_KR',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'GIF 메이커 | 툴허브',
    description: '여러 이미지로 애니메이션 GIF를 무료로 만드세요.',
  },
  alternates: {
    canonical: 'https://toolhub.ai.kr/gif-maker/',
  },
}

export default function GifMakerPage() {
  const jsonLd = [
    {
      '@context': 'https://schema.org',
      '@type': 'WebApplication',
      name: 'GIF 메이커',
      description: '여러 이미지를 업로드하여 애니메이션 GIF를 무료로 만드는 온라인 도구',
      url: 'https://toolhub.ai.kr/gif-maker',
      applicationCategory: 'MultimediaApplication',
      operatingSystem: 'Any',
      browserRequirements: 'JavaScript',
      offers: { '@type': 'Offer', price: '0', priceCurrency: 'KRW' },
      featureList: [
        '이미지로 GIF 만들기',
        '프레임 간격 조절',
        '출력 크기 설정',
        '무한/1회 반복 설정',
        '캔버스 미리보기',
        'GIF 파일 다운로드',
      ],
    },
    {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: [
        {
          '@type': 'Question',
          name: 'GIF 메이커로 어떤 이미지를 사용할 수 있나요?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'JPG, PNG, WebP, GIF 등 브라우저에서 지원하는 모든 이미지 형식을 사용할 수 있습니다. 여러 이미지를 한 번에 업로드하거나 드래그 앤 드롭으로 추가할 수 있습니다.',
          },
        },
        {
          '@type': 'Question',
          name: 'GIF 파일 크기는 어떻게 줄일 수 있나요?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: '출력 너비를 줄이거나 프레임 수를 줄이면 GIF 파일 크기를 줄일 수 있습니다. 작은 크기(예: 300~500px)와 적은 프레임(3~10장)으로 시작하는 것을 권장합니다.',
          },
        },
      ],
    },
  ]

  return (
    <>
      {jsonLd.map((ld, i) => (
        <script
          key={i}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(ld) }}
        />
      ))}
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 py-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <Suspense fallback={<div className="text-center">Loading...</div>}>
            <I18nWrapper>
        <Breadcrumb />
              <GifMaker />
              <div className="mt-8">

                <RelatedTools />

              </div>

            </I18nWrapper>
          </Suspense>
        </div>
      </div>
      {/* SEO 콘텐츠 */}
      <section className="max-w-4xl mx-auto px-4 pb-12">
        <div className="mt-12 border-t border-gray-200 dark:border-gray-700 pt-8">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
            GIF 메이커란?
          </h2>
          <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-6">
            GIF 메이커는 여러 장의 이미지(JPG·PNG·WebP 등)를 업로드하여 애니메이션 GIF를 무료로 만드는 온라인 도구입니다. 프레임 간격·출력 크기·반복 횟수를 자유롭게 설정하고 브라우저에서 즉시 미리볼 수 있으며, 별도 소프트웨어 없이 움짤(GIF)을 완성하고 다운로드할 수 있습니다.
          </p>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
            GIF 메이커 활용 팁
          </h3>
          <ul className="list-disc list-inside space-y-2 text-gray-700 dark:text-gray-300">
            <li><strong>파일 크기 줄이기:</strong> 출력 너비를 400~500px 이하로 설정하고 프레임 수를 5~10장으로 줄이면 GIF 파일 크기를 크게 낮출 수 있습니다.</li>
            <li><strong>프레임 간격 조절:</strong> 프레임 딜레이를 80~120ms로 설정하면 자연스러운 애니메이션 속도를 만들 수 있습니다.</li>
            <li><strong>무한 반복 설정:</strong> SNS 업로드용 움짤은 무한 반복(loop)으로 설정하고, 특정 횟수 재생이 필요한 경우 반복 횟수를 지정하세요.</li>
            <li><strong>이미지 순서 정렬:</strong> 업로드 전에 파일명에 숫자를 붙여 순서를 정리하거나, 드래그로 프레임 순서를 변경할 수 있습니다.</li>
          </ul>
        </div>
      </section>
    </>
  )
}
