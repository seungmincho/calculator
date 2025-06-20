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
}

export default function MarkdownViewerPage() {
  return <I18nWrapper>
        <MarkdownViewer />
      </I18nWrapper>
}