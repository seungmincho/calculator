import { Metadata } from 'next'
import { Suspense } from 'react'
import I18nWrapper from '@/components/I18nWrapper'
import Breadcrumb from '@/components/Breadcrumb'
import RelatedTools from '@/components/RelatedTools'
import GitVisualizer from '@/components/GitVisualizer'

export const metadata: Metadata = {
  title: 'Git 시각화 - branch, merge, rebase 인터랙티브 학습 | 툴허브',
  description:
    'Git의 branch, merge, rebase, cherry-pick 명령을 인터랙티브 커밋 그래프로 시각화하며 학습하세요. 실시간 커밋 트리, 단계별 설명, 프리셋 시나리오로 Git을 쉽게 이해할 수 있습니다.',
  keywords:
    'git 시각화, git branch, git merge, git rebase, git cherry-pick, 깃 시각화, git 학습, git 커밋 그래프, git 인터랙티브, git reset',
  openGraph: {
    title: 'Git 시각화 - branch, merge, rebase 인터랙티브 학습 | 툴허브',
    description:
      'Git 명령을 인터랙티브 커밋 그래프로 시각화하며 학습하세요. branch, merge, rebase, cherry-pick을 직접 실행하고 결과를 눈으로 확인합니다.',
    type: 'website',
    url: 'https://toolhub.ai.kr/git-visualizer',
    siteName: '툴허브',
    locale: 'ko_KR',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Git 시각화 - 인터랙티브 학습 | 툴허브',
    description:
      'Git branch, merge, rebase를 인터랙티브 커밋 그래프로 시각화하며 학습하세요.',
  },
  alternates: {
    canonical: 'https://toolhub.ai.kr/git-visualizer/',
  },
}

export default function GitVisualizerPage() {
  const webAppJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: 'Git 시각화 도구',
    description:
      'Git의 branch, merge, rebase, cherry-pick을 인터랙티브 커밋 그래프로 시각화하며 학습하는 교육 도구',
    url: 'https://toolhub.ai.kr/git-visualizer',
    applicationCategory: 'DeveloperApplication',
    operatingSystem: 'Any',
    browserRequirements: 'JavaScript',
    inLanguage: 'ko',
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'KRW' },
    featureList: [
      '인터랙티브 커밋 그래프',
      'branch, merge, rebase, cherry-pick 시뮬레이션',
      '프리셋 시나리오',
      '단계별 설명',
      '다크모드 지원',
    ],
  }

  const faqJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
      {
        '@type': 'Question',
        name: 'git merge와 git rebase의 차이점은 무엇인가요?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'merge는 두 브랜치의 변경사항을 합치면서 새로운 병합 커밋을 생성합니다. 히스토리가 그대로 보존됩니다. rebase는 현재 브랜치의 커밋들을 대상 브랜치 끝으로 옮겨 히스토리를 깔끔한 직선으로 만듭니다. 협업 시 이미 공유된 커밋에는 rebase를 사용하면 안 됩니다.',
        },
      },
      {
        '@type': 'Question',
        name: 'git cherry-pick은 언제 사용하나요?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'cherry-pick은 다른 브랜치의 특정 커밋 하나만 현재 브랜치에 복사하고 싶을 때 사용합니다. 예를 들어 feature 브랜치의 버그 수정 커밋을 main에 먼저 적용하고 싶을 때 유용합니다.',
        },
      },
      {
        '@type': 'Question',
        name: 'git reset은 위험한가요?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'git reset은 브랜치 포인터를 이전 커밋으로 되돌립니다. 로컬에서는 안전하지만, 이미 push한 커밋을 reset하면 협업에 문제가 생길 수 있습니다. 이 시각화 도구에서 안전하게 연습해보세요.',
        },
      },
    ],
  }

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(webAppJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />

      <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-teal-100 dark:from-gray-900 dark:to-gray-800 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <Breadcrumb />

          <Suspense
            fallback={
              <div className="text-center py-20 text-gray-400">Loading...</div>
            }
          >
            <I18nWrapper>
              <GitVisualizer />
            </I18nWrapper>
          </Suspense>

          <div className="mt-8">
            <RelatedTools />
          </div>
        </div>
      </div>
    </>
  )
}
