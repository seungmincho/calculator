import { Metadata } from 'next'
import HealthCheckup from '@/components/HealthCheckup'
import I18nWrapper from '@/components/I18nWrapper'
import RelatedTools from '@/components/RelatedTools'

export const metadata: Metadata = {
  title: '건강검진 대상 조회 - 짝수년생·암검진 나이 확인 | 툴허브',
  description: '2026년 국가건강검진 대상인지 출생연도로 바로 확인하세요. 짝수년생·홀수년생 규칙, 비사무직 매년 검진, 위암·대장암·유방암·자궁경부암·간암·폐암 검진 나이와 본인부담, 56세 C형간염·폐기능 검사, 12월 31일 마감 D-day까지.',
  keywords: '건강검진 대상 조회, 건강검진 대상자 조회, 짝수년생 건강검진, 2026 건강검진 대상, 국가 암검진 나이, 건강검진 12월 마감, 국가건강검진, 생애전환기 건강검진, 건강검진 나이 계산, 대장암 검진 나이, 폐기능 검사 56세',
  openGraph: {
    title: '건강검진 대상 조회 2026 | 툴허브',
    description: '출생연도만 고르면 올해 국가건강검진·암검진 대상과 받을 검사를 바로 확인.',
    url: 'https://toolhub.ai.kr/health-checkup/',
    siteName: '툴허브', locale: 'ko_KR', type: 'website',
    images: [{ url: 'https://toolhub.ai.kr/og/health-checkup.png', width: 1200, height: 630, alt: '건강검진 대상 조회 2026' }],
  },
  twitter: { card: 'summary_large_image', title: '건강검진 대상 조회 2026 | 툴허브', description: '짝수년생·암검진 나이·12월 마감까지 한 번에', images: ['https://toolhub.ai.kr/og/health-checkup.png'] },
  alternates: { canonical: 'https://toolhub.ai.kr/health-checkup/' },
}

// 컴포넌트 가이드 FAQ(messages healthCheckup.guide.faq)와 같은 내용 — 화면에 보이는 FAQ만 구조화 데이터로
const faqs = [
  { q: "2026년 건강검진 대상은 누구인가요?", a: "2026년은 짝수 해라서 1976년생·1986년생처럼 출생연도가 짝수인 사람이 일반건강검진 대상이에요. 지역가입자 세대원과 피부양자는 20세 이상(2006년생까지)이고, 직장가입자 중 비사무직은 출생연도와 관계없이 매년 대상입니다. 정확한 대상 여부는 국민건강보험공단 누리집이나 앱에서 조회하세요." },
  { q: "건강검진 나이는 만 나이로 계산하나요?", a: "아니요. 생일과 상관없이 '검진 연도 − 출생연도'로 셉니다. 예를 들어 2026년의 56세는 1970년생이고, 그해 안에 56세 항목(C형간염 항체검사·폐기능 검사)을 받습니다." },
  { q: "국가 암검진은 몇 살부터 받나요?", a: "위암은 40세 이상 2년마다(위내시경), 대장암은 50세 이상 매년(분변잠혈검사), 유방암은 40세 이상 여성 2년마다, 자궁경부암은 20세 이상 여성 2년마다, 간암은 40세 이상 고위험군 6개월마다, 폐암은 54~74세 중 30갑년 이상 현재 흡연자 2년마다입니다." },
  { q: "건강검진 비용은 얼마인가요?", a: "일반건강검진은 공단이 전액 부담해 무료예요. 암검진은 검사비의 10%를 내지만 대장암·자궁경부암은 무료이고, 건강보험료 하위 50%와 의료급여수급권자는 모든 암검진이 무료입니다." },
  { q: "12월 31일까지 못 받으면 어떻게 되나요?", a: "그해 검진 기간은 끝나지만, 다음 해에 공단 누리집의 '전년도 미수검자 추가신청'으로 대상자에 추가 등록해 받을 수 있어요. 직장가입자는 회사가 검진을 받게 할 의무가 있어, 받게 하지 않으면 사업주에게 과태료가 부과될 수 있습니다." },
  { q: "회사에서 받는 건강검진과 국가건강검진은 다른가요?", a: "직장가입자의 일반건강검진은 국가건강검진이면서 근로자 일반건강진단으로도 인정돼요. 사무직은 2년에 1회, 비사무직은 매년 받습니다. 회사가 지원하는 종합검진에 국가검진 항목이 포함됐는지는 검진기관에 확인하세요." },
  { q: "2026년에 새로 생긴 검사가 있나요?", a: "2026년부터 56세와 66세는 폐기능 검사를 받아요(만성폐쇄성폐질환 조기 발견). 2025년부터는 56세 C형간염 항체검사, 20~34세 정신건강검사 2년 주기(우울증·조기정신증), 여성 60세 골밀도 검사가 추가됐습니다." },
  { q: "대장내시경도 국가검진으로 받을 수 있나요?", a: "지금은 50세 이상이 매년 분변잠혈검사를 받고, 양성이 나오면 대장내시경을 받습니다(무료). 정부가 2028년을 목표로 45~74세 10년 주기 대장내시경 도입을 추진하고 있지만 아직 확정되지 않았어요." },
]

