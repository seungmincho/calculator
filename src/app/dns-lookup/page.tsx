import type { Metadata } from 'next'
import { Suspense } from 'react'
import I18nWrapper from '@/components/I18nWrapper'
import DnsLookupVisualizer from '@/components/DnsLookupVisualizer'
import Breadcrumb from '@/components/Breadcrumb'
import RelatedTools from '@/components/RelatedTools'

export const metadata: Metadata = {
  title: 'DNS 조회 과정 시각화 - 도메인 → IP 변환 과정 학습 | 툴허브',
  description: 'DNS(Domain Name System) 조회 과정을 단계별 애니메이션으로 시각화합니다. 브라우저 캐시, 재귀 리졸버, 루트/TLD/권한 네임서버를 거치는 전체 흐름을 인터랙티브하게 학습하세요.',
  keywords: 'DNS 조회, DNS 동작 원리, 도메인 네임 시스템, 재귀 조회, 반복 조회, 루트 네임서버, DNS 캐시, A 레코드, CNAME, MX 레코드',
  openGraph: {
    title: 'DNS 조회 과정 시각화 | 툴허브',
    description: 'DNS 조회 과정을 단계별 애니메이션으로 학습하세요',
    url: 'https://toolhub.ai.kr/dns-lookup',
    siteName: '툴허브',
    locale: 'ko_KR',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'DNS 조회 과정 시각화',
    description: '도메인 → IP 변환 과정을 인터랙티브 시각화로 학습',
  },
  alternates: {
    canonical: 'https://toolhub.ai.kr/dns-lookup/',
  },
}

export default function DnsLookupPage() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: 'DNS 조회 과정 시각화',
    description: 'DNS 조회 과정을 단계별 애니메이션으로 시각화하는 교육 도구. 브라우저 캐시, 재귀 리졸버, 루트/TLD/권한 네임서버 흐름을 학습합니다.',
    url: 'https://toolhub.ai.kr/dns-lookup',
    applicationCategory: 'EducationalApplication',
    operatingSystem: 'Any',
    browserRequirements: 'JavaScript',
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'KRW' },
    featureList: [
      'DNS 조회 단계별 시각화',
      '캐시 히트/미스 시뮬레이션',
      'A/AAAA/CNAME/MX 레코드 타입',
      'CNAME 체인 시뮬레이션',
      '자동 재생 및 단계별 제어',
      '서버 간 쿼리/응답 애니메이션',
    ],
  }

  const faqJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
      {
        '@type': 'Question',
        name: 'DNS 조회란 무엇인가요?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'DNS 조회는 사람이 읽을 수 있는 도메인 이름(예: www.example.com)을 컴퓨터가 이해하는 IP 주소(예: 93.184.216.34)로 변환하는 과정입니다. 브라우저가 웹사이트에 접속할 때 가장 먼저 수행되는 네트워크 작업입니다.',
        },
      },
      {
        '@type': 'Question',
        name: 'DNS 재귀 조회와 반복 조회의 차이는?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: '재귀 조회는 클라이언트가 DNS 리졸버에게 최종 답을 요청하면, 리졸버가 다른 서버들을 대신 조회하여 완전한 답을 돌려주는 방식입니다. 반복 조회는 리졸버가 각 네임서버에게 다음 단계의 서버 주소만 받아 직접 순차적으로 조회하는 방식입니다.',
        },
      },
      {
        '@type': 'Question',
        name: 'DNS 캐시는 왜 필요한가요?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'DNS 캐시는 이전에 조회한 DNS 결과를 임시 저장하여 같은 도메인을 다시 조회할 때 전체 DNS 조회 과정을 생략합니다. 이를 통해 응답 시간을 수 밀리초로 단축하고, DNS 서버 부하를 줄이며, 네트워크 트래픽을 절약합니다. TTL(Time To Live) 값에 따라 캐시 유지 시간이 결정됩니다.',
        },
      },
    ],
  }

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-violet-100 dark:from-gray-900 dark:to-gray-800 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <Suspense fallback={<div className="text-center py-12">Loading...</div>}>
            <I18nWrapper>
              <Breadcrumb />
              <DnsLookupVisualizer />
              <div className="mt-8">
                <RelatedTools />
              </div>
            </I18nWrapper>
          </Suspense>
        </div>
      </div>
    </>
  )
}
