import { Metadata } from 'next'
import { Suspense } from 'react'
import CronTester from '@/components/CronTester'
import I18nWrapper from '@/components/I18nWrapper'
import Breadcrumb from '@/components/Breadcrumb'
import RelatedTools from '@/components/RelatedTools'

export const metadata: Metadata = {
  title: 'Cron 표현식 테스터 - 스케줄 검증 | 툴허브',
  description: 'Cron 표현식을 실시간으로 테스트하고 분석하세요. 다음 실행 시간 예측, 한국어 설명, 일반적인 패턴 제공으로 스케줄 관리를 쉽게 할 수 있습니다.',
  keywords: 'Cron, 크론, 표현식, 스케줄러, 작업스케줄, 정기실행, Linux, Unix, 개발도구, 시간관리, 자동화',
  openGraph: {
    title: 'Cron 표현식 테스터 | 툴허브',
    description: 'Cron 표현식 테스터 - 실시간 검증 + 다음 실행시간 예측 + 한국어 설명',
    url: 'https://toolhub.ai.kr/cron-tester',
    siteName: '툴허브',
    locale: 'ko_KR',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Cron 표현식 테스터 - 크론 스케줄 검증 및 분석 도구',
    description: 'Cron 표현식을 실시간으로 테스트하고 분석하세요.',
  },
  alternates: {
    canonical: 'https://toolhub.ai.kr/cron-tester/',
  },
}

export default function CronTesterPage() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: 'Cron 표현식 테스터',
    description: 'Cron 표현식을 실시간으로 테스트하고 분석하는 도구',
    url: 'https://toolhub.ai.kr/cron-tester',
    applicationCategory: 'DeveloperApplication',
    operatingSystem: 'Any',
    browserRequirements: 'JavaScript',
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'KRW'
    },
    featureList: [
      'Cron 표현식 실시간 검증',
      '다음 실행 시간 예측',
      '한국어 설명 제공',
      '일반적인 패턴 프리셋',
      '실행 이력 시뮬레이션',
      '오류 검사 및 제안'
    ]
  }

  const faqJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
      {
        '@type': 'Question',
        name: '크론(Cron) 표현식이란 무엇인가요?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: '크론 표현식은 작업 예약 시간을 정의하는 형식으로, 5개 필드로 구성됩니다: 분(0-59) 시(0-23) 일(1-31) 월(1-12) 요일(0-7, 0과 7은 일요일). 예: \'0 9 * * 1-5\'는 평일 오전 9시, \'*/5 * * * *\'는 매 5분마다, \'0 0 1 * *\'는 매월 1일 자정을 의미합니다. Linux 서버, CI/CD, 클라우드 스케줄러에서 사용됩니다.'
        }
      },
      {
        '@type': 'Question',
        name: '자주 사용하는 크론 표현식 예시는?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: '매분: * * * * *. 매시 정각: 0 * * * *. 매일 자정: 0 0 * * *. 매주 월요일 오전 9시: 0 9 * * 1. 매월 1일 자정: 0 0 1 * *. 매 5분: */5 * * * *. 평일 오전 9시: 0 9 * * 1-5. 매월 마지막 날: 0 0 L * * (일부 시스템). 3개월마다: 0 0 1 */3 *. @reboot, @hourly, @daily 등 단축 표현도 일부 시스템에서 지원합니다.'
        }
      }
    ]
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
        <Breadcrumb />
              <CronTester />
              <div className="mt-8">

                <RelatedTools />

              </div>

            </I18nWrapper>
          </Suspense>
        </div>
      </div>
      {/* SEO 콘텐츠 */}
      <section className="max-w-4xl mx-auto px-4 pb-12">
        <div className="mt-12 border-t border-gray-200 dark:border-gray-700 pt-8">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
            Cron 표현식 테스터란?
          </h2>
          <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-6">
            Cron 표현식 테스터는 Linux·Unix 크론 스케줄 표현식을 실시간으로 검증하고 분석하는 개발 도구입니다. 직접 작성한 표현식의 다음 실행 시간을 예측하고 한국어 설명으로 해석해주어, 복잡한 크론 문법 오류를 배포 전에 미리 확인할 수 있습니다. CI/CD 파이프라인, AWS EventBridge, GitHub Actions 스케줄, Linux crontab 등 다양한 환경의 표현식을 테스트하는 데 활용할 수 있습니다.
          </p>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
            Cron 표현식 테스터 활용 팁
          </h3>
          <ul className="list-disc list-inside space-y-2 text-gray-700 dark:text-gray-300">
            <li><strong>기본 구조 이해:</strong> 5개 필드는 순서대로 분(0-59), 시(0-23), 일(1-31), 월(1-12), 요일(0-7)입니다. 각 필드를 &apos;*&apos;로 두면 &apos;모든 값&apos;을 의미합니다.</li>
            <li><strong>자주 쓰는 패턴:</strong> &apos;0 9 * * 1-5&apos;는 평일 오전 9시, &apos;*/15 * * * *&apos;는 15분마다, &apos;0 0 1 * *&apos;는 매월 1일 자정 실행입니다.</li>
            <li><strong>실행 이력 시뮬레이션:</strong> 다음 실행 시간뿐 아니라 과거 실행 이력도 시뮬레이션하여 예상대로 동작했는지 역으로 검증할 수 있습니다.</li>
            <li><strong>타임존 주의:</strong> 서버 cron은 서버 시간대(UTC가 많음) 기준으로 동작합니다. 한국(KST, UTC+9) 기준으로 설정하려면 9시간을 빼고 표현식을 입력하세요.</li>
          </ul>
        </div>
      </section>
    </>
  )
}