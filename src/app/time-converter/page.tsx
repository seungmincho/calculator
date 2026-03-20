import { Suspense } from 'react';
import { Metadata } from 'next';
import TimeConverter from '@/components/TimeConverter';

export const metadata: Metadata = {
  title: '시간 변환기 - 타임존, Unix 타임스탬프, 상대시간 변환',
  description: '전 세계 타임존 변환, Unix 타임스탬프 변환, 상대시간 계산을 한 번에. 티켓팅, 국제회의, 해외 이벤트 시간 확인에 최적화된 도구입니다.',
  keywords: '시간변환기, 타임존변환, 시차계산, UTC변환, KST변환, Unix타임스탬프, 상대시간, 티켓팅시간, 세계시계, 시간대변환',
  openGraph: {
    title: '시간 변환기 - 전 세계 시간대 변환 도구',
    description: '타임존 변환부터 Unix 타임스탬프까지, 모든 시간 변환을 한 곳에서',
    type: 'website',
    siteName: '툴허브',
    url: 'https://toolhub.ai.kr/time-converter',
    images: [
      {
        url: '/logo.png',
        width: 1200,
        height: 630,
        alt: '시간 변환기 - 툴허브',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: '시간 변환기 - 전 세계 시간대 변환 도구',
    description: '타임존 변환부터 Unix 타임스탬프까지, 모든 시간 변환을 한 곳에서',
    images: ['/logo.png'],
  },
  alternates: {
    canonical: 'https://toolhub.ai.kr/time-converter/',
  },
};

export default function TimeConverterPage() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: '시간 변환기',
    description: '전 세계 타임존 변환, Unix 타임스탬프 변환, 상대시간 계산을 한 번에. 티켓팅, 국제회의, 해외 이벤트 시간 확인에 최적화된 도구입니다.',
    url: 'https://toolhub.ai.kr/time-converter',
    applicationCategory: 'UtilityApplication',
    operatingSystem: 'Any',
    browserRequirements: 'JavaScript',
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'KRW' },
    featureList: ['타임존 변환', 'Unix 타임스탬프 변환', '날짜/시간 포맷', '세계 시간 비교']
  }

  const faqJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
      {
        '@type': 'Question',
        name: 'Unix 타임스탬프란 무엇인가요?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'Unix 타임스탬프(Epoch Time)는 1970년 1월 1일 00:00:00 UTC부터 경과한 초 수입니다. 예를 들어 1700000000은 2023년 11월 14일을 나타냅니다. 프로그래밍에서 시간대에 독립적인 시간 표현에 사용되며, 밀리초 단위(13자리)도 흔히 사용됩니다. 2038년 문제는 32비트 시스템에서 타임스탬프가 오버플로되는 현상으로, 64비트 시스템에서는 해결됩니다.',
        },
      },
      {
        '@type': 'Question',
        name: '한국 시간(KST)과 UTC의 차이는?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'KST(Korea Standard Time)는 UTC+9로, UTC보다 9시간 앞섭니다. 예를 들어 UTC 기준 오전 3시이면 한국은 오후 12시입니다. 한국은 서머타임을 사용하지 않으므로 연중 UTC+9로 고정됩니다. 주요 시간대 비교: 뉴욕(EST) UTC-5, 런던(GMT) UTC+0, 도쿄(JST) UTC+9, 시드니(AEST) UTC+10입니다.',
        },
      },
      {
        '@type': 'Question',
        name: 'ISO 8601 날짜 형식이란?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: "ISO 8601은 국제 표준 날짜/시간 표기법으로, 'YYYY-MM-DDTHH:mm:ss.sssZ' 형식을 사용합니다. 예: '2026-02-22T15:30:00+09:00'. T는 날짜와 시간의 구분자, Z는 UTC를 의미하며, +09:00 같은 오프셋으로 시간대를 표시합니다. API, 데이터베이스, 로그 파일에서 표준 형식으로 널리 사용됩니다.",
        },
      },
    ],
  }

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />
      <Suspense fallback={
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
            <p className="text-gray-600 dark:text-gray-400">시간 변환기를 불러오는 중...</p>
          </div>
        </div>
      }>
        <TimeConverter />
      </Suspense>

      {/* SEO 콘텐츠 */}
      <section className="max-w-4xl mx-auto px-4 pb-12">
        <div className="mt-12 border-t border-gray-200 dark:border-gray-700 pt-8">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
            시간 변환기란?
          </h2>
          <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-6">
            시간 변환기는 전 세계 타임존(시간대) 변환, Unix 타임스탬프 변환, 상대시간 계산을 한 번에 처리하는 도구입니다. 해외 티켓팅 시간 확인, 국제 화상회의 일정 조율, API 개발 시 epoch 타임스탬프 변환 등 시간과 관련된 모든 작업에 활용할 수 있습니다. KST(한국 표준시)를 기준으로 UTC, PST, EST, JST 등 주요 시간대로 즉시 변환해 드립니다.
          </p>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
            시간 변환기 활용 팁
          </h3>
          <ul className="list-disc list-inside space-y-2 text-gray-700 dark:text-gray-300">
            <li><strong>해외 티켓팅:</strong> 미국, 유럽 공연·스포츠 티켓팅 시 현지 오픈 시간을 한국 시간으로 변환하여 놓치지 않을 수 있습니다.</li>
            <li><strong>Unix 타임스탬프 변환:</strong> 서버 로그, API 응답에 포함된 13자리(밀리초) 또는 10자리(초) 타임스탬프를 사람이 읽기 쉬운 날짜로 즉시 변환합니다.</li>
            <li><strong>ISO 8601 형식:</strong> 국제 표준 날짜 형식(YYYY-MM-DDTHH:mm:ssZ)을 파싱하고 원하는 타임존으로 변환하여 데이터 처리에 활용하세요.</li>
            <li><strong>국제 회의 일정:</strong> 서울 기준 회의 시간을 뉴욕·런던·베이징 참가자 현지 시간으로 한눈에 표시하여 시차 계산 실수를 방지합니다.</li>
          </ul>
        </div>
      </section>
    </>
  );
}