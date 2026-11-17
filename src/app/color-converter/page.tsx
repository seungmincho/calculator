import type { Metadata } from 'next'
import I18nWrapper from '@/components/I18nWrapper'
import ColorConverter from '@/components/ColorConverter'
import RelatedTools from '@/components/RelatedTools'
import ToolFaq from '@/components/ToolFaq'
import koMessages from '@/../messages/generated/ko/ns/colorConverter.json'

const TITLE = '색상 변환기 - HEX 입력·RGB/HSL 변환·공유 | 툴허브'
const DESCRIPTION = '3자리·6자리 HEX, 색상 선택기와 RGB/HSL 슬라이더로 고른 색을 HEX·RGB·HSL·HSV·CMYK로 표시합니다. 불완전한 입력은 그대로 유지하고 마지막 유효 색을 확인·복사·공유할 수 있습니다. CMYK는 인쇄 참고값입니다.'

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  keywords: '색상변환기, hex변환, rgb변환, hsl변환, cmyk변환, 컬러피커, color converter',
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    type: 'website',
    siteName: '툴허브',
    url: 'https://toolhub.ai.kr/color-converter/',
    locale: 'ko_KR',
    images: [{ url: 'https://toolhub.ai.kr/og/color-converter.png', width: 1200, height: 630, alt: '색상 변환기' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: TITLE,
    description: DESCRIPTION,
    images: ['https://toolhub.ai.kr/og/color-converter.png'],
  },
  alternates: {
    canonical: 'https://toolhub.ai.kr/color-converter/',
  },
}

export default function ColorConverterPage() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: '색상 변환기',
    description: DESCRIPTION,
    url: 'https://toolhub.ai.kr/color-converter/',
    applicationCategory: 'DeveloperApplication',
    operatingSystem: 'Any',
    browserRequirements: 'JavaScript',
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'KRW' },
    featureList: ['3자리·6자리 불투명 HEX 입력', '색상 선택기·RGB/HSL 슬라이더', 'HEX·RGB·HSL·HSV·CMYK 표시', '불완전 입력·마지막 유효 색 보존', '전체 색상 값 복사·실패 수동 선택·재시도', '유효 색 링크·PNG 공유']
  }

  const faq = koMessages.colorConverter.guide.faq.items

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <I18nWrapper>
        <ColorConverter />
        <ToolFaq items={faq} />
        <div className="mt-8">

          <RelatedTools />

        </div>

      </I18nWrapper>
      {/* SEO 콘텐츠 */}
      <section className="max-w-4xl mx-auto px-4 pb-12">
        <div className="mt-12 border-t border-line pt-8">
          <h2 className="text-xl font-bold text-fg mb-4">
            색상 변환기란?
          </h2>
          <p className="text-body leading-relaxed mb-6">
            색상 변환기는 <strong>3자리·6자리 HEX를 RGB, HSL, HSV, CMYK 표기로 변환</strong>하는 무료 도구입니다. 색상 선택기·기본 색상·RGB/HSL 슬라이더로도 색을 선택할 수 있습니다. 입력 중에는 원문을 유지하고, 불완전한 값일 때는 마지막 유효 색을 안내합니다. 복사와 공유는 표시된 유효 색을 사용하며 CMYK 값은 인쇄 참고용 근사값입니다.
          </p>
          <h3 className="text-lg font-semibold text-fg mb-3">
            색상 변환기 활용 팁
          </h3>
          <ul className="list-disc list-inside space-y-2 text-body">
            <li><strong>웹 개발:</strong> 3자리 또는 6자리 HEX를 입력하고 CSS에 쓸 RGB/HSL 표기를 복사하세요. 투명도·색 이름·CSS 변수 입력은 지원하지 않습니다.</li>
            <li><strong>인쇄 작업:</strong> CMYK는 ICC 프로파일을 적용하지 않은 참고값입니다. 실제 결과는 잉크·종이·기기 설정에 따라 별도로 확인하세요.</li>
            <li><strong>HSL 직관적 조절:</strong> HSL로 변환하면 밝기와 채도를 수치로 정밀하게 조절하기 쉽습니다.</li>
            <li><strong>복사·공유:</strong> 복사가 실패하면 전체 값을 직접 선택하거나 재시도할 수 있습니다. 공유 주소는 유효한 색만 담고 편집 중인 원문은 담지 않습니다.</li>
            <li><strong>브랜드 가이드라인:</strong> 브랜드 색상을 HEX·RGB·CMYK 값으로 모두 기록해 일관성을 유지하세요.</li>
          </ul>
        </div>
      </section>
    </>
  )
}
