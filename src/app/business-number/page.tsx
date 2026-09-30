import { Metadata } from 'next'
import BusinessNumber from '@/components/BusinessNumber'
import I18nWrapper from '@/components/I18nWrapper'
import RelatedTools from '@/components/RelatedTools'

export const metadata: Metadata = {
  title: '사업자등록번호 검증기 - 유효성 확인, 형식 검증 | 툴허브',
  description: '사업자등록번호 10자리를 입력하는 즉시 국세청 검증번호 알고리즘으로 유효성을 확인하고, 개인·법인 구분 해석, 여러 번호 일괄 검증과 CSV 저장, 휴·폐업 상태조회까지 한 번에 처리하세요.',
  keywords: '사업자등록번호 검증, 사업자번호 확인, 사업자등록번호 유효성, 사업자번호 조회, 휴폐업 조회, 사업자번호 일괄 검증, business number validator, 사업자번호 검증기',
  openGraph: { title: '사업자등록번호 검증기 | 툴허브', description: '사업자등록번호 유효성 검증', url: 'https://toolhub.ai.kr/business-number', siteName: '툴허브', locale: 'ko_KR', type: 'website', images: [{ url: 'https://toolhub.ai.kr/og/business-number.png', width: 1200, height: 630, alt: '사업자등록번호 검증기' }] },
  twitter: { card: 'summary_large_image', title: '사업자등록번호 검증기 | 툴허브', description: '사업자등록번호 유효성 검증', images: ['https://toolhub.ai.kr/og/business-number.png'] },
  alternates: { canonical: 'https://toolhub.ai.kr/business-number/' },
}

export default function BusinessNumberPage() {
  const jsonLd = { '@context': 'https://schema.org', '@type': 'WebApplication', name: '사업자등록번호 검증기', description: '사업자등록번호 유효성 검증', url: 'https://toolhub.ai.kr/business-number', applicationCategory: 'UtilityApplication', operatingSystem: 'Any', browserRequirements: 'JavaScript', offers: { '@type': 'Offer', price: '0', priceCurrency: 'KRW' }, featureList: ['입력 즉시 검증번호 확인', '개인/법인 구분코드 해석', '일괄 검증 및 CSV 내보내기', '휴·폐업 상태조회', '검증 이력'] }
  const faqJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
      {
        '@type': 'Question',
        name: '사업자등록번호 구조는 어떻게 되나요?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: '사업자등록번호는 10자리 숫자로 구성됩니다: XXX-XX-XXXXX. 앞 3자리는 세무서 코드(지방청코드 + 세무서 코드), 다음 2자리는 구분코드(01~79 개인 과세, 90~99 개인 면세, 80 아파트관리사무소·다단계판매원 등, 81·86·87·88 영리법인 본점, 85 영리법인 지점, 82 비영리법인, 83 국가·지자체, 84 외국법인, 89 법인 아닌 종교단체), 마지막 5자리 중 4자리는 일련번호, 1자리는 검증번호입니다. 검증번호는 앞 9자리에 가중치(1,3,7,1,3,7,1,3,5)를 곱해 더하고 9번째 자리×5÷10의 몫을 더한 합의 일의 자리를 10에서 뺀 값입니다.',
        },
      },
      {
        '@type': 'Question',
        name: '사업자등록번호 진위 확인 방법은?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: '① 국세청 홈택스: \'사업자등록번호 조회\' 서비스에서 실시간 진위 확인 가능 ② 공정거래위원회: 통신판매업 등록 여부 조회 ③ 이 도구: 검증 알고리즘으로 번호 형식의 유효성을 즉시 확인하고, 국세청 상태조회 서비스(공공데이터포털)로 계속·휴업·폐업 여부를 조회합니다. 상태조회가 안 될 때는 홈택스에서 직접 확인하세요. 온라인 거래 시 사업자번호를 확인하는 것은 사기 방지에 중요합니다.',
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
          <I18nWrapper>
            <BusinessNumber />
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
              사업자등록번호 검증기란?
            </h2>
            <p className="text-body leading-relaxed mb-6">
              사업자등록번호 검증기는 <strong>10자리 사업자등록번호의 유효성을 체크섬 알고리즘으로 즉시 확인</strong>하는 도구입니다. 온라인 거래, 계약서 작성, 세금계산서 발행 전 상대방 사업자번호가 올바른 형식인지 빠르게 검증할 수 있습니다. 프리랜서, 소상공인, 구매 담당자 등 사업자 정보를 자주 다루는 분에게 유용합니다.
            </p>
            <h3 className="text-lg font-semibold text-fg mb-3">
              사업자등록번호 관련 활용 팁
            </h3>
            <ul className="list-disc list-inside space-y-2 text-body">
              <li><strong>형식 확인:</strong> 사업자등록번호는 XXX-XX-XXXXX 형식의 10자리 숫자로 구성됩니다.</li>
              <li><strong>진위 확인:</strong> 검증번호가 맞아도 실제 등록된 번호라는 뜻은 아닙니다. 상태조회로 계속·휴업·폐업 여부를 꼭 확인하세요.</li>
              <li><strong>개인/법인 구분:</strong> 4~5번째 두 자리가 01~79면 개인 과세사업자, 90~99면 개인 면세사업자, 81·86·87·88은 영리법인 본점, 85는 영리법인 지점입니다.</li>
              <li><strong>세금계산서 발행:</strong> 공급받는자 사업자번호를 검증 후 세금계산서를 발행하면 오류를 예방합니다.</li>
              <li><strong>사기 예방:</strong> 온라인 거래 시 상대방 사업자번호 검증은 필수적인 안전 수칙입니다.</li>
            </ul>
          </div>
        </section>
    </>
  )
}
