import { Metadata } from 'next'
import { Suspense } from 'react'
import EmojiPicker from '@/components/EmojiPicker'
import I18nWrapper from '@/components/I18nWrapper'

export const metadata: Metadata = {
  title: '이모지 검색 - 이모지 복사, 카테고리별 모음 | 툴허브',
  description: '이모지 검색 도구 - 한글/영어로 이모지를 검색하고 클릭 한 번으로 복사하세요. 표정, 동물, 음식 등 카테고리별로 분류된 이모지 모음.',
  keywords: '이모지 검색, 이모지 복사, 이모지 모음, emoji picker, 이모티콘 복사, 특수문자',
  openGraph: { title: '이모지 검색 | 툴허브', description: '이모지 검색, 클릭으로 복사, 카테고리별 모음', url: 'https://toolhub.ai.kr/emoji-picker', siteName: '툴허브', locale: 'ko_KR', type: 'website' },
  twitter: { card: 'summary_large_image', title: '이모지 검색 | 툴허브', description: '이모지 검색, 복사, 카테고리별 모음' },
  alternates: { canonical: 'https://toolhub.ai.kr/emoji-picker/' },
}

export default function EmojiPickerPage() {
  const jsonLd = { '@context': 'https://schema.org', '@type': 'WebApplication', name: '이모지 검색', description: '이모지 검색, 클릭으로 복사, 카테고리별 모음', url: 'https://toolhub.ai.kr/emoji-picker', applicationCategory: 'UtilityApplication', operatingSystem: 'Any', browserRequirements: 'JavaScript', offers: { '@type': 'Offer', price: '0', priceCurrency: 'KRW' }, featureList: ['이모지 검색', '클릭 복사', '카테고리별 분류', '최근 사용 기록'] }
  const faqJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
      {
        '@type': 'Question',
        name: '이모지와 이모티콘의 차이는?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: '이모티콘(emoticon)은 문자로 만든 감정 표현입니다: :), :-D, ^_^ 등. 이모지(emoji)는 유니코드 표준에 포함된 그림 문자입니다: 😀, 🎉, 🔥 등. \'이모지\'는 일본어 絵文字(에모지, 그림문자)에서 유래했으며, 2010년 유니코드 6.0에 공식 포함되었습니다. 현재 3,700개 이상의 이모지가 등록되어 있으며 매년 새 이모지가 추가됩니다.',
        },
      },
      {
        '@type': 'Question',
        name: '이모지가 기기마다 다르게 보이는 이유는?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: '이모지는 유니코드 코드포인트만 표준이고, 실제 그림(글리프)은 각 플랫폼이 자체적으로 디자인합니다. Apple, Google, Samsung, Microsoft가 각각 다른 디자인을 사용합니다. 예를 들어 🔫은 Apple에서는 물총, Google에서는 권총 모양이었다가 현재는 모두 물총으로 통일되었습니다. 피부색 수정자(🏻🏼🏽🏾🏿)로 다양한 피부 톤을 표현할 수 있습니다.',
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
          <Suspense fallback={<div className="text-center text-gray-900 dark:text-white">Loading...</div>}><I18nWrapper><EmojiPicker /></I18nWrapper></Suspense>
        </div>
      </div>
      {/* SEO 콘텐츠 */}
      <section className="max-w-4xl mx-auto px-4 pb-12">
        <div className="mt-12 border-t border-gray-200 dark:border-gray-700 pt-8">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
            이모지 검색이란?
          </h2>
          <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-6">
            이모지 검색 도구는 한글 또는 영어로 원하는 이모지를 검색하고 클릭 한 번으로 클립보드에 복사하는 이모티콘 모음 도구입니다. 표정·사람·동물·음식·여행·스포츠·사물·기호 등 카테고리별로 분류된 이모지를 빠르게 찾아 SNS 게시물, 카카오톡 메시지, 문서 작성 등에 바로 사용할 수 있습니다. 최근 사용한 이모지를 기록하여 자주 쓰는 이모지를 더욱 빠르게 찾을 수 있습니다.
          </p>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
            이모지 검색 활용 팁
          </h3>
          <ul className="list-disc list-inside space-y-2 text-gray-700 dark:text-gray-300">
            <li><strong>한글 검색:</strong> &apos;웃음&apos;, &apos;하트&apos;, &apos;고양이&apos; 등 한글로 검색하면 관련 이모지가 즉시 표시됩니다. 영어 키워드(smile, heart, cat)로도 검색 가능합니다.</li>
            <li><strong>문서 가독성 향상:</strong> 블로그 제목, 프레젠테이션 소제목, 마크다운 문서에 이모지를 추가하면 시각적 흥미와 가독성을 동시에 높일 수 있습니다.</li>
            <li><strong>SNS 마케팅:</strong> 인스타그램, 트위터 게시물에 적절한 이모지를 사용하면 참여율(engagement)이 평균 25% 이상 향상된다는 연구 결과가 있습니다.</li>
            <li><strong>피부 톤 변형:</strong> 사람 이모지는 피부색 변형자를 지원합니다. 일부 이모지는 길게 누르거나 선택하면 다양한 피부 톤을 고를 수 있습니다.</li>
          </ul>
        </div>
      </section>
    </>
  )
}
