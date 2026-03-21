import { Metadata } from 'next'
import { Suspense } from 'react'
import Notepad from '@/components/Notepad'
import I18nWrapper from '@/components/I18nWrapper'
import Breadcrumb from '@/components/Breadcrumb'
import RelatedTools from '@/components/RelatedTools'

export const metadata: Metadata = {
  title: '온라인 메모장 - 자동 저장, 메모 관리 | 툴허브',
  description: '온라인 메모장 - 자동 저장, 여러 메모 관리, .txt 내보내기. 간편하게 메모하고 브라우저에 자동 저장됩니다.',
  keywords: '온라인 메모장, 메모장, 노트패드, notepad, 웹 메모장, 자동 저장 메모',
  openGraph: {
    title: '온라인 메모장 | 툴허브',
    description: '자동 저장, 여러 메모 관리, .txt 내보내기',
    url: 'https://toolhub.ai.kr/notepad',
    siteName: '툴허브',
    locale: 'ko_KR',
    type: 'website',
  },
  twitter: { card: 'summary_large_image', title: '온라인 메모장 | 툴허브', description: '자동 저장 온라인 메모장' },
  alternates: { canonical: 'https://toolhub.ai.kr/notepad/' },
}

export default function NotepadPage() {
  const jsonLd = {
    '@context': 'https://schema.org', '@type': 'WebApplication',
    name: '온라인 메모장', description: '자동 저장, 여러 메모 관리, .txt 내보내기',
    url: 'https://toolhub.ai.kr/notepad', applicationCategory: 'UtilityApplication',
    operatingSystem: 'Any', browserRequirements: 'JavaScript',
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'KRW' },
    featureList: ['자동 저장', '여러 메모 관리', '.txt 내보내기', '글자/단어/줄 수 표시'],
  }
  const faqJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
      {
        '@type': 'Question',
        name: '브라우저 메모장의 장점은?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: '① 설치 불필요: 브라우저만 있으면 어디서든 사용 가능 ② 자동 저장: localStorage에 자동 저장되어 실수로 탭을 닫아도 내용 보존 ③ 개인정보 보호: 서버에 전송하지 않고 브라우저에만 저장 ④ 빠른 접근: 북마크에 추가하면 원클릭 접속 ⑤ 크로스 플랫폼: PC, 모바일 모두 사용 가능. 다만 브라우저 데이터를 삭제하면 내용이 사라지므로 중요한 내용은 별도 백업이 필요합니다.',
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
            <I18nWrapper><Notepad />  <div className="mt-8">
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
            온라인 메모장이란?
          </h2>
          <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-6">
            온라인 메모장은 설치 없이 브라우저에서 바로 사용할 수 있는 무료 웹 메모 도구입니다. 입력한 내용이 브라우저 로컬 저장소(localStorage)에 자동 저장되어 탭을 닫거나 새로고침해도 내용이 유지됩니다. 여러 개의 메모를 만들어 관리하고, .txt 파일로 내보낼 수 있으며, 글자 수·단어 수·줄 수를 실시간으로 확인할 수 있습니다. 빠른 메모, 임시 텍스트 저장, 아이디어 기록에 최적입니다.
          </p>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
            온라인 메모장 활용 팁
          </h3>
          <ul className="list-disc list-inside space-y-2 text-gray-700 dark:text-gray-300">
            <li><strong>북마크 등록:</strong> 이 페이지를 브라우저 북마크에 추가하면 원클릭으로 메모장을 열 수 있어 빠른 메모 작성이 가능합니다.</li>
            <li><strong>여러 메모 관리:</strong> 주제별로 메모를 분리해 관리하면 업무 메모, 쇼핑 목록, 아이디어 노트를 깔끔하게 구분할 수 있습니다.</li>
            <li><strong>.txt 내보내기:</strong> 중요한 내용은 정기적으로 .txt 파일로 저장해 두세요. 브라우저 데이터 삭제 시 로컬 저장 내용이 사라질 수 있습니다.</li>
            <li><strong>글자 수 확인:</strong> 공모전 원고, 자기소개서, SNS 게시글 등 글자 수 제한이 있는 글 작성 시 실시간 글자 수 표시 기능이 유용합니다.</li>
          </ul>
        </div>
      </section>
    </>
  )
}
