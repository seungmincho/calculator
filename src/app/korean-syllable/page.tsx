import { Metadata } from 'next'
import KoreanSyllable from '@/components/KoreanSyllable'
import I18nWrapper from '@/components/I18nWrapper'
import RelatedTools from '@/components/RelatedTools'
import { FaqJsonLd } from '@/components/ToolFaq'
import koreanSyllableMessages from '../../../messages/generated/ko/ns/koreanSyllable.json'

export const metadata: Metadata = {
  title: '한글 초성 추출기 - 자음/모음 분리, 초성 검색 | 툴허브',
  description: '한글 초성 추출기 - 초성만 추출(초성 퀴즈·초성 검색), 자음/모음 분리(겹받침 분리), 자모 합치기, 로마자 표기(음운 변화 반영), 을/를·이/가 조사 자동 선택, 유니코드·NFD까지 입력 즉시 변환.',
  keywords: '초성 추출, 초성 변환기, 한글 자모 분리, 자음 모음 분리, 자모 합치기, 겹받침 분리, 로마자 표기 변환, 조사 자동 선택, 받침 유무, 한글 유니코드, NFD NFC, korean syllable decompose',
  openGraph: { title: '한글 초성 추출기 | 툴허브', description: '한글 초성/자모 분리', url: 'https://toolhub.ai.kr/korean-syllable/', siteName: '툴허브', locale: 'ko_KR', type: 'website', images: [{ url: 'https://toolhub.ai.kr/og/korean-syllable.png', width: 1200, height: 630, alt: '한글 초성 추출기' }] },
  twitter: { card: 'summary_large_image', title: '한글 초성 추출기 | 툴허브', description: '한글 초성 추출, 자모 분리', images: ['https://toolhub.ai.kr/og/korean-syllable.png'] },
  alternates: { canonical: 'https://toolhub.ai.kr/korean-syllable/' },
}

export default function KoreanSyllablePage() {
  const jsonLd = { '@context': 'https://schema.org', '@type': 'WebApplication', name: '한글 초성 추출기', description: '한글 초성/자모 분리', url: 'https://toolhub.ai.kr/korean-syllable/', applicationCategory: 'UtilityApplication', operatingSystem: 'Any', browserRequirements: 'JavaScript', offers: { '@type': 'Offer', price: '0', priceCurrency: 'KRW' }, featureList: ['초성 추출', '자모 분리(겹받침·겹모음)', '자모 합치기·두벌식 키 변환', '로마자 표기(국어의 로마자 표기법)', '조사 자동 선택(을/를·이/가·으로/로)', '유니코드 코드포인트·NFD 변환'] }
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <FaqJsonLd items={koreanSyllableMessages.koreanSyllable.guide.faq.items} />
      <div className="min-h-screen py-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <I18nWrapper>
            <KoreanSyllable />
            <div className="mt-8">
              <RelatedTools />
            </div>
          </I18nWrapper>
        </div>
      </div>
      {/* SEO 콘텐츠 */}
      <section className="max-w-4xl mx-auto px-4 pb-12">
        <div className="mt-12 border-t border-line pt-8">
          <h2 className="text-xl font-bold text-fg mb-4">
            한글 초성 추출기란?
          </h2>
          <p className="text-body leading-relaxed mb-6">
            한글 초성 추출기는 한글 텍스트의 초성(첫소리), 중성(홀소리), 종성(받침)을 분리하거나 초성만 추출하는 도구입니다. '안녕하세요'를 입력하면 'ㅇㄴㅎㅅㅇ'와 같이 초성만 추출하거나, 자모를 완전히 분리할 수 있습니다. 초성 검색 기능 구현, 한글 정렬 알고리즘 개발, 언어학 연구 등에 활용됩니다.
          </p>
          <h3 className="text-lg font-semibold text-fg mb-3">
            한글 초성 추출기 활용 팁
          </h3>
          <ul className="list-disc list-inside space-y-2 text-body">
            <li><strong>초성 검색 구현:</strong> 앱·웹에서 'ㄱㄴ'으로 '강남'을 찾는 초성 검색 기능 개발 시 초성 추출 로직을 참고하세요.</li>
            <li><strong>한글 정렬:</strong> 이름 목록을 가나다순으로 정렬할 때 초성 기준 정렬 알고리즘에 이 도구의 분리 원리를 적용할 수 있습니다.</li>
            <li><strong>자모 합치기:</strong> 분리된 자모(ㅎ, ㅏ, ㄴ)를 다시 합쳐 완성형 한글 '한'으로 조합하는 기능도 제공합니다.</li>
            <li><strong>유니코드 한글 원리:</strong> 한글 유니코드는 가(0xAC00)를 시작으로 초성 19개×중성 21개×종성 28개 = 11,172개의 완성형이 연속 배치됩니다.</li>
            <li><strong>로마자 표기:</strong> 국어의 로마자 표기법에 따라 연음·자음동화·구개음화를 반영합니다(종로 → jongno, 같이 → gachi). 된소리와 ㄴ 첨가는 반영하지 않습니다.</li>
            <li><strong>조사 자동 선택:</strong> 받침 유무로 을/를·이/가·은/는·과/와·으로/로를 고릅니다. 개발용 JavaScript 코드도 복사할 수 있습니다.</li>
            <li><strong>한국어 NLP 전처리:</strong> 자연어 처리(NLP) 모델 학습을 위해 한글 텍스트를 자모 단위로 분해할 때 초성 추출이 핵심 전처리 단계입니다.</li>
          </ul>
        </div>
      </section>
    </>
  )
}
