import { Metadata } from 'next'
import { Suspense } from 'react'
import CodeScreenshot from '@/components/CodeScreenshot'
import I18nWrapper from '@/components/I18nWrapper'

export const metadata: Metadata = {
  title: '코드 스크린샷 - 코드를 예쁜 이미지로 변환 | 툴허브',
  description: '코드 스크린샷 생성기 - 코드를 아름다운 이미지로 변환하세요. 8가지 테마, 그라디언트 배경, 구문 강조, PNG/SVG 내보내기를 지원합니다.',
  keywords: '코드 스크린샷, code screenshot, Carbon, 코드 이미지, 코드 캡처, syntax highlighting, 코드 공유',
  openGraph: {
    title: '코드 스크린샷 생성기 | 툴허브',
    description: '코드를 아름다운 이미지로 변환하세요',
    url: 'https://toolhub.ai.kr/code-screenshot',
    siteName: '툴허브',
    locale: 'ko_KR',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: '코드 스크린샷 생성기 | 툴허브',
    description: '코드를 예쁜 이미지로 변환',
  },
  alternates: {
    canonical: 'https://toolhub.ai.kr/code-screenshot/',
  },
}

export default function CodeScreenshotPage() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: '코드 스크린샷 생성기',
    description: '코드를 아름다운 이미지로 변환',
    url: 'https://toolhub.ai.kr/code-screenshot',
    applicationCategory: 'DeveloperApplication',
    operatingSystem: 'Any',
    browserRequirements: 'JavaScript',
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'KRW' },
    featureList: ['8가지 테마', '그라디언트 배경', '구문 강조', 'PNG/SVG 내보내기', '클립보드 복사'],
  }

  const faqJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
      {
        '@type': 'Question',
        name: '코드 스크린샷은 어디에 활용되나요?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: '① SNS 공유: 트위터/X, 인스타그램에 코드 이미지 공유 (텍스트보다 시각적으로 매력적) ② 기술 블로그: 코드 하이라이팅이 적용된 깔끔한 이미지 삽입 ③ 프레젠테이션: 발표 자료에 구문 강조된 코드 삽입 ④ 문서화: 코드 리뷰 시 특정 부분 강조 ⑤ 포트폴리오: 프로젝트 코드 미리보기. 배경색, 테마, 폰트 등을 커스터마이즈할 수 있습니다.',
        },
      },
    ],
  }

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 py-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <Suspense fallback={<div className="text-center text-gray-900 dark:text-white">Loading...</div>}>
            <I18nWrapper>
              <CodeScreenshot />
            </I18nWrapper>
          </Suspense>
        </div>
      </div>
        {/* SEO 콘텐츠 */}
        <section className="max-w-4xl mx-auto px-4 pb-12">
          <div className="mt-12 border-t border-gray-200 dark:border-gray-700 pt-8">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
              코드 스크린샷 생성기란?
            </h2>
            <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-6">
              코드 스크린샷 생성기는 <strong>코드를 구문 강조가 적용된 아름다운 이미지로 변환</strong>하는 무료 온라인 도구입니다. Carbon, Poet.so와 같은 인기 서비스와 유사하게 8가지 테마, 그라디언트 배경, 다양한 언어 구문 강조를 지원하며 PNG·SVG 내보내기와 클립보드 복사까지 가능합니다. SNS 코드 공유, 기술 블로그 이미지, 개발자 포트폴리오에 필수적인 도구입니다.
            </p>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
              코드 스크린샷 활용 팁
            </h3>
            <ul className="list-disc list-inside space-y-2 text-gray-700 dark:text-gray-300">
              <li><strong>SNS 공유:</strong> 트위터·링크드인에서 코드 이미지는 텍스트보다 2~3배 높은 참여율을 보입니다.</li>
              <li><strong>테마 선택:</strong> Dracula·One Dark Pro 테마는 가독성이 높아 SNS 공유용으로 인기가 많습니다.</li>
              <li><strong>그라디언트 배경:</strong> 배경에 그라디언트를 적용하면 시각적으로 더 임팩트 있는 이미지가 만들어집니다.</li>
              <li><strong>SVG 활용:</strong> SVG 형식으로 내보내면 어떤 크기로 확대해도 선명하게 유지됩니다.</li>
              <li><strong>언어 자동 감지:</strong> 언어를 자동 감지하므로 코드를 붙여넣으면 바로 구문 강조가 적용됩니다.</li>
            </ul>
          </div>
        </section>
    </>
  )
}
