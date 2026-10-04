import { Metadata } from 'next'
import StampGenerator from '@/components/StampGenerator'
import I18nWrapper from '@/components/I18nWrapper'
import RelatedTools from '@/components/RelatedTools'
import ToolFaq from '@/components/ToolFaq'

export const metadata: Metadata = {
  title: '인감 도장 생성기 - 온라인 도장 만들기, 전자 서명 | 툴허브',
  description: '무료 온라인 도장 만들기. 이름 도장·사각 직인·법인인감(대표이사인)을 전통 배치로 만들고 투명 배경 PNG(최대 2000px)·SVG로 저장. 잉크 질감, ‘인’·‘지인’ 접미사 지원.',
  keywords: '온라인 도장 만들기, 도장 이미지 투명 PNG, 법인인감 만들기, 직인 만들기, 인감 도장 만들기, 온라인 도장 생성기, 도장 이미지 만들기, 전자 서명, 한글 도장, 원형 도장, 사각 도장, 무료 도장 생성, 도장 PNG 다운로드',
  openGraph: {
    title: '인감 도장 생성기 - 온라인 도장 만들기 | 툴허브',
    description: '원형·사각·타원 도장을 무료로 만들고 PNG 다운로드. 전통 붉은 인감부터 현대적 스타일까지.',
    url: 'https://toolhub.ai.kr/stamp-generator',
    siteName: '툴허브',
    locale: 'ko_KR',
    type: 'website',
    images: [{ url: 'https://toolhub.ai.kr/og/stamp-generator.png', width: 1200, height: 630, alt: '인감 도장 생성기' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: '인감 도장 생성기 | 툴허브',
    description: '원형·사각·타원 도장을 무료로 만들고 PNG 다운로드.',
    images: ['https://toolhub.ai.kr/og/stamp-generator.png'],
  },
  alternates: {
    canonical: 'https://toolhub.ai.kr/stamp-generator/',
  },
}

export default function StampGeneratorPage() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: '인감 도장 생성기',
    description: '무료 온라인 인감 도장 생성기. 원형·사각·타원 도장을 한국어 이름으로 즉시 만들고 PNG로 다운로드.',
    url: 'https://toolhub.ai.kr/stamp-generator/',
    applicationCategory: 'UtilityApplication',
    operatingSystem: 'Any',
    browserRequirements: 'JavaScript',
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'KRW' },
    featureList: [
      '원형·타원 이름 도장, 사각 직인, 법인인감(상호 고리 + 대표이사인)',
      '전통 배치: 오른쪽 열부터 세로쓰기, ‘인’·‘지인’ 접미사',
      '잉크 번짐·찍힘 질감 옵션',
      '전통 붉은 인감·현대 파란·검정·커스텀 색상',
      '명조·고딕·붓글씨 글꼴 3종',
      '테두리 굵기·이중 테두리·투명도 조절',
      '투명 PNG(500/1000/2000px)·SVG 다운로드, 클립보드 복사, 링크 공유',
    ],
  }
  const faq = [
    { q: '인감 도장 생성기로 만든 도장을 법적으로 사용할 수 있나요?', a: '이 도장 이미지는 디자인·문서 장식·개인 메모 용도로만 사용하세요. 법적 효력을 가지는 인감 도장은 반드시 인감도장 등록 절차를 거쳐야 합니다.' },
    { q: '도장에 몇 글자까지 입력할 수 있나요?', a: '이름·직함은 최대 10글자(접미사 제외), 법인인감 상호는 24글자까지 입력할 수 있습니다. 전통 도장처럼 오른쪽 열부터 세로로 배치되며, 글자 수에 맞춰 자동으로 칸을 나눕니다.' },
    { q: '생성한 도장 이미지를 어떤 형식으로 저장할 수 있나요?', a: '배경이 투명한 PNG(500·1000·2000px)와 확대해도 깨지지 않는 SVG로 저장하거나 클립보드에 복사할 수 있어 한글·워드·PPT·PDF 문서에 바로 붙여넣을 수 있습니다.' },
  ]

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <div className="min-h-screen py-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
            <I18nWrapper>
              <StampGenerator />
              <ToolFaq items={faq} />
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
            인감 도장 생성기란?
          </h2>
          <p className="text-body leading-relaxed mb-6">
            인감 도장 생성기는 이름이나 회사명을 입력해 원형·타원 이름 도장, 사각 직인, 법인인감(바깥 고리에 상호, 가운데 대표이사인) 이미지를 무료로 만드는 온라인 도구입니다. 실제 도장처럼 오른쪽 열부터 세로로 글자를 배치하고 '인'·'지인' 접미사와 잉크 번짐 질감을 더할 수 있으며, 투명 배경 PNG(최대 2000px)나 SVG로 저장해 문서에 바로 활용할 수 있습니다.
          </p>
          <h3 className="text-lg font-semibold text-fg mb-3">
            도장 생성기 활용 팁
          </h3>
          <ul className="list-disc list-inside space-y-2 text-body">
            <li><strong>투명 배경 PNG 활용:</strong> 배경이 투명한 PNG로 저장하면 어떤 색상의 문서에도 자연스럽게 삽입되며, Word·한글·PPT에서 바로 붙여넣기 가능합니다.</li>
            <li><strong>글꼴 선택 기준:</strong> 공식 문서엔 명조체, 현대적인 디자인엔 고딕체, 전통적인 느낌엔 붓글씨체를 선택하면 더 어울리는 도장을 만들 수 있습니다.</li>
            <li><strong>크기 및 테두리 조절:</strong> 문서 내 삽입할 위치에 맞게 도장 크기와 테두리 굵기를 조절하여 보기 좋은 비율로 설정하세요.</li>
            <li><strong>법적 효력 주의:</strong> 생성된 도장 이미지는 디자인·장식 용도로만 사용하세요. 법적 효력이 필요한 인감 도장은 반드시 관할 행정기관에 등록해야 합니다.</li>
          </ul>
        </div>
      </section>
    </>
  )
}
