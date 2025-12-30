import type { Metadata } from 'next'
import I18nWrapper from '@/components/I18nWrapper'
import DiffViewer from '@/components/DiffViewer'

export const metadata: Metadata = {
  title: 'Diff 비교 도구 - 텍스트/코드 비교 | 툴허브',
  description: '두 텍스트나 코드를 비교하여 차이점을 시각적으로 확인합니다. 추가, 삭제, 변경된 부분을 하이라이트로 표시합니다.',
  keywords: 'diff, 텍스트비교, 코드비교, 차이점비교, 문서비교, diff viewer, compare',
  openGraph: {
    title: 'Diff 비교 도구 - 온라인 텍스트 비교',
    description: '두 텍스트의 차이점을 시각적으로 비교하세요',
    type: 'website',
  },
}

export default function DiffViewerPage() {
  return (
    <I18nWrapper>
      <DiffViewer />
    </I18nWrapper>
  )
}
