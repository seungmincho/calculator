import type { Metadata } from 'next'
import I18nWrapper from '@/components/I18nWrapper'
import MarkdownViewer from '@/components/MarkdownViewer'

export const metadata: Metadata = {
  title: '마크다운 뷰어 - 마크다운 미리보기, 편집, 내보내기',
  description: '마크다운 텍스트를 실시간으로 미리보고 편집하세요. HTML 변환, PDF 내보내기, 테이블 지원을 제공합니다.',
  keywords: '마크다운뷰어, 마크다운편집기, 마크다운미리보기, Markdown, MD파일, 온라인마크다운, 마크다운변환',
  openGraph: {
    title: '마크다운 뷰어 - 마크다운 미리보기, 편집',
    description: '마크다운을 쉽게 편집하고 미리보세요',
    type: 'website',
  },
  alternates: {
    canonical: 'https://toolhub.ai.kr/markdown-viewer',
  },
}

export default function MarkdownViewerPage() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: '마크다운 뷰어',
    description: '마크다운 텍스트를 실시간으로 미리보고 편집하세요. HTML 변환, PDF 내보내기, 테이블 지원을 제공합니다.',
    url: 'https://toolhub.ai.kr/markdown-viewer',
    applicationCategory: 'DeveloperApplication',
    operatingSystem: 'Any',
    browserRequirements: 'JavaScript',
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'KRW' },
    featureList: ['마크다운 미리보기', '실시간 렌더링', '구문 강조', '내보내기']
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
          text: '마크다운은 2004년 존 그루버가 만든 경량 마크업 언어로, 일반 텍스트로 서식 있는 문서를 작성할 수 있습니다. # 제목, **굵게**, *기울임*, - 목록, [링크](URL), ![이미지](URL) 등 직관적인 문법을 사용합니다. GitHub README, 기술 문서, 블로그, 노트 앱(Notion, Obsidian) 등에서 널리 사용됩니다. HTML로 변환되어 웹에서 렌더링됩니다.'
        }
      },
      {
        '@type': 'Question',
        name: '마크다운에서 코드 블록을 작성하는 방법은?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: '인라인 코드: 백틱(`)으로 감싸기 - `console.log()`. 코드 블록: 백틱 3개(```)로 감싸고 언어를 지정하면 구문 강조가 적용됩니다. 예: ```javascript ... ```. 지원 언어: javascript, python, typescript, java, html, css, sql, bash 등. 들여쓰기(4칸 공백)로도 코드 블록을 만들 수 있지만, 펜스 코드 블록(```)이 더 권장됩니다.'
        }
      }
    ]
  }

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />
      <I18nWrapper>
        <MarkdownViewer />
      </I18nWrapper>
    </>
  )
}