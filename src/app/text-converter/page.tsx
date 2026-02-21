import type { Metadata } from 'next'
import I18nWrapper from '@/components/I18nWrapper'
import TextConverter from '@/components/TextConverter'

export const metadata: Metadata = {
  title: '텍스트 변환기 - 대소문자, 케이스 변환 | 툴허브',
  description: '텍스트 대소문자 변환, camelCase, snake_case, kebab-case 등 다양한 케이스 변환을 지원합니다.',
  keywords: '텍스트변환, 대소문자변환, camelcase, snakecase, kebabcase, 케이스변환, text converter',
  openGraph: {
    title: '텍스트 변환기 - 케이스 변환 도구',
    description: '다양한 텍스트 케이스를 손쉽게 변환하세요',
    type: 'website',
  },
  alternates: {
    canonical: 'https://toolhub.ai.kr/text-converter',
  },
}

export default function TextConverterPage() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: '텍스트 변환기',
    description: '텍스트 대소문자 변환, camelCase, snake_case, kebab-case 등 다양한 케이스 변환을 지원합니다.',
    url: 'https://toolhub.ai.kr/text-converter',
    applicationCategory: 'UtilityApplication',
    operatingSystem: 'Any',
    browserRequirements: 'JavaScript',
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'KRW' },
    featureList: ['대소문자 변환', 'camelCase 변환', 'snake_case 변환', 'kebab-case 변환', 'URI 인코딩']
  }

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <I18nWrapper>
        <TextConverter />
      </I18nWrapper>
    </>
  )
}
