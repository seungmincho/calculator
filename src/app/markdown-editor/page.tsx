import { Metadata } from 'next'
import { Suspense } from 'react'
import MarkdownEditor from '@/components/MarkdownEditor'
import I18nWrapper from '@/components/I18nWrapper'
import RelatedTools from '@/components/RelatedTools'

export const metadata: Metadata = {
  title: '마크다운 에디터 - 실시간 미리보기 마크다운 편집기 | 툴허브',
  description: '실시간 미리보기 마크다운 에디터. 분할 화면으로 편집하며 볼드, 이탤릭, 표, 코드 블록, 체크리스트 등 모든 문법을 지원. .md 파일 다운로드 및 HTML 변환 기능 제공.',
  keywords: '마크다운에디터, 마크다운편집기, 마크다운미리보기, Markdown Editor, 실시간미리보기, MD편집기, 온라인마크다운, 마크다운작성, 깃허브마크다운',
  openGraph: {
    title: '마크다운 에디터 - 실시간 미리보기 | 툴허브',
    description: '실시간 분할 화면으로 마크다운을 편집하고 미리보세요. 툴바, 내보내기, 전체화면 지원.',
    url: 'https://toolhub.ai.kr/markdown-editor',
    siteName: '툴허브',
    locale: 'ko_KR',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: '마크다운 에디터 - 실시간 미리보기 | 툴허브',
    description: '실시간 분할 화면으로 마크다운을 편집하고 미리보세요.',
  },
  alternates: {
    canonical: 'https://toolhub.ai.kr/markdown-editor/',
  },
}

export default function MarkdownEditorPage() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: '마크다운 에디터',
    description: '실시간 미리보기 마크다운 에디터. 분할 화면, 툴바, .md 파일 다운로드, HTML 변환 지원.',
    url: 'https://toolhub.ai.kr/markdown-editor',
    applicationCategory: 'DeveloperApplication',
    operatingSystem: 'Any',
    browserRequirements: 'JavaScript',
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'KRW' },
    featureList: [
      '실시간 마크다운 미리보기',
      '분할 화면 편집',
      '툴바 버튼 지원',
      '헤딩, 볼드, 이탤릭, 취소선',
      '코드 블록 및 인라인 코드',
      '표(Table) 지원',
      '체크리스트(Task list)',
      '.md 파일 다운로드',
      'HTML 변환 및 복사',
      '전체화면 모드',
      '단어/글자 수 표시',
    ],
  }

  const faqJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
      {
        '@type': 'Question',
        name: '마크다운 에디터로 작성한 내용을 어떻게 저장하나요?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: '하단의 "MD 다운로드" 버튼을 클릭하면 작성한 마크다운을 .md 파일로 저장할 수 있습니다. 또한 "MD 복사" 버튼으로 클립보드에 마크다운 원문을 복사하거나, "HTML 복사" 버튼으로 변환된 HTML을 복사할 수 있습니다. GitHub README, 블로그, 노션 등 다양한 플랫폼에 바로 붙여넣기 가능합니다.',
        },
      },
      {
        '@type': 'Question',
        name: '마크다운 에디터에서 표(Table)는 어떻게 작성하나요?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: '툴바의 "표" 버튼을 클릭하면 3x3 표 템플릿이 자동으로 삽입됩니다. 직접 작성할 때는 | 헤더1 | 헤더2 | 형식으로 헤더 행을 쓰고, 다음 줄에 |---|---| 형식의 구분선을 추가한 뒤 데이터 행을 작성합니다. 콜론(:)으로 정렬을 지정할 수 있습니다: |:---|:---:|----|는 각각 왼쪽, 가운데, 오른쪽 정렬입니다.',
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
          <Suspense fallback={<div className="text-center py-16 text-gray-500 dark:text-gray-400">Loading...</div>}>
            <I18nWrapper>
              <MarkdownEditor />
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
              마크다운 에디터란?
            </h2>
            <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-6">
              마크다운 에디터는 실시간 분할 화면으로 마크다운 문법을 편집하면서 렌더링 결과를 동시에 확인할 수 있는 온라인 편집기입니다. GitHub README, 기술 블로그, 노션 문서 등을 작성할 때 유용하며, 볼드·이탤릭·표·코드 블록·체크리스트 등 모든 마크다운 문법을 지원합니다. .md 파일 다운로드와 HTML 변환 기능을 제공해 어떤 플랫폼에서도 바로 활용할 수 있습니다.
            </p>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
              마크다운 에디터 활용 팁
            </h3>
            <ul className="list-disc list-inside space-y-2 text-gray-700 dark:text-gray-300">
              <li><strong>툴바 버튼 활용:</strong> 문법을 외우지 않아도 툴바의 볼드, 이탤릭, 표, 코드 블록 버튼으로 서식을 바로 삽입할 수 있습니다.</li>
              <li><strong>실시간 미리보기:</strong> 분할 화면으로 입력과 동시에 결과를 확인해 오타나 문법 오류를 즉시 수정하세요.</li>
              <li><strong>파일 다운로드:</strong> 작성한 내용을 .md 파일로 저장하거나 HTML로 변환해 다양한 용도로 활용하세요.</li>
              <li><strong>GitHub README 작성:</strong> 오픈소스 프로젝트의 README.md를 미리 작성하고 검토한 후 복사해서 사용하세요.</li>
            </ul>
          </div>
        </section>
    </>
  )
}
