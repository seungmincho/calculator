import { Metadata } from 'next'
import AspectRatio from '@/components/AspectRatio'
import I18nWrapper from '@/components/I18nWrapper'
import RelatedTools from '@/components/RelatedTools'

export const metadata: Metadata = {
  title: '화면 비율 계산기 - 16:9·9:16·4:5 해상도 | 툴허브',
  description: '가로×세로를 넣으면 16:9 같은 비율이 바로 나오는 화면 비율 계산기. 유튜브·쇼츠·릴스·인스타 4:5 규격, 세이프존 미리보기, 내 이미지 자르기/여백 저장, 720p~8K 해상도 표.',
  keywords: '화면 비율 계산기, aspect ratio calculator, 종횡비, 해상도 계산, 16:9, 9:16, 4:5, 쇼츠 사이즈, 릴스 사이즈, 인스타 피드 사이즈, 유튜브 썸네일 크기',
  openGraph: { title: '화면 비율 계산기 | 툴허브', description: '종횡비 및 해상도 계산', url: 'https://toolhub.ai.kr/aspect-ratio', siteName: '툴허브', locale: 'ko_KR', type: 'website', images: [{ url: 'https://toolhub.ai.kr/og/aspect-ratio.png', width: 1200, height: 630, alt: '화면 비율 계산기' }] },
  twitter: { card: 'summary_large_image', title: '화면 비율 계산기 | 툴허브', description: '종횡비 및 해상도 계산', images: ['https://toolhub.ai.kr/og/aspect-ratio.png'] },
  alternates: { canonical: 'https://toolhub.ai.kr/aspect-ratio/' },
}

export default function AspectRatioPage() {
  const jsonLd = { '@context': 'https://schema.org', '@type': 'WebApplication', name: '화면 비율 계산기', description: '종횡비 및 해상도 계산', url: 'https://toolhub.ai.kr/aspect-ratio', applicationCategory: 'UtilityApplication', operatingSystem: 'Any', browserRequirements: 'JavaScript', offers: { '@type': 'Offer', price: '0', priceCurrency: 'KRW' }, featureList: ['종횡비 계산', '비율+한 변으로 나머지 계산', '플랫폼 규격 프리셋', '쇼츠·릴스 세이프존', '이미지 자르기/여백 저장', '해상도 표'] }
  const faqJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
      {
        '@type': 'Question',
        name: '화면 비율(Aspect Ratio)이란?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: '화면 비율은 가로와 세로의 비율을 나타냅니다. 주요 비율: 16:9(FHD/4K TV, 유튜브), 4:3(구형 TV, iPad), 21:9(울트라와이드 모니터), 1:1(인스타그램 정사각형), 9:16(모바일 세로, 릴스/쇼츠), 3:2(DSLR 사진). 웹 디자인에서는 CSS aspect-ratio 속성으로 요소의 비율을 유지할 수 있으며, 반응형 이미지/비디오에 필수입니다.',
        },
      },
    ],
  }
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />
      <div className="min-h-screen py-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <I18nWrapper><AspectRatio />  <div className="mt-8">
    <RelatedTools />
  </div>
</I18nWrapper>
        </div>
      </div>
      {/* SEO 콘텐츠 */}
      <section className="max-w-4xl mx-auto px-4 pb-12">
        <div className="mt-12 border-t border-line pt-8">
          <h2 className="text-xl font-bold text-fg mb-4">
            화면 비율(종횡비) 계산기란?
          </h2>
          <p className="text-body leading-relaxed mb-6">
            화면 비율 계산기는 이미지나 동영상의 가로세로 비율(종횡비, Aspect Ratio)을 계산하고 특정 비율을 유지하면서 해상도를 변환하는 무료 온라인 도구입니다. 16:9, 4:3, 1:1, 9:16 등 주요 비율 프리셋과 함께 원하는 한 쪽 치수를 입력하면 나머지 값을 자동으로 계산합니다. 유튜브 썸네일, 인스타그램 이미지, TV 해상도 최적화, 반응형 웹 디자인 작업에 필수적인 도구입니다.
          </p>
          <h3 className="text-lg font-semibold text-fg mb-3">
            화면 비율 계산기 활용 팁
          </h3>
          <ul className="list-disc list-inside space-y-2 text-body">
            <li><strong>유튜브·TV 콘텐츠:</strong> 16:9 비율이 표준이며, FHD(1920×1080), QHD(2560×1440), 4K(3840×2160) 해상도를 활용하세요.</li>
            <li><strong>인스타그램 최적화:</strong> 피드는 세로 4:5(1080×1350)가 화면을 가장 많이 차지하고, 정사각형은 1:1(1080×1080), 릴스·스토리는 9:16(1080×1920)입니다.</li>
            <li><strong>쇼츠·릴스 세이프존:</strong> 9:16 영상은 위·아래와 오른쪽에 좋아요·자막·버튼이 겹칩니다. 자막과 로고는 가운데 안전 영역 안에 두세요.</li>
            <li><strong>DSLR 사진 인화:</strong> 카메라 센서 비율은 3:2(6×4인치, 10×15cm 인화)가 표준이며, 4:3은 마이크로포서드 카메라에 해당합니다.</li>
            <li><strong>반응형 웹 디자인:</strong> CSS aspect-ratio 속성과 함께 계산 결과를 활용하면 다양한 화면 크기에서 비율을 유지할 수 있습니다.</li>
            <li><strong>울트라와이드 모니터:</strong> 21:9(2560×1080 또는 3440×1440) 비율은 영상 편집과 멀티태스킹 환경에 최적화되어 있습니다.</li>
          </ul>
        </div>
      </section>
    </>
  )
}
