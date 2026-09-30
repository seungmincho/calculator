import type { Metadata } from 'next'
import I18nWrapper from '@/components/I18nWrapper'
import CharacterCounter from '@/components/CharacterCounter'
import RelatedTools from '@/components/RelatedTools'

export const metadata: Metadata = {
  title: '글자수 세기 - 글자수, 단어수, 문장수 카운터 | 툴허브',
  description: '자소서 글자수 세기: 공백 포함·제외 글자수와 잡코리아·사람인 방식 바이트(한글 2byte), 원고지 매수, 목표 글자수 진행률을 실시간으로 확인하세요. 문항 5개 자동 저장, X·인스타 제한도 지원.',
  keywords: '글자수세기, 글자수카운터, 단어수세기, 문자수세기, 텍스트분석, SNS글자수, 트위터글자수',
  openGraph: {
    title: '글자수 세기 - 실시간 텍스트 분석',
    description: '글자수, 단어수, 문장수를 실시간으로 분석하세요',
    type: 'website',
    siteName: '툴허브',
    url: 'https://toolhub.ai.kr/character-counter',
    locale: 'ko_KR',
    images: [{ url: 'https://toolhub.ai.kr/og/character-counter.png', width: 1200, height: 630, alt: '글자수 세기' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: '글자수 세기 - 글자수, 단어수, 문장수 카운터',
    description: '자소서 글자수 세기: 공백 포함·제외 글자수와 잡코리아·사람인 방식 바이트(한글 2byte), 원고지 매수, 목표 글자수 진행률을 실시간으로 확인하세요. 문항 5개 자동 저장, X·인스타 제한도 지원.',
    images: ['https://toolhub.ai.kr/og/character-counter.png'],
  },
  alternates: {
    canonical: 'https://toolhub.ai.kr/character-counter/',
  },
}

export default function CharacterCounterPage() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: '글자수 세기',
    description: '자소서 글자수 세기: 공백 포함·제외 글자수와 잡코리아·사람인 방식 바이트(한글 2byte), 원고지 매수, 목표 글자수 진행률을 실시간으로 확인하세요. 문항 5개 자동 저장, X·인스타 제한도 지원.',
    url: 'https://toolhub.ai.kr/character-counter',
    applicationCategory: 'UtilityApplication',
    operatingSystem: 'Any',
    browserRequirements: 'JavaScript',
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'KRW' },
    featureList: ['공백 포함/제외 글자수', '잡코리아·사람인 방식 바이트(한글 2byte)', 'UTF-8 바이트', '목표 글자수 진행률', '자소서 문항 5개 자동 저장', '원고지 매수', 'X(트위터) 가중 글자수', '자주 쓴 단어 분석', '공백·줄바꿈 정리']
  }

  const faqJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
      {
        '@type': 'Question',
        name: '글자수 세기에서 공백 포함/제외 차이는?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: '공백 포함 글자수는 띄어쓰기와 줄바꿈까지 모두 센 수이고, 공백 제외 글자수는 띄어쓰기·탭·줄바꿈을 뺀 수입니다. 자기소개서는 기업마다 기준이 다르므로 지원서 안내 문구를 확인하세요.',
        },
      },
      {
        '@type': 'Question',
        name: '자소서 바이트(byte)는 어떻게 계산하나요?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: '잡코리아·사람인 글자수 세기는 한글 등 비영문 글자를 2byte, 영문·숫자·공백·줄바꿈을 1byte로 셉니다. 예를 들어 1,000byte 제한이면 한글만 쓸 때 약 500자입니다. UTF-8로 저장하는 시스템에서는 한글이 3byte라 결과가 다를 수 있습니다.',
        },
      },
      {
        '@type': 'Question',
        name: 'X(트위터)에서 한글은 몇 자까지 쓸 수 있나요?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'X는 280 가중치 한도를 쓰며 영문·숫자는 1, 한글·한자·일본어와 이모지는 2로 셉니다. 한글만 쓰면 140자, 링크는 길이와 상관없이 23으로 계산됩니다.',
        },
      },
    ],
  }

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />
      <I18nWrapper>
        <CharacterCounter />
        <div className="mt-8">

          <RelatedTools />

        </div>

      </I18nWrapper>
      {/* SEO 콘텐츠 */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pb-12">
        <div className="mt-12 border-t border-line pt-8">
          <h2 className="text-xl font-bold text-fg mb-4">
            글자수 세기란?
          </h2>
          <p className="text-body leading-relaxed mb-6">
            글자수 세기 도구는 <strong>공백 포함·제외 글자수, 바이트, 단어·문장·문단 수, 원고지 매수를 실시간으로 분석</strong>하는 무료 온라인 카운터입니다. 자기소개서 문항별 목표 글자수, 대학 리포트, 공모전 응모, SNS 게시글처럼 글자수 제한이 있는 글에 쓸 수 있습니다. 이모지 조합이나 결합 문자도 화면에 보이는 한 글자로 세며, 입력한 글은 서버로 보내지 않고 이 브라우저에만 저장됩니다.
          </p>
          <h3 className="text-lg font-semibold text-fg mb-3">
            글자수 세기 활용 팁
          </h3>
          <ul className="list-disc list-inside space-y-2 text-body">
            <li><strong>자소서 바이트:</strong> 잡코리아·사람인 방식은 한글 2byte, 영문·숫자·공백·줄바꿈 1byte입니다. 1,000byte 제한이면 한글 약 500자입니다.</li>
            <li><strong>공백 포함/제외 확인:</strong> 기업마다 기준이 다르니 지원서 안내 문구를 먼저 확인하고 목표 기준을 맞춰 두세요.</li>
            <li><strong>SNS 제한 확인:</strong> X(트위터)는 280 가중치(한글 1자 = 2, 한글만 140자), 인스타그램 캡션은 2,200자, 유튜브 제목은 100자입니다.</li>
            <li><strong>원고지 매수:</strong> 200자 원고지(20칸×10줄) 기준으로 문단 들여쓰기와 영문 소문자·숫자 2자 1칸 규칙을 반영한 간이 계산입니다.</li>
            <li><strong>반복 표현 줄이기:</strong> 자주 쓴 단어를 눌러 본문에서 강조해 보고, 같은 표현이 몰린 곳을 다른 말로 바꿔 보세요.</li>
          </ul>
        </div>
      </section>
    </>
  )
}