export default function HealthCheckupPage() {
  const jsonLd = {
    '@context': 'https://schema.org', '@type': 'WebApplication',
    name: '건강검진 대상 조회',
    description: '출생연도·성별·가입 유형으로 2026년 국가건강검진, 나이별 추가 검사, 국가 암검진 대상과 본인부담을 확인하는 도구.',
    url: 'https://toolhub.ai.kr/health-checkup/',
    applicationCategory: 'HealthApplication', operatingSystem: 'Any', browserRequirements: 'JavaScript',
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'KRW' },
    featureList: ['짝수년생·홀수년생 대상 판정', '직장 사무직·비사무직·지역·피부양자·의료급여', '나이별 추가 검사(생애전환기)', '국가 암검진 6종 대상과 본인부담', '12월 31일 마감 D-day', '다음 검진 연도', '부모님 출생연도 빠른 확인', '결과 카드 공유'],
  }
  const faqJsonLd = {
    '@context': 'https://schema.org', '@type': 'FAQPage',
    mainEntity: faqs.map((f) => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })),
  }

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />
      <div className="min-h-screen py-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <I18nWrapper>
            <HealthCheckup />
            <div className="mt-8">
              <RelatedTools />
            </div>
          </I18nWrapper>
        </div>
      </div>
      <section className="max-w-4xl mx-auto px-4 pb-12">
        <div className="mt-12 border-t border-line pt-8">
          <h2 className="text-xl font-bold text-fg mb-4">국가건강검진 대상, 이렇게 정해져요</h2>
          <p className="text-body leading-relaxed mb-6">
            국가 일반건강검진은 2년에 한 번 받으며, 출생연도가 짝수인 사람은 짝수 해, 홀수인 사람은 홀수 해가 차례입니다. 직장가입자 중 비사무직은 매년 받고, 지역가입자 세대원과 피부양자는 20세부터 대상이에요. 검진 나이는 생일과 관계없이 &lsquo;검진 연도 − 출생연도&rsquo;로 셉니다. 검진 기간은 1월 1일부터 12월 31일까지이고, 일반건강검진은 무료, 암검진은 검사비의 10%(대장암·자궁경부암, 보험료 하위 50%, 의료급여는 무료)를 냅니다.
          </p>
          <h3 className="text-lg font-semibold text-fg mb-3">2026년 출생연도별 예시</h3>
          <ul className="list-disc list-inside space-y-2 text-body">
            <li><strong>1986년생(40세):</strong> 일반건강검진 + 이상지질혈증·B형간염·생활습관평가·치면세균막 검사, 위암 검진(여성은 유방암·자궁경부암 포함).</li>
            <li><strong>1976년생(50세):</strong> 일반건강검진 + 생활습관평가, 위암·대장암 검진(여성은 유방암·자궁경부암 포함).</li>
            <li><strong>1970년생(56세):</strong> C형간염 항체검사·폐기능 검사가 추가되고, 30갑년 이상 현재 흡연자는 폐암 저선량 CT도 대상입니다.</li>
            <li><strong>1960년생(66세):</strong> 폐기능·인지기능·노인신체기능 검사(여성은 골밀도 포함)가 추가됩니다.</li>
            <li><strong>1977년생(49세):</strong> 홀수년생이라 2026년엔 대상이 아니고 2027년이 차례예요. 비사무직 직장인이라면 올해도 받습니다.</li>
          </ul>
          <p className="text-sm text-muted mt-6">
            이 페이지는 공개된 기준(건강검진 실시기준·암검진 실시기준, 2026년 10월 확인)으로 계산한 참고용 안내입니다. 최종 대상 여부는 국민건강보험공단 대상 조회(☎1577-1000)로 확인하고, 건강 상태에 대한 판단은 의사와 상담하세요.
          </p>
        </div>
      </section>
    </>
  )
}
