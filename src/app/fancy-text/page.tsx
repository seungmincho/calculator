import { Metadata } from 'next'
import FancyText from '@/components/FancyText'
import I18nWrapper from '@/components/I18nWrapper'
import RelatedTools from '@/components/RelatedTools'

export const metadata: Metadata = {
  title: '텍스트 꾸미기 - 인스타·카톡 닉네임 특수문자 | 툴허브',
  description:
    '입력하면 30가지 글꼴(볼드·필기체·프랙처·동그라미·뒤집기)과 한글 꾸미기(초성·자음 분리), ꧁ ꧂ ★彡 닉네임 테두리 26종이 바로 보이고 누르면 복사. 인스타 소개 150자·카톡 닉네임 20자 글자 수 확인, 즐겨찾기까지.',
  keywords:
    '텍스트 꾸미기, 닉네임 꾸미기, 특수문자 닉네임, 인스타 폰트, 카톡 닉네임 특수문자, 한글 꾸미기, 초성 꾸미기, 유니코드 폰트, 볼드 텍스트, 필기체 폰트, 취소선, ꧁꧂',
  openGraph: {
    title: '텍스트 꾸미기 - 닉네임 특수문자 | 툴허브',
    description:
      '영문 글꼴 30종 + 한글 꾸미기 + ꧁ ꧂ 닉네임 테두리. 누르면 바로 복사, 인스타·카톡에 붙여넣기.',
    url: 'https://toolhub.ai.kr/fancy-text',
    siteName: '툴허브',
    locale: 'ko_KR',
    type: 'website',
    images: [{ url: 'https://toolhub.ai.kr/og/fancy-text.png', width: 1200, height: 630, alt: '텍스트 꾸미기' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: '텍스트 꾸미기 - 닉네임 특수문자 | 툴허브',
    description: '영문 글꼴 30종 + 한글 꾸미기 + 닉네임 테두리. 누르면 바로 복사.',
    images: ['https://toolhub.ai.kr/og/fancy-text.png'],
  },
  alternates: {
    canonical: 'https://toolhub.ai.kr/fancy-text/',
  },
}

export default function FancyTextPage() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: '텍스트 꾸미기',
    description:
      '영문 유니코드 글꼴 30종, 한글 꾸미기, 닉네임 테두리를 실시간 미리보기하고 한 번에 복사하는 무료 도구',
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
      '뒤집기(Upside Down) / 거울 반전(Mirror) / 전각 / 스몰캡 / 위첨자',
      '한글 꾸미기: 자음 분리, 초성, 초성 동그라미, 글자 사이 하트',
      '닉네임 테두리 26종 (꧁ ꧂, ★彡 彡★ 등)',
      '인스타 소개 150자 / 카톡 닉네임 20자 글자 수 확인',
      '즐겨찾기 고정 · 최근 복사 기록',
      '공유 링크(?t=)로 입력 복원',
    ],
  }

  const faqJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
      {
        '@type': 'Question',
        name: '텍스트 꾸미기란 무엇인가요?',
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
          text: '볼드·필기체 같은 글꼴 스타일은 유니코드에 영문·숫자만 있어서 한글은 그대로 남습니다(도구가 어떤 글자가 안 바뀌었는지 카드마다 표시). 대신 한글 탭의 자음 분리·초성·초성 동그라미·글자 사이 하트, 그리고 테두리 탭의 ꧁ ꧂ 같은 닉네임 장식은 한글에도 그대로 적용됩니다.',
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
      <div className="min-h-screen py-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
            <I18nWrapper>
              <FancyText />
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
            텍스트 꾸미기란?
          </h2>
          <p className="text-body leading-relaxed mb-6">
            텍스트 꾸미기는 영문 알파벳과 숫자를 유니코드 수학 기호 블록(Mathematical Alphanumeric Symbols) 등의 특수 문자로 바꿔 볼드·이탤릭·필기체·프랙처·이중선 등 30가지 스타일로 꾸미고, 한글은 자음 분리·초성·닉네임 테두리로 꾸미는 무료 온라인 도구입니다. 변환된 텍스트는 인스타그램·X(트위터)·유튜브·틱톡 등 SNS 프로필, 닉네임, 게시물에 별도 앱 없이 그대로 붙여넣기해서 사용할 수 있어 SNS 텍스트 꾸미기 도구로 인기입니다.
          </p>
          <h3 className="text-lg font-semibold text-fg mb-3">
            유니코드 텍스트 꾸미기 활용 팁
          </h3>
          <ul className="list-disc list-inside space-y-2 text-body">
            <li><strong>SNS 프로필 이름:</strong> 수학 볼드·이탤릭 스타일로 닉네임을 변환하면 플랫폼 기본 폰트에서도 강조 효과를 낼 수 있습니다.</li>
            <li><strong>게시물 강조:</strong> 스크립트나 프랙처 스타일로 제목이나 태그라인을 꾸미면 피드에서 시선을 끕니다.</li>
            <li><strong>즐겨찾기:</strong> 자주 쓰는 스타일에 별표를 누르면 다음에 와도 맨 위에 고정됩니다. 최근 복사한 결과도 다시 누르면 바로 복사돼요.</li>
            <li><strong>글자 수 확인:</strong> 인스타 소개(150자)·카톡 닉네임(20자) 기준을 고르면 꾸민 뒤 길이가 넘는 스타일이 빨갛게 표시됩니다.</li>
            <li><strong>폰트 지원 확인:</strong> 뒤집기(Upside Down)·거울 반전(Mirror)·전각 문자는 일부 기기에서 다르게 보일 수 있으므로 미리보기 후 사용하세요.</li>
          </ul>
        </div>
      </section>
    </>
  )
}
