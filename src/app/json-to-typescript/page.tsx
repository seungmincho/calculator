import { Metadata } from 'next'
import JsonToTypescript from '@/components/JsonToTypescript'
import I18nWrapper from '@/components/I18nWrapper'
import RelatedTools from '@/components/RelatedTools'
import messages from '../../../messages/generated/ko/ns/jsonToTypescript.json'

const TITLE = 'JSON → TypeScript 변환기 - interface 생성 | 툴허브'
const DESC = 'JSON을 붙여넣으면 TypeScript interface·type 선언을 바로 만들어요. 선택 필드(?)·null 합집합·배열 원소·중첩 객체 이름까지 추론하고, 브라우저 안에서만 변환해 서버로 보내지 않아요.'

export const metadata: Metadata = {
  title: TITLE,
  description: DESC,
  keywords: 'json to typescript, json to ts, json 타입스크립트 변환, json interface 변환, json 타입 변환, typescript interface 생성, json2ts, json 타입 자동 생성, json to interface, typescript type generator',
  openGraph: {
    title: TITLE,
    description: 'JSON을 TypeScript interface·type으로 변환 — 선택 필드·null 합집합·배열 타입 자동 추론',
    url: 'https://toolhub.ai.kr/json-to-typescript/',
    siteName: '툴허브', locale: 'ko_KR', type: 'website',
    images: [{ url: 'https://toolhub.ai.kr/og/json-to-typescript.png', width: 1200, height: 630, alt: 'JSON to TypeScript 변환기' }],
  },
  twitter: { card: 'summary_large_image', title: 'JSON to TypeScript 변환기 | 툴허브', description: 'JSON을 TypeScript interface·type으로 바로 변환', images: ['https://toolhub.ai.kr/og/json-to-typescript.png'] },
  alternates: { canonical: 'https://toolhub.ai.kr/json-to-typescript/' },
}

const faqs = messages.jsonToTypescript.guide.faq.items

export default function JsonToTypescriptPage() {
  const jsonLd = {
    '@context': 'https://schema.org', '@type': 'WebApplication',
    name: 'JSON to TypeScript 변환기',
    description: 'JSON을 TypeScript interface·type 선언으로 변환하는 브라우저 도구. 선택 필드·null 합집합·배열 원소 타입·중첩 객체 이름을 자동으로 추론한다.',
    url: 'https://toolhub.ai.kr/json-to-typescript/',
    applicationCategory: 'DeveloperApplication', operatingSystem: 'Any', browserRequirements: 'JavaScript',
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'KRW' },
    featureList: ['JSON → interface·type 실시간 변환', '객체 배열의 선택 필드(?) 추론', 'null·혼합 값 합집합 타입', '중첩 객체 별도 선언·같은 모양 중복 제거', 'export·readonly 옵션', '복사·.ts 파일 내려받기', '오류 행·열 표시', '브라우저 안에서만 처리'],
  }
  const faqJsonLd = {
    '@context': 'https://schema.org', '@type': 'FAQPage',
    mainEntity: faqs.map((f) => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })),
  }

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />
      <div className="min-h-screen py-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <I18nWrapper>
            <JsonToTypescript />
            <div className="mt-8">
              <RelatedTools />
            </div>
          </I18nWrapper>
        </div>
      </div>
    </>
  )
}
