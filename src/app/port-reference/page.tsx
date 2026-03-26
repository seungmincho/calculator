import type { Metadata } from 'next'
import { Suspense } from 'react'
import I18nWrapper from '@/components/I18nWrapper'
import PortReference from '@/components/PortReference'
import RelatedTools from '@/components/RelatedTools'

export const metadata: Metadata = {
  title: '포트 번호 레퍼런스 - TCP/UDP 검색 | 툴허브',
  description: '잘 알려진 TCP/UDP 포트 번호를 빠르게 검색하세요. HTTP, HTTPS, SSH, MySQL, PostgreSQL, Redis 등 60개 이상의 주요 포트 번호와 보안 주의사항을 확인할 수 있습니다.',
  keywords: '포트번호, TCP포트, UDP포트, 포트검색, well-known port, HTTP포트, HTTPS포트, SSH포트, MySQL포트, 데이터베이스포트, 방화벽포트',
  openGraph: {
    title: '포트 번호 레퍼런스 - TCP/UDP 검색 | 툴허브',
    description: '잘 알려진 TCP/UDP 포트 번호를 빠르게 검색하세요. 60개 이상의 주요 포트와 보안 주의사항 제공.',
    type: 'website',
    siteName: '툴허브',
    url: 'https://toolhub.ai.kr/port-reference',
    locale: 'ko_KR',
  },
  twitter: {
    card: 'summary_large_image',
    title: '포트 번호 레퍼런스 - TCP/UDP 검색',
    description: '잘 알려진 TCP/UDP 포트 번호를 빠르게 검색하세요. HTTP, SSH, MySQL 등 60개 이상의 주요 포트 번호 제공.',
  },
  alternates: {
    canonical: 'https://toolhub.ai.kr/port-reference/',
  },
}

export default function PortReferencePage() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: '포트 번호 레퍼런스',
    description: '잘 알려진 TCP/UDP 포트 번호를 빠르게 검색하고 확인할 수 있는 개발자 레퍼런스 도구',
    url: 'https://toolhub.ai.kr/port-reference',
    applicationCategory: 'DeveloperApplication',
    operatingSystem: 'Any',
    browserRequirements: 'JavaScript',
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'KRW' },
    featureList: [
      '포트 번호/서비스명/설명 통합 검색',
      '잘 알려진/등록/동적 포트 범주 필터',
      'TCP/UDP 프로토콜 필터',
      '60개 이상 주요 포트 데이터',
      '보안 주의사항 안내',
      '포트 번호 복사',
    ],
  }

  const faqJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
      {
        '@type': 'Question',
        name: '잘 알려진 포트(Well-Known Port)란 무엇인가요?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: '잘 알려진 포트는 0~1023 범위의 포트 번호로, IANA(인터넷 할당 번호 기관)에서 표준 서비스에 할당한 포트입니다. HTTP(80), HTTPS(443), SSH(22), FTP(21), SMTP(25) 등이 이에 해당합니다. 서버에서 이 포트를 열려면 일반적으로 관리자(root) 권한이 필요합니다.',
        },
      },
      {
        '@type': 'Question',
        name: 'TCP와 UDP의 차이점은 무엇인가요?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'TCP(Transmission Control Protocol)는 연결 지향 프로토콜로 데이터의 신뢰성 있는 전송을 보장합니다. 패킷 손실 시 재전송하며 순서를 보장합니다. HTTP, HTTPS, SSH, FTP 등에서 사용됩니다. UDP(User Datagram Protocol)는 비연결 프로토콜로 빠르지만 신뢰성을 보장하지 않습니다. DNS, DHCP, 스트리밍, 게임 등 속도가 중요한 서비스에 사용됩니다.',
        },
      },
      {
        '@type': 'Question',
        name: '방화벽에서 포트를 열 때 주의할 점은 무엇인가요?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: '방화벽 포트를 열 때는 최소 권한 원칙을 따르세요. 필요한 포트만 열고, 특정 IP 대역으로 접근을 제한하세요. Telnet(23), FTP(21)처럼 암호화되지 않은 프로토콜은 SSH, SFTP로 대체하는 것이 좋습니다. 데이터베이스 포트(3306, 5432 등)는 외부에 직접 노출하지 말고 VPN이나 SSH 터널을 사용하세요. 정기적으로 열린 포트를 감사하고 불필요한 포트는 닫으세요.',
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
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 dark:from-gray-900 dark:to-gray-800 py-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <Suspense fallback={<div className="text-center py-12 text-gray-500">Loading...</div>}>
            <I18nWrapper>
              <PortReference />
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
