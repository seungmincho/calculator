import type { Metadata } from 'next'
import I18nWrapper from '@/components/I18nWrapper'
import Breadcrumb from '@/components/Breadcrumb'
import Base64Converter from '@/components/Base64Converter'
import RelatedTools from '@/components/RelatedTools'

export const metadata: Metadata = {
  title: 'Base64 인코더/디코더 - 텍스트, 이미지 변환 | 툴허브',
  description: 'Base64 인코딩/디코딩 도구. 텍스트를 Base64로 변환하거나 Base64를 원본으로 복원합니다. 이미지 파일도 지원합니다.',
  keywords: 'base64, 인코더, 디코더, 인코딩, 디코딩, 변환, 이미지변환, 텍스트변환',
  openGraph: {
    title: 'Base64 인코더/디코더 - 온라인 변환 도구',
    description: '텍스트와 파일을 Base64로 인코딩/디코딩하세요',
    type: 'website',
    siteName: '툴허브',
    url: 'https://toolhub.ai.kr/base64-converter',
    locale: 'ko_KR',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Base64 인코더/디코더 - 텍스트, 이미지 변환',
    description: 'Base64 인코딩/디코딩 도구. 텍스트를 Base64로 변환하거나 Base64를 원본으로 복원합니다. 이미지 파일도 지원합니다.',
  },
  alternates: {
    canonical: 'https://toolhub.ai.kr/base64-converter/',
  },
}

export default function Base64ConverterPage() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: 'Base64 변환기',
    description: 'Base64 인코딩/디코딩 도구. 텍스트를 Base64로 변환하거나 Base64를 원본으로 복원합니다. 이미지 파일도 지원합니다.',
    url: 'https://toolhub.ai.kr/base64-converter',
    applicationCategory: 'DeveloperApplication',
    operatingSystem: 'Any',
    browserRequirements: 'JavaScript',
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'KRW' },
    featureList: ['Base64 인코딩', 'Base64 디코딩', '파일 변환', 'URL-safe Base64']
  }

  const faqJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
      {
        '@type': 'Question',
        name: 'Base64 인코딩이란 무엇인가요?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'Base64는 바이너리 데이터를 ASCII 문자열로 변환하는 인코딩 방식입니다. A-Z, a-z, 0-9, +, / 총 64개 문자를 사용하며, 패딩에 = 문자를 사용합니다. 주요 용도: ① 이메일 첨부파일(MIME) ② HTML/CSS에 이미지 인라인 삽입(data URI) ③ API 인증 토큰(Basic Auth) ④ JWT 토큰 페이로드. 인코딩 후 크기는 원본의 약 133%로 증가합니다.',
        },
      },
      {
        '@type': 'Question',
        name: 'Base64와 URL-safe Base64의 차이는?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: '표준 Base64는 +, /, = 문자를 사용하는데, 이들은 URL에서 특수한 의미를 가져 문제를 일으킵니다. URL-safe Base64는 +를 -, /를 _로 대체하고, 패딩(=)을 생략합니다. JWT 토큰, URL 파라미터, 파일명에는 URL-safe Base64를 사용해야 합니다. RFC 4648에 정의되어 있으며, 대부분의 프로그래밍 언어에서 지원됩니다.',
        },
      },
    ],
  }

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />
      <I18nWrapper>
        <Breadcrumb />
        <Base64Converter />
        <div className="mt-8">

          <RelatedTools />

        </div>

      </I18nWrapper>
      {/* SEO 콘텐츠 */}
      <section className="max-w-4xl mx-auto px-4 pb-12">
        <div className="mt-12 border-t border-gray-200 dark:border-gray-700 pt-8">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
            Base64 인코더/디코더란?
          </h2>
          <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-6">
            Base64 변환기는 텍스트나 파일을 Base64 형식으로 인코딩하거나, Base64 문자열을 원본으로 디코딩하는 무료 온라인 도구입니다. Base64는 바이너리 데이터를 ASCII 문자열로 변환하는 방식으로, 이메일 첨부파일(MIME), HTML/CSS 인라인 이미지(data URI), JWT 토큰 페이로드, API 인증(Basic Auth) 등 다양한 분야에서 활용됩니다. 이미지 파일을 Base64로 변환하여 CSS나 HTML에 직접 삽입할 수도 있습니다.
          </p>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
            Base64 변환기 활용 팁
          </h3>
          <ul className="list-disc list-inside space-y-2 text-gray-700 dark:text-gray-300">
            <li><strong>이미지 인라인 삽입:</strong> 작은 아이콘 이미지를 Base64로 변환해 CSS background-image나 HTML img src에 직접 삽입하면 HTTP 요청을 줄일 수 있습니다.</li>
            <li><strong>JWT 토큰 분석:</strong> JWT의 두 번째 부분(페이로드)은 Base64URL로 인코딩되어 있으므로 디코딩하면 사용자 정보를 확인할 수 있습니다.</li>
            <li><strong>URL-safe Base64 선택:</strong> URL 파라미터나 파일명에 사용할 때는 표준 Base64 대신 URL-safe Base64(+→-, /→_, = 생략)를 사용하세요.</li>
            <li><strong>용량 증가 고려:</strong> Base64 인코딩 후 데이터 크기는 원본의 약 133%로 증가하므로, 대용량 파일 전송에는 적합하지 않습니다.</li>
            <li><strong>한글 인코딩:</strong> 한글 등 멀티바이트 문자는 UTF-8로 먼저 인코딩된 후 Base64로 변환되므로 디코딩 시에도 UTF-8 설정이 필요합니다.</li>
          </ul>
        </div>
      </section>
    </>
  )
}
