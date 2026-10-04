import { Metadata } from 'next'
import GpaConverter from '@/components/GpaConverter'
import I18nWrapper from '@/components/I18nWrapper'
import RelatedTools from '@/components/RelatedTools'
import { FaqJsonLd } from '@/components/ToolFaq'
import gpaConverterCalcMessages from '../../../messages/generated/ko/ns/gpaConverterCalc.json'

export const metadata: Metadata = {
  title: '4.3 4.5 학점 변환기 - 4.0·백분율 환산표 | 툴허브',
  description: '4.5·4.3·4.0 만점 학점과 백분율(100점)을 한 번에 상호 변환하고 등급(A+~F)까지 확인하는 학점 변환기. 취업·대학원·해외 유학 지원 시 학점 환산에 사용하세요.',
  keywords: '학점 변환기, 4.3 4.5 변환, 4.5 4.3 학점, 학점 백분위 변환, GPA 변환, 4.0 학점 변환, 학점 등급표, 대학원 학점 환산, 백분율 학점',
  openGraph: {
    title: '학점 변환기 - 4.5·4.3·4.0·백분율 | 툴허브',
    description: '학점을 4.5·4.3·4.0·백분율로 한 번에 변환 + 등급 확인',
    url: 'https://toolhub.ai.kr/gpa-converter',
    siteName: '툴허브',
    locale: 'ko_KR',
    type: 'website',
    images: [{ url: 'https://toolhub.ai.kr/og/gpa-converter.png', width: 1200, height: 630, alt: '학점 변환기' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: '학점 변환기 - 4.5·4.3·4.0·백분율 | 툴허브',
    description: '학점을 전 스케일로 한 번에 변환',
    images: ['https://toolhub.ai.kr/og/gpa-converter.png'],
  },
  alternates: {
    canonical: 'https://toolhub.ai.kr/gpa-converter/',
  },
}

export default function GpaConverterPage() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: '학점 변환기',
    description: '4.5·4.3·4.0 만점 학점과 백분율을 상호 변환하고 등급을 확인하는 도구',
    url: 'https://toolhub.ai.kr/gpa-converter/',
    applicationCategory: 'UtilityApplication',
    operatingSystem: 'Any',
    browserRequirements: 'JavaScript',
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'KRW' },
    featureList: ['4.5·4.3·4.0 만점 상호 변환', '백분율(100점) 환산', '등급(A+~F) 표시', '등급 참고표', '결과 이미지 저장', '링크 공유'],
  }


  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      {/* 컴포넌트가 화면에 보여 주는 FAQ와 같은 문구 */}
      <FaqJsonLd items={gpaConverterCalcMessages.gpaConverterCalc.guide.faq.items} />
      <div className="min-h-screen py-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
            <I18nWrapper>
              <GpaConverter />
              <div className="mt-8">
                <RelatedTools />
              </div>
            </I18nWrapper>
        </div>
      </div>
      {/* SEO 콘텐츠 */}
      <section className="max-w-4xl mx-auto px-4 pb-12">
        <div className="mt-12 border-t border-line pt-8">
          <h2 className="text-xl font-bold text-fg mb-4">학점 변환기란?</h2>
          <p className="text-body leading-relaxed mb-6">
            학점 변환기는 4.5 만점, 4.3 만점, 4.0 만점 학점과 백분율(100점) 성적을 서로 변환해 주는 도구입니다. 값을 한 번만 입력하면 나머지 모든 체계의 환산값과 등급(A+~F)을 동시에 보여주므로, 취업·대학원·편입·해외 유학 지원처럼 학교마다 다른 학점 체계를 요구할 때 유용합니다. 결과는 링크로 공유하거나 이미지로 저장할 수 있습니다.
          </p>
          <h3 className="text-lg font-semibold text-fg mb-3">4.5 만점 vs 4.3 만점 차이</h3>
          <ul className="list-disc list-inside space-y-2 text-body mb-6">
            <li><strong>4.5 만점:</strong> A+(4.5), A0(4.0), B+(3.5), B0(3.0)… 국내 다수 대학이 사용.</li>
            <li><strong>4.3 만점:</strong> A+(4.3), A0(4.0), B+(3.3), B0(3.0)… 일부 대학·미국식 +/- 체계에 가까움.</li>
            <li><strong>변환 공식:</strong> 4.5→4.3은 ×(4.3/4.5)≈0.9556, 4.3→4.5는 ×(4.5/4.3)≈1.0465로 선형 환산.</li>
            <li><strong>주의:</strong> 백분율·등급 기준은 학교/교수마다 달라, 공식 성적증명서의 환산 기준을 함께 확인하세요.</li>
          </ul>
          <h3 className="text-lg font-semibold text-fg mb-3">함께 쓰면 좋은 도구</h3>
          <ul className="list-disc list-inside space-y-2 text-body">
            <li><strong>학점 계산기:</strong> 과목별 성적을 입력해 학기·전체 평점(GPA)을 직접 계산.</li>
            <li><strong>내신 등급 계산기:</strong> 석차와 총원으로 고등학교 내신 1~9등급과 백분위를 계산.</li>
          </ul>
        </div>
      </section>
    </>
  )
}
