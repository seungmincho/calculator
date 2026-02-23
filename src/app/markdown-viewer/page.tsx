import type { Metadata } from 'next'
import { Suspense } from 'react'
import I18nWrapper from '@/components/I18nWrapper'
import MarkdownEditor from '@/components/MarkdownEditor'

export const metadata: Metadata = {
  title: '마크다운 에디터 & 뷰어 - 실시간 미리보기, 편집, 내보내기 | 툴허브',
  description: '마크다운 텍스트를 실시간으로 미리보고 편집하세요. 파일 업로드, 목차 자동생성, HTML 변환, 다양한 서식 도구를 제공합니다.',
  keywords: '마크다운뷰어, 마크다운편집기, 마크다운미리보기, Markdown, MD파일, 온라인마크다운, 마크다운변환',
  openGraph: {
    title: '마크다운 에디터 & 뷰어 | 툴허브',
    description: '마크다운을 쉽게 편집하고 미리보세요. 파일 업로드, 목차, 실시간 미리보기 지원.',
    type: 'website',
    url: 'https://toolhub.ai.kr/markdown-viewer',
    siteName: '툴허브',
    locale: 'ko_KR',
  },
  twitter: {
    card: 'summary_large_image',
    title: '마크다운 에디터 & 뷰어',
    description: '마크다운을 쉽게 편집하고 미리보세요.',
  },
  alternates: {
    canonical: 'https://toolhub.ai.kr/markdown-editor',
  },
}

export default function MarkdownViewerPage() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: '마크다운 에디터 & 뷰어',
    description: '마크다운 텍스트를 실시간으로 미리보고 편집하세요. 파일 업로드, 목차 자동생성, HTML 변환, 다양한 서식 도구를 제공합니다.',
    url: 'https://toolhub.ai.kr/markdown-editor',
    applicationCategory: 'DeveloperApplication',
    operatingSystem: 'Any',
    browserRequirements: 'JavaScript',
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'KRW' },
    featureList: ['마크다운 실시간 미리보기', '파일 업로드', '목차 자동생성', '서식 도구', 'HTML 내보내기']
  }

  const faqJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
      {
        '@type': 'Question',
        name: '마크다운(Markdown)이란 무엇인가요?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: '마크다운은 2004년 존 그루버가 만든 경량 마크업 언어로, 일반 텍스트로 서식 있는 문서를 작성할 수 있습니다. # 제목, **굵게**, *기울임*, - 목록, [링크](URL), ![이미지](URL) 등 직관적인 문법을 사용합니다. GitHub README, 기술 문서, 블로그, 노트 앱(Notion, Obsidian) 등에서 널리 사용됩니다.'
        }
      },
      {
        '@type': 'Question',
        name: '마크다운에서 코드 블록을 작성하는 방법은?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: '인라인 코드: 백틱(`)으로 감싸기 - `console.log()`. 코드 블록: 백틱 3개(```)로 감싸고 언어를 지정하면 구문 강조가 적용됩니다. 예: ```javascript ... ```. 지원 언어: javascript, python, typescript, java, html, css, sql, bash 등.'
        }
      }
    ]
  }

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <Suspense fallback={<div className="text-center text-gray-900 dark:text-white">Loading...</div>}>
            <I18nWrapper>
              <MarkdownEditor />
            </I18nWrapper>
          </Suspense>
        </div>
      </div>
    </>
  )
}
