import { Metadata } from 'next'
import ResidentNumber from '@/components/ResidentNumber'
import I18nWrapper from '@/components/I18nWrapper'
import RelatedTools from '@/components/RelatedTools'
import ToolFaq from '@/components/ToolFaq'

export const metadata: Metadata = {
  title: '주민등록번호 검증기 - 유효성 검사, 생년월일 추출 | 툴허브',
  description: '주민등록번호 검증기 - 주민등록번호·외국인등록번호의 형식과 체크섬을 검사하고 생년월일, 만 나이, 성별, 내/외국인을 추출합니다. 2020년 10월 개편 번호 대응, 입력값은 전송·저장되지 않습니다.',
  keywords: '주민등록번호 검증, 주민번호 확인, 주민등록번호 유효성, resident number validator, 주민번호 검증기',
  openGraph: { title: '주민등록번호 검증기 | 툴허브', description: '주민등록번호 유효성 검사 및 정보 추출', url: 'https://toolhub.ai.kr/resident-number', siteName: '툴허브', locale: 'ko_KR', type: 'website', images: [{ url: 'https://toolhub.ai.kr/og/resident-number.png', width: 1200, height: 630, alt: '주민등록번호 검증기' }] },
  twitter: { card: 'summary_large_image', title: '주민등록번호 검증기 | 툴허브', description: '주민등록번호 유효성 검사 및 정보 추출', images: ['https://toolhub.ai.kr/og/resident-number.png'] },
  alternates: { canonical: 'https://toolhub.ai.kr/resident-number/' },
}

export default function ResidentNumberPage() {
  const jsonLd = { '@context': 'https://schema.org', '@type': 'WebApplication', name: '주민등록번호 검증기', description: '주민등록번호 유효성 검사 및 정보 추출', url: 'https://toolhub.ai.kr/resident-number/', applicationCategory: 'UtilityApplication', operatingSystem: 'Any', browserRequirements: 'JavaScript', offers: { '@type': 'Offer', price: '0', priceCurrency: 'KRW' }, featureList: ['주민번호 검증', '생년월일 추출', '만 나이·성별 확인', '외국인등록번호 검증', '2020년 개편 번호 대응'] }
  const faq = [
    { q: '주민등록번호 뒷자리 첫째 숫자의 의미는?', a: '주민등록번호 뒷자리 첫 숫자는 성별과 출생 세기를 나타냅니다. 1: 1900년대 남성, 2: 1900년대 여성, 3: 2000년대 남성, 4: 2000년대 여성입니다. 외국인은 5(1900년대 남), 6(1900년대 여), 7(2000년대 남), 8(2000년대 여)을 사용합니다. 9·0은 1800년대 출생자입니다. 2020년 10월 이전 번호는 이어지는 자리가 지역코드·일련번호·검증번호였지만, 이후 새로 부여되거나 변경된 번호는 나머지 6자리가 임의번호입니다.' },
    { q: '주민등록번호 유효성 검증 원리는?', a: '주민등록번호 13자리 중 마지막 1자리가 검증번호입니다. 앞 12자리에 가중치(2,3,4,5,6,7,8,9,2,3,4,5)를 곱한 합계를 11로 나눈 나머지를 11에서 뺀 값의 일의 자리가 검증번호와 일치해야 유효합니다. 단, 2020년 10월 부여체계 개편 이후 신규·변경 발급된 번호는 뒷자리가 임의번호라 이 공식이 적용되지 않으므로, 체크섬이 맞지 않아도 정상 번호일 수 있습니다.' },
    { q: '주민등록번호 수집 제한은 어떻게 되나요?', a: '2014년 8월 개정 「개인정보 보호법」(제24조의2) 시행 이후, 법령에 구체적인 근거가 없으면 주민등록번호를 수집·처리할 수 없습니다. 온라인에서는 본인확인기관(NICE, KCB 등)을 통한 본인인증으로 대체합니다. 주민번호 유출로 생명·신체·재산 피해를 입거나 입을 우려가 있으면 주민센터에서 번호 변경을 신청할 수 있고(주민등록번호변경위원회 심사), 유출 자체는 개인정보보호위원회에 신고할 수 있습니다. 이 도구는 형식 검증만 수행하며 번호를 저장하지 않습니다.' },
  ]
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <div className="min-h-screen py-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <I18nWrapper>
            <ResidentNumber />
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
            주민등록번호 검증기란?
          </h2>
          <p className="text-body leading-relaxed mb-6">
            주민등록번호 검증기는 입력한 번호의 체계적인 유효성을 검사하고, 생년월일·성별·출생 세기 등의 기본 정보를 추출해 주는 온라인 도구입니다. 웹 개발 시 폼 유효성 검증 로직 테스트, 데이터베이스 정제, 개인정보 처리 시스템 개발에 활용되며, 모든 처리는 브라우저 내에서만 이루어져 번호가 외부로 전송되지 않습니다.
          </p>
          <h3 className="text-lg font-semibold text-fg mb-3">
            주민등록번호 검증기 활용 팁
          </h3>
          <ul className="list-disc list-inside space-y-2 text-body">
            <li><strong>개발 테스트용 활용:</strong> 자체 검증 로직이 개편 전·후 번호를 올바르게 처리하는지 비교할 때 참고하세요. 이 도구는 번호를 생성하지 않으며, 거짓 주민등록번호를 만드는 프로그램을 전달·유포하는 행위는 주민등록법 제37조로 처벌됩니다.</li>
            <li><strong>검증 알고리즘 이해:</strong> 검증번호 계산 원리(가중치 곱의 합계 mod 11)는 2020년 10월 이전 발급 번호에만 적용됩니다. 자체 검증 코드에서 체크섬 불일치를 곧바로 오류 처리하면 개편 후 발급된 정상 번호를 거부하게 되니 주의하세요.</li>
            <li><strong>성별 및 연령 정보 추출:</strong> 뒷자리 첫 번째 숫자로 성별과 출생 세기를 파악해 사용자 정보를 자동으로 채울 수 있는 폼 자동완성 기능 구현에 참고하세요.</li>
            <li><strong>개인정보 보호 주의:</strong> 이 도구는 형식 검증만 수행하며 번호를 저장하지 않습니다. 실제 타인의 주민등록번호를 무단으로 사용하는 것은 법으로 금지되어 있습니다.</li>
          </ul>
        </div>
      </section>
    </>
  )
}
