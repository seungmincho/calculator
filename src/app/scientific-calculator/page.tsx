import { Metadata } from 'next'
import ScientificCalculator from '@/components/ScientificCalculator'
import I18nWrapper from '@/components/I18nWrapper'
import RelatedTools from '@/components/RelatedTools'
import { FaqJsonLd } from '@/components/ToolFaq'
import messages from '../../../messages/generated/ko/ns/scientificCalculator.json'

const TITLE = '공학용 계산기 - 온라인 삼각함수·로그·지수 계산 | 툴허브'
const DESC = '사칙연산과 괄호는 물론 sin·cos·tan, 역삼각함수, log·ln, 제곱근·거듭제곱, 팩토리얼, 순열·조합까지 계산하는 무료 온라인 공학용 계산기. 도·라디안 전환, 입력 중 결과 미리 보기, 키보드 입력, 계산 기록 20개, 결과 링크 공유를 지원해요.'
const PAGE_URL = 'https://toolhub.ai.kr/scientific-calculator/'
const OG = 'https://toolhub.ai.kr/og/scientific-calculator.png'

export const metadata: Metadata = {
  title: TITLE,
  description: DESC,
  keywords: '공학용 계산기, 온라인 공학용 계산기, 공학계산기, 계산기, 온라인 계산기, 삼각함수 계산기, 로그 계산기, 루트 계산기, 팩토리얼 계산',
  openGraph: {
    title: TITLE,
    description: '삼각함수·로그·거듭제곱·팩토리얼·도/라디안 전환과 계산 기록을 지원하는 온라인 공학용 계산기',
    url: PAGE_URL,
    siteName: '툴허브', locale: 'ko_KR', type: 'website',
    images: [{ url: OG, width: 1200, height: 630, alt: '공학용 계산기' }],
  },
  twitter: { card: 'summary_large_image', title: '공학용 계산기 | 툴허브', description: '삼각함수·로그·지수·팩토리얼을 바로 계산하는 온라인 공학용 계산기', images: [OG] },
  alternates: { canonical: PAGE_URL },
}

export default function ScientificCalculatorPage() {
  const jsonLd = {
    '@context': 'https://schema.org', '@type': 'WebApplication',
    name: '공학용 계산기',
    description: '사칙연산·괄호·거듭제곱·삼각함수·역삼각함수·쌍곡선 함수·상용로그·자연로그·제곱근·팩토리얼·순열·조합을 계산하는 온라인 공학용 계산기. 도·라디안 전환과 계산 기록, 결과 링크 공유를 지원한다.',
    url: PAGE_URL,
    applicationCategory: 'UtilityApplication', operatingSystem: 'Any', browserRequirements: 'JavaScript',
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'KRW' },
    featureList: [
      '사칙연산·괄호·거듭제곱과 연산 우선순위',
      'sin·cos·tan, 역삼각함수, 쌍곡선 함수와 도·라디안 전환',
      'log·ln·log₂, 제곱근·세제곱근, 팩토리얼, 순열·조합',
      '입력 중 결과 미리 보기, 유효숫자 12자리 표시',
      '키보드 입력과 직전 결과(Ans) 이어 계산',
      '계산 기록 20개 저장, 결과 링크 공유',
    ],
  }

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <FaqJsonLd items={messages.scientificCalculator.guide.faq.items} />
      <div className="min-h-screen py-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <I18nWrapper>
            <ScientificCalculator />
            <div className="mt-8">
              <RelatedTools />
            </div>
          </I18nWrapper>
        </div>
      </div>
    </>
  )
}
