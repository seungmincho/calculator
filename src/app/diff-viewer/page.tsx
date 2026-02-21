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
  alternates: {
    canonical: 'https://toolhub.ai.kr/diff-viewer',
  },
}

export default function DiffViewerPage() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: '텍스트 비교 도구 (Diff)',
    description: '두 텍스트나 코드를 비교하여 차이점을 시각적으로 확인합니다. 추가, 삭제, 변경된 부분을 하이라이트로 표시합니다.',
    url: 'https://toolhub.ai.kr/diff-viewer',
    applicationCategory: 'DeveloperApplication',
    operatingSystem: 'Any',
    browserRequirements: 'JavaScript',
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'KRW' },
    featureList: ['텍스트 차이점 비교', '줄 단위 비교', '단어 단위 비교', '병합 뷰']
  }

  const faqJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
      {
        '@type': 'Question',
        name: 'diff(차이 비교)의 원리는?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'diff 알고리즘은 두 텍스트 사이의 최소 편집 거리(Minimum Edit Distance)를 계산합니다. 가장 널리 사용되는 Myers 알고리즘은 LCS(최장 공통 부분 수열)를 기반으로 추가, 삭제, 변경된 줄을 찾습니다. 결과는 보통 +로 추가된 줄, -로 삭제된 줄을 표시합니다. Git의 diff도 이 알고리즘을 기반으로 하며, 코드 리뷰와 버전 관리에 필수적입니다.',
        },
      },
      {
        '@type': 'Question',
        name: '줄 단위 비교와 단어 단위 비교의 차이는?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: '줄 단위(line diff): 전체 줄이 변경 단위로, 한 글자만 바뀌어도 전체 줄이 변경으로 표시됩니다. Git diff의 기본 모드입니다. 단어 단위(word diff): 줄 내에서 변경된 단어만 하이라이트하여 정확히 무엇이 바뀌었는지 확인하기 쉽습니다. 문서 비교에 유용합니다. 문자 단위(char diff)는 가장 세밀하지만 노이즈가 많을 수 있습니다.',
        },
      },
    ],
  }

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />
      <I18nWrapper>
        <DiffViewer />
      </I18nWrapper>
    </>
  )
}
