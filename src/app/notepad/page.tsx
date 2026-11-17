import { Metadata } from 'next'
import Notepad from '@/components/Notepad'
import I18nWrapper from '@/components/I18nWrapper'
import RelatedTools from '@/components/RelatedTools'
import { FaqJsonLd } from '@/components/ToolFaq'
import notepadMessages from '../../../messages/generated/ko/ns/notepad.json'

const TITLE = '온라인 메모장 - 원고 보호·저장 상태·백업 | 툴허브'
const DESCRIPTION = '메모 작성·검색·고정·TXT/JSON 백업과 읽어주기 전달을 이용하세요. 자동 저장 상태·다른 탭 변경을 구분하고 저장 실패나 늦은 파일 읽기에도 현재 원고를 보존합니다. 본문을 공유 URL에 자동 추가하지 않습니다.'

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  keywords: '온라인 메모장, 메모장, 노트패드, notepad, 웹 메모장, 자동 저장 메모',
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    url: 'https://toolhub.ai.kr/notepad/',
    siteName: '툴허브',
    locale: 'ko_KR',
    type: 'website',
    images: [{ url: 'https://toolhub.ai.kr/og/notepad.png', width: 1200, height: 630, alt: '온라인 메모장' }],
  },
  twitter: { card: 'summary_large_image', title: TITLE, description: DESCRIPTION, images: ['https://toolhub.ai.kr/og/notepad.png'] },
  alternates: { canonical: 'https://toolhub.ai.kr/notepad/' },
}

export default function NotepadPage() {
  const jsonLd = {
    '@context': 'https://schema.org', '@type': 'WebApplication',
    name: '온라인 메모장', description: DESCRIPTION,
    url: 'https://toolhub.ai.kr/notepad/', applicationCategory: 'UtilityApplication',
    operatingSystem: 'Any', browserRequirements: 'JavaScript',
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'KRW' },
    featureList: ['로그인 없는 메모·자동 저장 상태 안내', '여러 메모·검색·고정', '찾기·바꾸기', '전체 백업·복원(JSON)', '.txt 저장·불러오기', '글자수·원고지 매수·바이트', '집중 모드', '외부 변경 확인·현재 메모와 함께 보관', '현재 메모·선택한 글 읽어주기로 보내기', '본문을 URL에 넣지 않는 일회성 전달'],
  }
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <FaqJsonLd items={notepadMessages.notepad.guide.faq.items} />
      <div className="min-h-screen py-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
            <I18nWrapper><Notepad />  <div className="mt-8">
    <RelatedTools />
  </div>
</I18nWrapper>
        </div>
      </div>
      {/* SEO 콘텐츠 */}
      <section className="max-w-4xl mx-auto px-4 pb-12">
        <div className="mt-12 border-t border-line pt-8">
          <h2 className="text-xl font-bold text-fg mb-4">
            온라인 메모장이란?
          </h2>
          <p className="text-body leading-relaxed mb-6">
            이 브라우저에서 여러 메모를 작성·검색·고정하고 찾기 바꾸기와 TXT/JSON 백업을 사용하는 도구입니다. 입력을 멈춘 뒤 자동 저장을 시도하며 현재 원고와 확인된 저장 상태를 구분합니다. 다른 탭의 변경이나 저장 실패가 현재 글을 곧바로 덮지 않도록 처리하지만, 탭 닫기·브라우저 강제 종료 때 마지막 저장 완료를 보장하지는 않습니다.
          </p>
          <h3 className="text-lg font-semibold text-fg mb-3">
            온라인 메모장 활용 팁
          </h3>
          <ul className="list-disc list-inside space-y-2 text-body">
            <li><strong>외부 변경 확인:</strong> 다른 탭의 저장본을 다시 확인한 뒤 현재 메모와 함께 보관할 수 있습니다. 같은 ID의 내용이 다르면 별도 메모로 남기며 현재 글을 자동 삭제하지 않습니다.</li>
            <li><strong>가져오기와 편집:</strong> 파일 읽기 중 새로 편집하면 오래된 가져오기를 취소합니다. 실패·부분 결과 안내를 확인하고 중요한 현재 원고는 먼저 백업하세요.</li>
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
