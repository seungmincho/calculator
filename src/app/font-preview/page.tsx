import { Metadata } from 'next'
import FontPreview from '@/components/FontPreview'
import I18nWrapper from '@/components/I18nWrapper'
import RelatedTools from '@/components/RelatedTools'
import { FaqJsonLd } from '@/components/ToolFaq'
import fontPreviewMessages from '../../../messages/generated/ko/ns/fontPreview.json'

const TITLE = '글꼴 미리보기 - 스타일 조합 저장·JSON 백업 | 툴허브'
const DESCRIPTION = '한글 폰트 38종을 내 문구로 미리보고 최대 4개를 비교하세요. 제목·본문 스타일 조합을 저장하고 JSON 백업에서 선택해 가져옵니다. 원고와 현재 스타일을 유지하며 CSS 복사·링크 공유·내 폰트 파일 미리보기를 제공합니다.'

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  keywords: '폰트 미리보기, 한글 폰트 미리보기, 글꼴 테스트, 무료 한글 폰트, 상업용 무료 폰트, 웹폰트 비교, 구글 폰트 한글, font preview',
  openGraph: { title: TITLE, description: DESCRIPTION, url: 'https://toolhub.ai.kr/font-preview/', siteName: '툴허브', locale: 'ko_KR', type: 'website', images: [{ url: 'https://toolhub.ai.kr/og/font-preview.png', width: 1200, height: 630, alt: '글꼴 미리보기' }] },
  twitter: { card: 'summary_large_image', title: TITLE, description: DESCRIPTION, images: ['https://toolhub.ai.kr/og/font-preview.png'] },
  alternates: { canonical: 'https://toolhub.ai.kr/font-preview/' },
}

export default function FontPreviewPage() {
  const jsonLd = { '@context': 'https://schema.org', '@type': 'WebApplication', name: '글꼴 미리보기', description: DESCRIPTION, url: 'https://toolhub.ai.kr/font-preview/', applicationCategory: 'DesignApplication', operatingSystem: 'Any', browserRequirements: 'JavaScript', offers: { '@type': 'Offer', price: '0', priceCurrency: 'KRW' }, featureList: ['상업용 무료 한글 폰트 38종 (SIL OFL)', '분류·검색·즐겨찾기', '최대 4개 나란히 비교', '크기·굵기·행간·자간·다크 배경', 'CSS 스니펫 복사', '내 폰트 파일(ttf/otf/woff2) 로컬 미리보기', '공유 링크', '제목·본문 글꼴 조합 미리보기', '제목·본문 글꼴 맞바꾸기', '글꼴 조합 CSS 복사·링크 공유', '문구를 저장하지 않는 제목·본문 스타일 조합 저장·불러오기', '조합 JSON 백업·선택 가져오기', '현재 원고와 스타일을 유지하는 저장 목록 추가'] }
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <FaqJsonLd items={fontPreviewMessages.fontPreview.guide.faq.items} />
      <div className="min-h-screen py-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <I18nWrapper><FontPreview />  <div className="mt-8">
    <RelatedTools />
  </div>
</I18nWrapper>
        </div>
      </div>
      {/* SEO 콘텐츠 */}
      <section className="max-w-4xl mx-auto px-4 pb-12">
        <div className="mt-12 border-t border-line pt-8">
          <h2 className="text-xl font-bold text-fg mb-4">
            글꼴 미리보기란?
          </h2>
          <p className="text-body leading-relaxed mb-6">
            글꼴 미리보기는 나눔고딕·본고딕·프리텐다드·IBM Plex Sans KR 등 다양한 한글·영문 웹폰트로 내 텍스트가 어떻게 보이는지 실시간으로 확인하고, 폰트 크기·굵기·줄간격을 조절한 뒤 CSS 코드를 바로 복사할 수 있는 무료 온라인 폰트 테스트 도구입니다. 디자인 시안 검토, 웹사이트 폰트 선정, 인쇄물 폰트 비교 등에 활용할 수 있습니다.
          </p>
          <h3 className="text-lg font-semibold text-fg mb-3">
            글꼴 미리보기 활용 팁
          </h3>
          <ul className="list-disc list-inside space-y-2 text-body">
            <li><strong>한글 본문 가독성 비교:</strong> 실제 본문 문단 텍스트를 입력하여 가독성이 높은 폰트를 빠르게 비교하세요.</li>
            <li><strong>CSS 코드 복사:</strong> 마음에 드는 폰트를 선택하고 CSS 코드를 복사하면 웹폰트 링크(Google Fonts 또는 jsDelivr)와 font-family 선언이 바로 생성됩니다.</li>
            <li><strong>굵기 테스트:</strong> 제목(700~900)과 본문(400~500) 굵기를 각각 확인하여 웹사이트 타이포그래피를 완성하세요.</li>
            <li><strong>조합 백업:</strong> 저장한 제목·본문 글꼴 조합을 JSON으로 옮기고 필요한 항목만 추가하세요. 기존 조합·원고·현재 스타일을 유지하며 파일에는 원고와 글꼴 파일을 포함하지 않습니다.</li>
            <li><strong>줄간격 조절:</strong> line-height를 1.5~1.8로 조절하면 한글 본문의 가독성이 크게 향상됩니다.</li>
          </ul>
        </div>
      </section>
    </>
  )
}
