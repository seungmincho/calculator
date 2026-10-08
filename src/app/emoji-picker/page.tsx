import { Metadata } from 'next'
import EmojiPicker from '@/components/EmojiPicker'
import I18nWrapper from '@/components/I18nWrapper'
import RelatedTools from '@/components/RelatedTools'
import { FaqJsonLd } from '@/components/ToolFaq'
import emojiPickerMessages from '../../../messages/generated/ko/ns/emojiPicker.json'

export const metadata: Metadata = {
  title: '이모지 검색 - 이모지 복사, 카테고리별 모음 | 툴허브',
  description: '이모지 검색 도구 - 한글/영어로 이모지를 검색하고 클릭 한 번으로 복사하세요. 표정, 동물, 음식 등 카테고리별로 분류된 이모지 모음.',
  keywords: '이모지 검색, 이모지 복사, 이모지 모음, emoji picker, 이모티콘 복사, 특수문자',
  openGraph: { title: '이모지 검색 | 툴허브', description: '이모지 검색, 클릭으로 복사, 카테고리별 모음', url: 'https://toolhub.ai.kr/emoji-picker/', siteName: '툴허브', locale: 'ko_KR', type: 'website', images: [{ url: 'https://toolhub.ai.kr/og/emoji-picker.png', width: 1200, height: 630, alt: '이모지 검색' }] },
  twitter: { card: 'summary_large_image', title: '이모지 검색 | 툴허브', description: '이모지 검색, 복사, 카테고리별 모음', images: ['https://toolhub.ai.kr/og/emoji-picker.png'] },
  alternates: { canonical: 'https://toolhub.ai.kr/emoji-picker/' },
}

export default function EmojiPickerPage() {
  const jsonLd = { '@context': 'https://schema.org', '@type': 'WebApplication', name: '이모지 검색', description: '이모지 검색, 클릭으로 복사, 카테고리별 모음', url: 'https://toolhub.ai.kr/emoji-picker/', applicationCategory: 'UtilityApplication', operatingSystem: 'Any', browserRequirements: 'JavaScript', offers: { '@type': 'Offer', price: '0', priceCurrency: 'KRW' }, featureList: ['한글 키워드·초성 이모지 검색', '특수문자(ㅁ+한자 기호) 모음', '텍스트 이모티콘(카오모지)', '피부색 선택', '여러 개 담아 한 번에 복사', '유니코드·HTML 코드 복사', '최근 사용 기록'] }
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <FaqJsonLd items={emojiPickerMessages.emojiPicker.guide.faq.items} />
      <div className="min-h-screen py-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <I18nWrapper><EmojiPicker />  <div className="mt-8">
    <RelatedTools />
  </div>
</I18nWrapper>
        </div>
      </div>
      {/* SEO 콘텐츠 */}
      <section className="max-w-4xl mx-auto px-4 pb-12">
        <div className="mt-12 border-t border-line pt-8">
          <h2 className="text-xl font-bold text-fg mb-4">
            이모지 검색이란?
          </h2>
          <p className="text-body leading-relaxed mb-6">
            이모지 검색 도구는 한글 또는 영어로 원하는 이모지를 검색하고 클릭 한 번으로 클립보드에 복사하는 이모티콘 모음 도구입니다. 표정·사람·동물·음식·여행·스포츠·사물·기호 등 카테고리별로 분류된 이모지를 빠르게 찾아 SNS 게시물, 카카오톡 메시지, 문서 작성 등에 바로 사용할 수 있습니다. 최근 사용한 이모지를 기록하여 자주 쓰는 이모지를 더욱 빠르게 찾을 수 있습니다.
          </p>
          <h3 className="text-lg font-semibold text-fg mb-3">
            이모지 검색 활용 팁
          </h3>
          <ul className="list-disc list-inside space-y-2 text-body">
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
