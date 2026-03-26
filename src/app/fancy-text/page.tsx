import { Metadata } from 'next'
import { Suspense } from 'react'
import FancyText from '@/components/FancyText'
import I18nWrapper from '@/components/I18nWrapper'
import RelatedTools from '@/components/RelatedTools'

export const metadata: Metadata = {
  title: '유니코드 텍스트 꾸미기 - SNS 특수문자, 글꼴 변환 | 툴허브',
  description:
    '영문 텍스트를 수학 볼드·이탤릭·이중선·프랙처·스크립트·모노스페이스 등 15가지 유니코드 스타일로 즉시 변환. SNS 프로필, 닉네임, 인스타그램·X·유튜브 게시물에 개성 있는 텍스트를 무료로 만들어 보세요.',
  keywords:
    '유니코드 텍스트, 특수문자 변환, SNS 텍스트 꾸미기, 인스타그램 폰트, 유니코드 폰트, 텍스트 스타일, 이모지 텍스트, 볼드 텍스트, 이탤릭 텍스트, 취소선, 밑줄',
  openGraph: {
    title: '유니코드 텍스트 꾸미기 | 툴허브',
    description:
      '영문 텍스트를 15가지 유니코드 스타일로 변환. 볼드, 이탤릭, 이중선, 스크립트, 프랙처, 취소선 등 SNS에 바로 사용 가능.',
    url: 'https://toolhub.ai.kr/fancy-text',
    siteName: '툴허브',
    locale: 'ko_KR',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: '유니코드 텍스트 꾸미기 | 툴허브',
    description: '영문 텍스트를 15가지 유니코드 스타일로 변환. SNS 프로필·게시물에 바로 사용.',
  },
  alternates: {
    canonical: 'https://toolhub.ai.kr/fancy-text/',
  },
}

export default function FancyTextPage() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: '유니코드 텍스트 꾸미기',
    description:
      '영문 텍스트를 수학 볼드·이탤릭·이중선·프랙처·스크립트 등 15가지 유니코드 스타일로 변환하는 무료 온라인 도구',
    url: 'https://toolhub.ai.kr/fancy-text',
    applicationCategory: 'UtilityApplication',
    operatingSystem: 'Any',
    browserRequirements: 'JavaScript',
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'KRW' },
    featureList: [
      '수학 볼드/이탤릭/볼드이탤릭 변환',
      '이중선(Outlined) 텍스트',
      '모노스페이스 변환',
      '스크립트/볼드스크립트',
      '프랙처/볼드프랙처',
      '산세리프/산세리프볼드/이탤릭/볼드이탤릭',
      '동그라미(Circled) 텍스트',
      '사각형(Squared) / 반전 사각형',
      '취소선(Strikethrough) / 밑줄(Underline)',
      '뒤집기(Upside Down)',
      '거울 반전(Mirror)',
      '전각 문자(Full Width)',
      '원클릭 클립보드 복사',
      '전체 스타일 한번에 복사',
    ],
  }

  const faqJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
      {
        '@type': 'Question',
        name: '유니코드 텍스트 꾸미기란 무엇인가요?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: '유니코드 수학 기호 블록(U+1D400~U+1D7FF)의 특수 문자를 활용해 영문 텍스트를 볼드, 이탤릭, 스크립트, 프랙처, 이중선 등 다양한 시각적 스타일로 변환하는 도구입니다. SNS 프로필, 닉네임, 게시물에 개성 있는 텍스트를 만들 수 있습니다.',
        },
      },
      {
        '@type': 'Question',
        name: '한글도 변환되나요?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: '아니요. 유니코드 수학 기호 블록은 영문 알파벳(a-z, A-Z)만 지원합니다. 한글, 한자, 숫자, 기호는 원래 형태 그대로 유지됩니다.',
        },
      },
      {
        '@type': 'Question',
        name: '변환된 텍스트를 SNS에 그대로 사용할 수 있나요?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: '네. 클립보드에 복사된 유니코드 텍스트는 인스타그램, X(트위터), 페이스북, 유튜브 등 대부분의 SNS에 붙여넣기해 바로 사용 가능합니다. 단, 일부 플랫폼은 특수 유니코드 사용을 제한할 수 있습니다.',
        },
      },
      {
        '@type': 'Question',
        name: '취소선, 밑줄은 어떻게 적용되나요?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: '취소선(U+0336)과 밑줄(U+0332)은 유니코드 결합 문자(Combining Character)입니다. 각 글자 뒤에 결합 문자가 붙어 시각적으로 줄이 그어진 것처럼 표시됩니다.',
        },
      },
      {
        '@type': 'Question',
        name: '모든 기기에서 동일하게 보이나요?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: '폰트 지원 여부에 따라 기기마다 렌더링이 다를 수 있습니다. 수학 기호 유니코드를 지원하지 않는 폰트에서는 빈 사각형(두부)으로 표시될 수 있습니다.',
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
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 py-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <Suspense fallback={<div className="text-center text-gray-500 py-20">Loading...</div>}>
            <I18nWrapper>
              <FancyText />
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
            유니코드 텍스트 꾸미기란?
          </h2>
          <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-6">
            유니코드 텍스트 꾸미기는 영문 알파벳을 유니코드 수학 기호 블록(Mathematical Alphanumeric Symbols)의 특수 문자로 변환하여 볼드·이탤릭·스크립트·프랙처·이중선 등 15가지 스타일로 꾸미는 무료 온라인 도구입니다. 변환된 텍스트는 인스타그램·X(트위터)·유튜브·틱톡 등 SNS 프로필, 닉네임, 게시물에 별도 앱 없이 그대로 붙여넣기해서 사용할 수 있어 SNS 텍스트 꾸미기 도구로 인기입니다.
          </p>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
            유니코드 텍스트 꾸미기 활용 팁
          </h3>
          <ul className="list-disc list-inside space-y-2 text-gray-700 dark:text-gray-300">
            <li><strong>SNS 프로필 이름:</strong> 수학 볼드·이탤릭 스타일로 닉네임을 변환하면 플랫폼 기본 폰트에서도 강조 효과를 낼 수 있습니다.</li>
            <li><strong>게시물 강조:</strong> 스크립트나 프랙처 스타일로 제목이나 태그라인을 꾸미면 피드에서 시선을 끕니다.</li>
            <li><strong>전체 복사:</strong> 모든 스타일을 한 번에 복사하는 기능으로 원하는 스타일을 빠르게 골라 사용하세요.</li>
            <li><strong>폰트 지원 확인:</strong> 뒤집기(Upside Down)·거울 반전(Mirror)·전각 문자는 일부 기기에서 다르게 보일 수 있으므로 미리보기 후 사용하세요.</li>
          </ul>
        </div>
      </section>
    </>
  )
}
