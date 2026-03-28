import { Metadata } from 'next'
import { Suspense } from 'react'
import TcpHandshakeVisualizer from '@/components/TcpHandshakeVisualizer'
import I18nWrapper from '@/components/I18nWrapper'
import Breadcrumb from '@/components/Breadcrumb'
import RelatedTools from '@/components/RelatedTools'

export const metadata: Metadata = {
  title: 'TCP 핸드셰이크 시각화 - 3-way Handshake 과정 학습 | 툴허브',
  description: 'TCP 3-way Handshake와 4-way Termination 과정을 인터랙티브 시각화로 학습하세요. SYN, SYN-ACK, ACK 패킷 흐름과 시퀀스 번호, 연결 상태 변화를 단계별로 이해할 수 있습니다.',
  keywords: 'TCP 핸드셰이크, 3-way handshake, SYN, ACK, TCP 연결, 네트워크, 소켓, 4-way termination, 시퀀스 번호',
  openGraph: {
    title: 'TCP 핸드셰이크 시각화 | 툴허브',
    description: 'TCP 3-way Handshake 과정을 인터랙티브 애니메이션으로 학습하세요.',
    url: 'https://toolhub.ai.kr/tcp-handshake',
    siteName: '툴허브',
    locale: 'ko_KR',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'TCP 핸드셰이크 시각화',
    description: 'SYN → SYN-ACK → ACK 과정을 단계별 애니메이션으로 이해',
  },
  alternates: {
    canonical: 'https://toolhub.ai.kr/tcp-handshake',
  },
}

export default function TcpHandshakePage() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: 'TCP 핸드셰이크 시각화',
    description: 'TCP 3-way Handshake와 4-way Termination 과정을 인터랙티브 시각화로 학습하는 교육 도구',
    url: 'https://toolhub.ai.kr/tcp-handshake',
    applicationCategory: 'EducationalApplication',
    operatingSystem: 'Any',
    browserRequirements: 'JavaScript',
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'KRW' },
    featureList: [
      'TCP 3-way Handshake 시각화',
      '4-way Termination 시각화',
      '데이터 전송 과정',
      '시퀀스/ACK 번호 추적',
      '연결 상태 다이어그램',
      '단계별 실행 및 자동 재생',
    ],
  }

  const faqJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
      {
        '@type': 'Question',
        name: 'TCP 3-way Handshake란 무엇인가요?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'TCP 3-way Handshake는 클라이언트와 서버 간에 신뢰할 수 있는 TCP 연결을 수립하기 위한 3단계 과정입니다. 클라이언트가 SYN 패킷을 보내고, 서버가 SYN-ACK으로 응답하며, 클라이언트가 ACK를 보내면 연결이 설정됩니다.',
        },
      },
      {
        '@type': 'Question',
        name: 'TCP 연결 종료는 왜 4-way인가요?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'TCP 연결 종료가 4단계인 이유는 양방향 연결을 각각 독립적으로 종료해야 하기 때문입니다. 한쪽이 FIN을 보내 자신의 송신을 종료하더라도 상대방은 아직 보낼 데이터가 있을 수 있어, 각 방향의 종료에 FIN+ACK 쌍이 필요합니다.',
        },
      },
      {
        '@type': 'Question',
        name: 'SYN과 ACK 번호는 어떻게 작동하나요?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: '시퀀스(SEQ) 번호는 송신 데이터의 바이트 위치를 나타내고, 확인응답(ACK) 번호는 수신 측이 다음에 기대하는 바이트 번호입니다. 3-way Handshake에서 각 측은 랜덤 초기 시퀀스 번호(ISN)를 선택하고, SYN/FIN 플래그는 시퀀스 번호를 1 증가시킵니다.',
        },
      },
    ],
  }

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-cyan-100 dark:from-gray-900 dark:to-gray-800 py-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <Suspense fallback={<div className="text-center py-12">Loading...</div>}>
            <I18nWrapper>
              <Breadcrumb />
              <TcpHandshakeVisualizer />
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
