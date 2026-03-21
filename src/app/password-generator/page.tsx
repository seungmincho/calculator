import { Metadata } from 'next'
import { Suspense } from 'react'
import PasswordGenerator from '@/components/PasswordGenerator'
import I18nWrapper from '@/components/I18nWrapper'
import Breadcrumb from '@/components/Breadcrumb'
import RelatedTools from '@/components/RelatedTools'

export const metadata: Metadata = {
  title: '비밀번호 생성기 - 안전한 패스워드 | 툴허브',
  description: '강력하고 안전한 비밀번호와 패스프레이즈를 쉽고 빠르게 생성하세요. 비밀번호 강도 분석, 엔트로피 계산, 일괄 생성 및 복사 기능을 제공합니다.',
  keywords: '비밀번호 생성기, 패스워드 생성, 패스프레이즈, 랜덤 비밀번호, 보안, password generator, 강력한 비밀번호, 비밀번호 강도',
  openGraph: {
    title: '비밀번호 생성기 | 툴허브',
    description: '안전한 비밀번호와 패스프레이즈 생성 도구 - 강도 분석, 엔트로피 계산, 일괄 생성',
    url: 'https://toolhub.ai.kr/password-generator',
    siteName: '툴허브',
    locale: 'ko_KR',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: '비밀번호 생성기 - 안전한 패스워드 생성 도구',
    description: '강력하고 안전한 비밀번호와 패스프레이즈를 생성하세요.',
  },
  alternates: {
    canonical: 'https://toolhub.ai.kr/password-generator/',
  },
}

export default function PasswordGeneratorPage() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: '비밀번호 생성기',
    description: '강력하고 안전한 비밀번호와 패스프레이즈를 생성하는 도구',
    url: 'https://toolhub.ai.kr/password-generator',
    applicationCategory: 'UtilityApplication',
    operatingSystem: 'Any',
    browserRequirements: 'JavaScript',
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'KRW'
    },
    featureList: [
      '랜덤 비밀번호 생성 (8-128자)',
      '패스프레이즈 생성',
      '비밀번호 강도 분석',
      '엔트로피 계산',
      '대량 생성 기능',
      '원클릭 복사',
      '세션 히스토리'
    ]
  }

  const faqJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
      {
        '@type': 'Question',
        name: '안전한 비밀번호 길이는?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: '현재 권장되는 안전한 비밀번호 길이는 최소 12자 이상이며, 16자 이상을 권장합니다. 8자리 비밀번호는 현대 GPU로 수 시간 내에 크래킹 가능하지만, 12자리는 수백 년, 16자리는 사실상 불가능합니다. 대소문자, 숫자, 특수문자를 혼합하면 보안이 더욱 강화됩니다. NIST(미국 국립표준기술연구소)는 패스프레이즈(여러 단어 조합)도 권장합니다.'
        }
      },
      {
        '@type': 'Question',
        name: '패스프레이즈란 무엇인가요?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: '패스프레이즈(Passphrase)는 여러 개의 무작위 단어를 조합한 비밀번호입니다. 예: \'correct-horse-battery-staple\'. 일반 비밀번호보다 기억하기 쉬우면서도 엔트로피(무작위성)가 높아 보안성이 우수합니다. EFF 단어 목록 기반으로 4~6개 단어를 조합하면 충분한 보안을 확보할 수 있습니다. 많은 보안 전문가들이 복잡한 비밀번호보다 긴 패스프레이즈를 권장합니다.'
        }
      },
      {
        '@type': 'Question',
        name: '비밀번호 강도는 어떻게 측정하나요?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: '비밀번호 강도는 엔트로피(비트)로 측정합니다. 엔트로피 = log2(가능한 문자 수) × 길이. 예를 들어 소문자+숫자(36개) 8자리는 약 41비트, 대소문자+숫자+특수문자(94개) 16자리는 약 105비트입니다. 일반적으로 80비트 이상이면 강력, 60-80비트는 보통, 60비트 미만은 약한 비밀번호로 분류합니다.'
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
        <Breadcrumb />
              <PasswordGenerator />
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
            비밀번호 생성기란?
          </h2>
          <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-6">
            비밀번호 생성기는 해킹에 강한 안전한 랜덤 비밀번호와 기억하기 쉬운 패스프레이즈를 즉시 생성해주는 무료 보안 도구입니다. 대소문자·숫자·특수문자 조합, 길이(8~128자), 제외 문자 설정 등 세밀한 커스텀이 가능하며, 비밀번호 강도와 엔트로피(비트)를 실시간으로 분석합니다. 생성된 비밀번호는 서버에 전송되지 않아 완전한 개인정보 보호가 보장됩니다.
          </p>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
            안전한 비밀번호 만들기 팁
          </h3>
          <ul className="list-disc list-inside space-y-2 text-gray-700 dark:text-gray-300">
            <li><strong>최소 16자 이상 권장:</strong> 12자 비밀번호는 수백 년, 16자 이상은 현실적으로 크래킹이 불가능합니다. 길이가 보안의 핵심입니다.</li>
            <li><strong>패스프레이즈 활용:</strong> 무작위 단어 4~5개 조합(예: ocean-table-forest-lamp)은 기억하기 쉬우면서도 엔트로피가 높아 보안성이 우수합니다.</li>
            <li><strong>사이트마다 다른 비밀번호:</strong> 하나의 비밀번호를 여러 사이트에서 사용하면 한 곳이 해킹당할 때 모든 계정이 위험해집니다. 패스워드 매니저 사용을 권장합니다.</li>
            <li><strong>특수문자 포함:</strong> !@#$% 등 특수문자를 포함하면 가능한 조합의 수가 급격히 늘어나 무차별 대입 공격(브루트 포스)에 훨씬 강해집니다.</li>
          </ul>
        </div>
      </section>
    </>
  )
}
