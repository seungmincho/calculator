import { Metadata } from 'next'
import MbtiTest from '@/components/MbtiTest'
import I18nWrapper from '@/components/I18nWrapper'
import RelatedTools from '@/components/RelatedTools'

export const metadata: Metadata = {
  title: 'MBTI 성격유형 검사 - 48문항 상세 테스트 | 툴허브',
  description: '48문항 상세 MBTI 성격유형 검사. 5점 척도로 나의 16가지 성격유형과 축별 비율(%)을 알아보고 강점·약점, 어울리는 일, 잘 맞는 유형까지 확인하세요. 결과 이미지 공유 가능(비공식 무료 검사).',
  keywords: 'MBTI 검사, MBTI 테스트, 성격유형 검사, MBTI 무료 검사, MBTI 결과, 16가지 성격유형',
  openGraph: {
    title: 'MBTI 성격유형 검사 48문항 | 툴허브',
    description: '48문항으로 알아보는 나의 MBTI 유형. 축별 비율, 강점·약점, 잘 맞는 유형, 결과 이미지 공유까지',
    url: 'https://toolhub.ai.kr/mbti-test/',
    siteName: '툴허브',
    locale: 'ko_KR',
    type: 'website',
    images: [{ url: 'https://toolhub.ai.kr/og/mbti-test.png', width: 1200, height: 630, alt: 'MBTI 성격유형 검사 48문항' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'MBTI 성격유형 검사 | 툴허브',
    description: '48문항 상세 MBTI 검사로 나의 성격유형을 알아보세요',
    images: ['https://toolhub.ai.kr/og/mbti-test.png'],
  },
  alternates: {
    canonical: 'https://toolhub.ai.kr/mbti-test/',
  },
}

export default function MbtiTestPage() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: 'MBTI 성격유형 검사',
    description: '48문항 5점 척도 성격유형 검사(비공식) - 축별 비율, 강점·약점, 잘 맞는 유형, 결과 공유',
    url: 'https://toolhub.ai.kr/mbti-test',
    applicationCategory: 'LifestyleApplication',
    operatingSystem: 'Any',
    browserRequirements: 'JavaScript',
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'KRW' },
    featureList: [
      '48문항 상세 MBTI 검사',
      '4가지 지표별 점수 분포 시각화',
      '16가지 유형 상세 프로필',
      '5점 척도·축별 균형 문항',
      '축별 비율(%)과 경계 유형 안내',
      '강점·약점 분석',
      '잘 맞는 유형(재미용)',
      '어울리는 일(참고용)',
      '16가지 유형 둘러보기',
      '결과 카드 이미지 저장',
      'URL 결과 공유',
    ],
  }

  const faqJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
      {
        '@type': 'Question',
        name: 'MBTI 검사는 몇 문항인가요?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: '총 48문항으로 구성되며, E/I, S/N, T/F, J/P 각 축별로 12문항씩 배정됩니다. 검사 시간은 약 5~10분 소요됩니다.',
        },
      },
      {
        '@type': 'Question',
        name: 'MBTI 결과는 어떻게 공유하나요?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: '검사 결과 페이지에서 공유하기(모바일 공유 시트), 결과 이미지 저장, 링크 복사 기능을 이용하실 수 있습니다.',
        },
      },
      {
        '@type': 'Question',
        name: 'MBTI 궁합도 볼 수 있나요?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: '네, 검사 결과 페이지에서 "궁합 보러가기" 버튼을 클릭하면 MBTI 궁합 분석 페이지로 이동해 상세 궁합을 확인하실 수 있습니다.',
        },
      },
    ],
  }

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />
      <div className="min-h-screen py-8">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
            <I18nWrapper>
              <MbtiTest />
              <div className="mt-8">

                <RelatedTools />

              </div>

            </I18nWrapper>
        </div>
      </div>
    </>
  )
}
