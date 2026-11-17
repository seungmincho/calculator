import { Metadata } from 'next'
import PasswordGenerator from '@/components/PasswordGenerator'
import I18nWrapper from '@/components/I18nWrapper'
import RelatedTools from '@/components/RelatedTools'
import { FaqJsonLd } from '@/components/ToolFaq'
import passwordGeneratorMessages from '../../../messages/generated/ko/ns/passwordGenerator.json'

const TITLE = '비밀번호 생성기 - 개별 재생성·복사 복구 | 툴허브'
const DESCRIPTION = '비밀번호·PIN·단어 조합을 현재 설정으로 생성하고 한 항목만 다시 만들 수 있습니다. 나머지 결과는 유지하며 개별·전체 복사의 실패 안내와 수동 선택을 제공합니다. 기존 강도·엔트로피 추정도 확인하세요.'

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  keywords: '비밀번호 생성기, 패스워드 생성, 패스프레이즈, 랜덤 비밀번호, 보안, password generator, 강력한 비밀번호, 비밀번호 강도',
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    url: 'https://toolhub.ai.kr/password-generator/',
    siteName: '툴허브',
    locale: 'ko_KR',
    type: 'website',
    images: [{ url: 'https://toolhub.ai.kr/og/password-generator.png', width: 1200, height: 630, alt: '비밀번호 생성기' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: TITLE,
    description: DESCRIPTION,
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
    description: DESCRIPTION,
    url: 'https://toolhub.ai.kr/password-generator/',
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
      '현재 설정으로 선택한 한 항목만 재생성',
      '개별·전체 복사와 실패 시 수동 선택·재시도',
      '표시 언어 변경 시 생성 결과 보존'
    ]
  }

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <FaqJsonLd items={passwordGeneratorMessages.passwordGenerator.guide.faq.items} />
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
            대소문자·숫자·특수문자·길이·제외 문자 설정으로 비밀번호를 만들고 PIN이나 단어 조합도 생성할 수 있습니다. 한 항목 다시 만들기는 기존 생성기를 현재 설정으로 한 번 호출해 그 위치만 교체하며 나머지는 유지합니다. 우연히 같은 값이 나올 수 있고 별도의 중복 방지나 보안성 강화 기능은 아닙니다. 생성 결과와 강도 확인 입력은 URL·기기 저장소·서버에 추가하지 않습니다.
          </p>
          <h3 className="text-lg font-semibold text-fg mb-3">
            생성 결과 확인하기
          </h3>
          <ul className="list-disc list-inside space-y-2 text-body">
            <li><strong>설정과 결과:</strong> 한 항목 재생성은 현재 길이·문자·단어/PIN 옵션을 사용합니다. 설정 변경이나 전체 재생성은 기존처럼 전체 목록을 갱신합니다.</li>
            <li><strong>복사 확인:</strong> 실제 복사 성공 뒤에만 성공 표시가 나옵니다. 실패하면 현재 값을 직접 선택하거나 재시도할 수 있습니다.</li>
            <li><strong>화면 이동:</strong> 표시 언어만 바꾸면 값은 유지됩니다. 재생성·설정/탭 이동 뒤 이전 복사 안내는 새 결과에 적용하지 않습니다.</li>
            <li><strong>추정 수치:</strong> 엔트로피와 크랙 시간은 선택한 문자 집합·길이·가정에 따른 계산값입니다. 특정 계정의 안전이나 실제 공격에 걸리는 시간을 보장하지 않습니다.</li>
          </ul>
        </div>
      </section>
    </>
  )
}
