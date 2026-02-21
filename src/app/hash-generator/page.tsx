import type { Metadata } from 'next'
import I18nWrapper from '@/components/I18nWrapper'
import HashGenerator from '@/components/HashGenerator'

export const metadata: Metadata = {
  title: '해시 생성기 - MD5, SHA-256, SHA-512 해시 변환 | 툴허브',
  description: '텍스트와 파일의 해시값을 생성합니다. MD5, SHA-1, SHA-256, SHA-384, SHA-512 알고리즘을 지원합니다.',
  keywords: '해시생성기, md5, sha256, sha512, 해시변환, 체크섬, hash generator',
  openGraph: {
    title: '해시 생성기 - 온라인 해시 변환 도구',
    description: '텍스트와 파일의 해시값을 생성하세요',
    type: 'website',
  },
  alternates: {
    canonical: 'https://toolhub.ai.kr/hash-generator',
  },
}

export default function HashGeneratorPage() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: '해시 생성기',
    description: '텍스트와 파일의 해시값을 생성합니다. MD5, SHA-1, SHA-256, SHA-384, SHA-512 알고리즘을 지원합니다.',
    url: 'https://toolhub.ai.kr/hash-generator',
    applicationCategory: 'DeveloperApplication',
    operatingSystem: 'Any',
    browserRequirements: 'JavaScript',
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'KRW' },
    featureList: ['MD5 해시', 'SHA-1 해시', 'SHA-256 해시', 'SHA-512 해시', '파일 해시']
  }

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <I18nWrapper>
        <HashGenerator />
      </I18nWrapper>
    </>
  )
}
