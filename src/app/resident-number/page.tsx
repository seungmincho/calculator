import { Metadata } from 'next'
import { Suspense } from 'react'
import ResidentNumber from '@/components/ResidentNumber'
import I18nWrapper from '@/components/I18nWrapper'

export const metadata: Metadata = {
  title: '주민등록번호 검증기 - 유효성 검사, 생년월일 추출 | 툴허브',
  description: '주민등록번호 검증기 - 주민등록번호의 유효성을 검사하고 생년월일, 성별, 지역 정보를 추출합니다. 개인정보 보호 처리.',
  keywords: '주민등록번호 검증, 주민번호 확인, 주민등록번호 유효성, resident number validator, 주민번호 검증기',
  openGraph: { title: '주민등록번호 검증기 | 툴허브', description: '주민등록번호 유효성 검사 및 정보 추출', url: 'https://toolhub.ai.kr/resident-number', siteName: '툴허브', locale: 'ko_KR', type: 'website' },
  twitter: { card: 'summary_large_image', title: '주민등록번호 검증기 | 툴허브', description: '주민등록번호 유효성 검사 및 정보 추출' },
  alternates: { canonical: 'https://toolhub.ai.kr/resident-number/' },
}

export default function ResidentNumberPage() {
  const jsonLd = { '@context': 'https://schema.org', '@type': 'WebApplication', name: '주민등록번호 검증기', description: '주민등록번호 유효성 검사 및 정보 추출', url: 'https://toolhub.ai.kr/resident-number', applicationCategory: 'UtilityApplication', operatingSystem: 'Any', browserRequirements: 'JavaScript', offers: { '@type': 'Offer', price: '0', priceCurrency: 'KRW' }, featureList: ['주민번호 검증', '생년월일 추출', '성별 확인', '지역 정보'] }
  const faqJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
      { '@type': 'Question', name: '주민등록번호 뒷자리 첫째 숫자의 의미는?', acceptedAnswer: { '@type': 'Answer', text: '주민등록번호 뒷자리 첫 숫자는 성별과 출생 세기를 나타냅니다. 1: 1900년대 남성, 2: 1900년대 여성, 3: 2000년대 남성, 4: 2000년대 여성입니다. 외국인은 5(1900년대 남), 6(1900년대 여), 7(2000년대 남), 8(2000년대 여)을 사용합니다. 뒷자리 나머지 숫자는 출생신고 지역코드와 검증번호입니다.' } },
      { '@type': 'Question', name: '주민등록번호 유효성 검증 원리는?', acceptedAnswer: { '@type': 'Answer', text: '주민등록번호 13자리 중 마지막 1자리가 검증번호입니다. 앞 12자리에 가중치(2,3,4,5,6,7,8,9,2,3,4,5)를 곱한 합계를 11로 나눈 나머지를 11에서 뺀 값의 일의 자리가 검증번호와 일치해야 유효합니다. 이 알고리즘으로 단순 입력 오류를 감지할 수 있습니다.' } },
      { '@type': 'Question', name: '주민등록번호 수집 제한은 어떻게 되나요?', acceptedAnswer: { '@type': 'Answer', text: '2014년 주민등록법 개정 이후, 법률에 근거 없이 주민등록번호를 수집하는 것이 금지되었습니다. 온라인에서는 본인확인기관(NICE, KCB 등)을 통한 본인인증으로 대체합니다. 주민번호 유출 시 주민센터에서 변경 신청이 가능하며, 개인정보보호위원회에 신고할 수 있습니다. 이 도구는 형식 검증만 수행하며 번호를 저장하지 않습니다.' } },
    ],
  }
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 py-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <Suspense fallback={<div className="text-center text-gray-900 dark:text-white">Loading...</div>}><I18nWrapper><ResidentNumber /></I18nWrapper></Suspense>
        </div>
      </div>
      {/* SEO 콘텐츠 */}
      <section className="max-w-4xl mx-auto px-4 pb-12">
        <div className="mt-12 border-t border-gray-200 dark:border-gray-700 pt-8">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
            주민등록번호 검증기란?
          </h2>
          <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-6">
            주민등록번호 검증기는 입력한 번호의 체계적인 유효성을 검사하고, 생년월일·성별·출생 세기 등의 기본 정보를 추출해 주는 온라인 도구입니다. 웹 개발 시 폼 유효성 검증 로직 테스트, 데이터베이스 정제, 개인정보 처리 시스템 개발에 활용되며, 모든 처리는 브라우저 내에서만 이루어져 번호가 외부로 전송되지 않습니다.
          </p>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
            주민등록번호 검증기 활용 팁
          </h3>
          <ul className="list-disc list-inside space-y-2 text-gray-700 dark:text-gray-300">
            <li><strong>개발 테스트용 활용:</strong> 실제 주민등록번호 대신 유효한 형식의 테스트용 번호를 생성·검증하면 개인정보 침해 없이 시스템을 개발하고 테스트할 수 있습니다.</li>
            <li><strong>검증 알고리즘 이해:</strong> 검증번호 계산 원리(가중치 곱의 합계 mod 11)를 이해하면 자체 유효성 검사 코드를 직접 구현하는 데 도움이 됩니다.</li>
            <li><strong>성별 및 연령 정보 추출:</strong> 뒷자리 첫 번째 숫자로 성별과 출생 세기를 파악해 사용자 정보를 자동으로 채울 수 있는 폼 자동완성 기능 구현에 참고하세요.</li>
            <li><strong>개인정보 보호 주의:</strong> 이 도구는 형식 검증만 수행하며 번호를 저장하지 않습니다. 실제 타인의 주민등록번호를 무단으로 사용하는 것은 법으로 금지되어 있습니다.</li>
          </ul>
        </div>
      </section>
    </>
  )
}
