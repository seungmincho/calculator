import { Metadata } from 'next'
import { Suspense } from 'react'
import QrGenerator from '@/components/QrGenerator'
import I18nWrapper from '@/components/I18nWrapper'

export const metadata: Metadata = {
  title: 'QR 코드 생성기 | 툴허브 - 무료 QR 코드 제작 도구',
  description: '텍스트, URL, 연락처 정보를 QR 코드로 변환하세요. 로고 삽입, 색상 커스터마이징, 다양한 크기 지원으로 개성 있는 QR 코드를 만들 수 있습니다.',
  keywords: 'QR코드, QR생성기, 큐알코드, 바코드, URL단축, 연락처QR, 로고QR, 커스텀QR, 무료QR생성, 개발도구',
  openGraph: {
    title: 'QR 코드 생성기 | 툴허브',
    description: 'QR 코드 생성기 - 로고 삽입 + 색상 커스터마이징 + 다양한 형식 지원',
    url: 'https://toolhub.ai.kr/qr-generator',
    siteName: '툴허브',
    locale: 'ko_KR',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'QR 코드 생성기 - 무료 QR 코드 제작 도구',
    description: '텍스트, URL, 연락처 정보를 QR 코드로 변환하세요.',
  },
  alternates: {
    canonical: 'https://toolhub.ai.kr/qr-generator',
  },
}

export default function QrGeneratorPage() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: 'QR 코드 생성기',
    description: '텍스트, URL 등을 QR 코드로 변환하는 무료 온라인 도구',
    url: 'https://toolhub.ai.kr/qr-generator',
    applicationCategory: 'UtilityApplication',
    operatingSystem: 'Any',
    browserRequirements: 'JavaScript',
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'KRW'
    },
    featureList: [
      'URL QR 코드 생성',
      '텍스트 QR 코드 생성',
      '연락처 QR 코드 생성',
      '로고 이미지 삽입',
      '색상 커스터마이징',
      '다양한 크기 및 형식 지원'
    ]
  }

  const faqJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
      {
        '@type': 'Question',
        name: 'QR코드에 담을 수 있는 최대 데이터량은?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'QR코드는 오류 정정 레벨에 따라 최대 숫자 7,089자, 영문 4,296자, 한글(UTF-8) 약 1,400자까지 담을 수 있습니다. 오류 정정 레벨은 L(7%), M(15%), Q(25%), H(30%) 4단계이며, 레벨이 높을수록 손상에 강하지만 데이터 용량은 줄어듭니다. 실용적으로는 URL, 연락처, Wi-Fi 정보 등에 주로 사용됩니다.'
        }
      },
      {
        '@type': 'Question',
        name: 'QR코드와 바코드의 차이점은?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: '바코드는 1차원으로 수평 방향의 선으로만 정보를 저장하며 최대 약 20자까지 담을 수 있습니다. QR코드는 2차원으로 가로·세로 모두 정보를 저장하여 수천 자까지 가능합니다. QR코드는 오류 정정 기능이 있어 일부 손상되어도 읽을 수 있고, 360도 어느 방향에서든 스캔이 가능합니다.'
        }
      },
      {
        '@type': 'Question',
        name: 'QR코드에 로고를 넣어도 되나요?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: '네, QR코드의 오류 정정 기능 덕분에 중앙에 로고를 넣어도 스캔이 가능합니다. 단, 로고 크기는 QR코드 면적의 최대 30% 이내로 유지해야 하며, 오류 정정 레벨을 H(30%)로 설정하는 것이 안전합니다. 로고가 너무 크거나 QR코드 모서리의 위치 검출 패턴을 가리면 인식이 안 될 수 있습니다.'
        }
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
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 py-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <Suspense fallback={<div className="text-center text-gray-900 dark:text-white">Loading...</div>}>
            <I18nWrapper>
              <QrGenerator />
            </I18nWrapper>
          </Suspense>
        </div>
      </div>
    </>
  )
}