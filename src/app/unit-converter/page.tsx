import type { Metadata } from 'next'
import I18nWrapper from '@/components/I18nWrapper'
import UnitConverter from '@/components/UnitConverter'
import RelatedTools from '@/components/RelatedTools'
import ToolFaq from '@/components/ToolFaq'
import unitMessages from '../../../messages/generated/ko/ns/unitConverter.json'

const TITLE = '단위 변환기 - 여러 값 변환·TSV·CSV | 툴허브'
const DESCRIPTION = '단일 값 환산과 변환 쌍 저장, 같은 조합의 최대1,000행 변환을 제공합니다. 빈 행·오류를 보존하고 처음200행 미리보기와 전체 결과 복사·CSV를 구분합니다. 일괄 원문은 공유 URL이나 최근 기록에 추가하지 않습니다.'

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  keywords: '단위변환기, 단위 변환, 길이변환, 무게변환, 온도변환, 인치 센치, 파운드 kg, 평 제곱미터, 고기 한근, 금 한돈, 연비 환산, 컵 ml, KiB, px rem, unit converter',
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    type: 'website',
    siteName: '툴허브',
    url: 'https://toolhub.ai.kr/unit-converter/',
    locale: 'ko_KR',
    images: [{ url: 'https://toolhub.ai.kr/og/unit-converter.png', width: 1200, height: 630, alt: '단위 변환기' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: TITLE,
    description: DESCRIPTION,
    images: ['https://toolhub.ai.kr/og/unit-converter.png'],
  },
  alternates: {
    canonical: 'https://toolhub.ai.kr/unit-converter/',
  },
}

export default function UnitConverterPage() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: '단위 변환기',
    description: DESCRIPTION,
    url: 'https://toolhub.ai.kr/unit-converter/',
    applicationCategory: 'UtilityApplication',
    operatingSystem: 'Any',
    browserRequirements: 'JavaScript',
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'KRW' },
    featureList: ['14개 분야 단위 동시 환산', '평·근·돈·자 전통 단위', 'KB/KiB 구분', '연비 km/L·L/100km·mpg', '한국/미국 계량컵', '단위 검색', '유효숫자 조절·지수 표기', '단일 값 링크 공유', '변환 쌍 이름 저장·수동 불러오기', '현재 숫자를 보존한 정밀도·rem 기준 복원', '최대1,000행 명시 변환', '빈 행·오류 보존', '200행 미리보기와 전체 TSV·CSV']
  }

  const faq = unitMessages.unitConverter.guide.faq.items

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <I18nWrapper>
        <UnitConverter />
        <ToolFaq items={faq} />
        <div className="mt-8">

          <RelatedTools />

        </div>

      </I18nWrapper>

      {/* SEO 콘텐츠 */}
      <section className="max-w-4xl mx-auto px-4 pb-12">
        <div className="mt-12 border-t border-line pt-8">
          <h2 className="text-xl font-bold text-fg mb-4">
            단위 변환기란?
          </h2>
          <p className="text-body leading-relaxed mb-6">
            단위 변환기는 길이, 무게, 온도, 면적, 부피, 속도, 데이터, 압력, 에너지, CSS 단위 등 다양한 측정 단위를 즉시 변환해 주는 도구입니다. 미터·킬로미터·마일·인치 간 길이 변환, 섭씨·화씨·켈빈 온도 변환, 평·제곱미터 면적 변환, 고기 근·금 돈 같은 전통 단위, 연비(km/L·L/100km·mpg), 요리 계량(한국 1컵 200mL·미국 1컵 236.6mL), 그리고 웹 개발자를 위한 px·rem·em 변환을 지원합니다. 값 하나를 입력하면 같은 분야의 모든 단위 환산값이 한 번에 표시되고, 인치·파운드 등은 국제 정의값(1인치 = 2.54cm 정확)으로 계산합니다.
          </p>
          <h3 className="text-lg font-semibold text-fg mb-3">
            단위 변환기 활용 팁
          </h3>
          <ul className="list-disc list-inside space-y-2 text-body">
            <li><strong>여러 값 변환:</strong> 같은 단위 조합으로 한 줄에 숫자 하나를 입력하고 변환하세요. 최대1,000개 물리 행·50,000 UTF-16단위이며 빈 행과 오류를 보존합니다. 화면은200행까지 미리 보지만 전체 TSV·CSV는 실행 결과 전체를 사용합니다.</li>
            <li><strong>이전 결과 확인:</strong> 실행 뒤 원문이나 단위를 바꾸면 이전 결과 표시를 확인하고 다시 변환하세요. 일괄 원문은 기존 단일 값 URL·즐겨찾기·최근 기록과 별도로 처리합니다.</li>
            <li><strong>부동산 평수 계산:</strong> 1평은 약 3.306㎡입니다. 아파트 분양 광고의 평수를 제곱미터로 변환하거나 등기부등본의 ㎡ 면적을 평으로 환산할 때 활용하세요.</li>
            <li><strong>해외 레시피 단위:</strong> 미국 레시피의 1컵은 약 236.6mL로 한국 계량컵(200mL)보다 큽니다. 요리 탭에서 컵·큰술·작은술을 mL로 바로 비교하세요.</li>
            <li><strong>데이터 용량:</strong> 1TB 저장장치가 Windows에서 약 931GB로 보이는 건 1000 단위(TB)와 1024 단위(TiB) 차이 때문입니다.</li>
            <li><strong>CSS px↔rem 변환:</strong> 기본 폰트 사이즈(16px) 기준으로 픽셀과 rem을 변환하여 반응형 웹 개발 시 일관된 타이포그래피를 설계할 수 있습니다.</li>
            <li><strong>속도 단위 변환:</strong> km/h, mph, m/s, knots 간 변환으로 자동차 속도 표지판 이해, 항공·해양 속도 계산에 활용합니다.</li>
          </ul>
        </div>
      </section>
    </>
  )
}
