import { Metadata } from 'next'
import PasswordGenerator from '@/components/PasswordGenerator'
import I18nWrapper from '@/components/I18nWrapper'
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
    images: [{ url: 'https://toolhub.ai.kr/og/password-generator.png', width: 1200, height: 630, alt: '비밀번호 생성기' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: '비밀번호 생성기 - 안전한 패스워드 생성 도구',
    description: '강력하고 안전한 비밀번호와 패스프레이즈를 생성하세요.',
    images: ['https://toolhub.ai.kr/og/password-generator.png'],
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
      '랜덤 비밀번호 생성 (4-128자, 편향 없는 암호학적 난수)',
      '패스프레이즈 생성',
      'PIN 생성',
      '한국 사이트 규칙 프리셋(8~16자 등)',
      '내 비밀번호 강도 검사(흔한 패턴 감지)',
      '엔트로피·평균 크랙 시간 추정',
      '최대 20개 일괄 생성',
      '원클릭 복사'
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
          text: '현재 권장되는 안전한 비밀번호 길이는 최소 12자 이상이며, 16자 이상을 권장합니다. 초당 100억 번 대입하는 오프라인 공격을 가정하면, 대소문자·숫자·특수문자(94자)를 무작위로 쓴 8자리는 평균 약 2.6일, 12자리는 약 70만 년, 16자리는 10억 년 이상 걸립니다. 문자 종류보다 길이가 더 중요하며, NIST(미국 국립표준기술연구소) 개정 지침은 비밀번호만으로 로그인하는 경우 최소 15자를 권장합니다.'
        }
      },
      {
        '@type': 'Question',
        name: '패스프레이즈란 무엇인가요?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: '패스프레이즈(Passphrase)는 여러 개의 무작위 단어를 조합한 비밀번호입니다. 예: \'correct-horse-battery-staple\'. 일반 비밀번호보다 기억하기 쉬우면서도 엔트로피(무작위성)가 높아 보안성이 우수합니다. 이 도구의 단어 목록(819개)은 단어당 약 9.7비트이므로 6단어 이상을 권장합니다. 많은 보안 전문가들이 복잡한 비밀번호보다 긴 패스프레이즈를 권장합니다.'
        }
      },
      {
        '@type': 'Question',
        name: '비밀번호 강도는 어떻게 측정하나요?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: '비밀번호 강도는 엔트로피(비트)로 측정합니다. 엔트로피 = log2(가능한 문자 수) × 길이. 예를 들어 소문자+숫자(36개) 8자리는 약 41비트, 대소문자+숫자+특수문자(94개) 16자리는 약 105비트입니다. 이 도구는 40비트 미만 매우 약함, 56비트 미만 약함, 72비트 미만 보통, 96비트 미만 강함, 96비트 이상 매우 강함으로 분류합니다.'
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
      <div className="min-h-screen py-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
            <I18nWrapper>
              <PasswordGenerator />
              <div className="mt-8">

                <RelatedTools />

              </div>

            </I18nWrapper>
        </div>
      </div>
      {/* SEO 콘텐츠 */}
      <section className="max-w-4xl mx-auto px-4 pb-12">
        <div className="mt-12 border-t border-line pt-8">
          <h2 className="text-xl font-bold text-fg mb-4">
            비밀번호 생성기란?
          </h2>
          <p className="text-body leading-relaxed mb-6">
            비밀번호 생성기는 해킹에 강한 안전한 랜덤 비밀번호와 기억하기 쉬운 패스프레이즈를 즉시 생성해주는 무료 보안 도구입니다. 대소문자·숫자·특수문자 조합, 길이(8~128자), 제외 문자 설정 등 세밀한 커스텀이 가능하며, 비밀번호 강도와 엔트로피(비트)를 실시간으로 분석합니다. 생성된 비밀번호는 서버에 전송되지 않아 완전한 개인정보 보호가 보장됩니다.
          </p>
          <h3 className="text-lg font-semibold text-fg mb-3">
            안전한 비밀번호 만들기 팁
          </h3>
          <ul className="list-disc list-inside space-y-2 text-body">
            <li><strong>길이가 핵심:</strong> 무작위로 만든 12자는 초당 100억 번 대입해도 평균 수십만 년, 16자는 10억 년 이상 걸립니다. 문자 종류를 늘리는 것보다 길이를 늘리는 편이 효과가 큽니다.</li>
            <li><strong>패스프레이즈 활용:</strong> 무작위 단어 6개 이상 조합(예: ocean-table-forest-lamp-river-cloud)은 기억하기 쉬우면서도 엔트로피가 높아 보안성이 우수합니다.</li>
            <li><strong>사이트마다 다른 비밀번호:</strong> 하나의 비밀번호를 여러 사이트에서 사용하면 한 곳이 해킹당할 때 모든 계정이 위험해집니다. 패스워드 매니저 사용을 권장합니다.</li>
            <li><strong>특수문자는 보조 수단:</strong> !@#$% 등을 섞으면 조합 수가 늘지만, 같은 길이를 늘리는 것만큼 효과가 크지는 않습니다. 사이트 규칙이 요구할 때 맞춰 쓰세요.</li>
          </ul>
        </div>
      </section>
    </>
  )
}
