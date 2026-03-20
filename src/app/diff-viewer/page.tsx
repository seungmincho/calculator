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
    siteName: '툴허브',
    url: 'https://toolhub.ai.kr/diff-viewer',
  },
  alternates: {
    canonical: 'https://toolhub.ai.kr/diff-viewer/',
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
      {/* SEO 콘텐츠 */}
      <section className="max-w-4xl mx-auto px-4 pb-12">
        <div className="mt-12 border-t border-gray-200 dark:border-gray-700 pt-8">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
            Diff 비교 도구란?
          </h2>
          <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-6">
            Diff 비교 도구는 두 개의 텍스트나 코드를 나란히 놓고 추가·삭제·변경된 부분을 색상으로 강조하여 시각적으로 비교해주는 도구입니다. 소스 코드 리뷰, 문서 개정판 비교, 설정 파일 변경 확인 등 다양한 용도로 사용되며, 줄 단위와 단어 단위 비교 모드를 모두 지원합니다. Git diff와 동일한 원리로 동작하여 개발자와 문서 작업자 모두에게 유용합니다.
          </p>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
            Diff 비교 도구 활용 팁
          </h3>
          <ul className="list-disc list-inside space-y-2 text-gray-700 dark:text-gray-300">
            <li><strong>코드 리뷰:</strong> Pull Request 리뷰 전 로컬에서 변경 사항을 빠르게 확인하거나, 두 버전의 설정 파일(nginx.conf, docker-compose.yml 등)을 비교할 때 유용합니다.</li>
            <li><strong>문서 교정:</strong> 계약서, 보고서의 이전 버전과 새 버전을 비교하여 변경된 조항이나 수정 내용을 정확히 파악할 수 있습니다.</li>
            <li><strong>줄 vs 단어 비교:</strong> 줄 단위 비교는 전체 줄 변경을, 단어 단위 비교는 줄 내 세부 변경을 보여줍니다. 짧은 변경이 많은 문서에는 단어 단위가 더 직관적입니다.</li>
            <li><strong>JSON·YAML 비교:</strong> API 응답이나 설정 파일의 JSON/YAML을 붙여넣어 포맷 차이까지 한눈에 비교하세요.</li>
          </ul>
        </div>
      </section>
    </>
  )
}
