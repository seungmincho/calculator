import { Metadata } from 'next'
import EmploymentContract from '@/components/EmploymentContract'
import I18nWrapper from '@/components/I18nWrapper'
import RelatedTools from '@/components/RelatedTools'

export const metadata: Metadata = {
  title: '근로계약서 양식 작성기 - 표준근로계약서 무료 PDF | 툴허브',
  description: '고용노동부 표준근로계약서 양식(정규직·계약직·아르바이트·18세 미만)을 빈칸만 채워 완성하세요. 2026 최저임금 10,320원·휴게시간·주 52시간 자동 검사, 주휴수당 계산, 친권자 동의서, 도장, A4 PDF·인쇄 무료.',
  keywords: '근로계약서, 근로계약서 양식, 표준근로계약서, 알바 근로계약서, 아르바이트 근로계약서, 단시간 근로계약서, 계약직 근로계약서, 연소근로자 근로계약서, 친권자 동의서, 근로계약서 작성법, 근로계약서 미작성 벌금',
  openGraph: {
    title: '근로계약서 양식 작성기 | 툴허브',
    description: '빈칸만 채우면 완성되는 표준근로계약서. 최저임금·휴게·근로시간 자동 검사, 주휴수당 계산, PDF 출력.',
    url: 'https://toolhub.ai.kr/employment-contract',
    siteName: '툴허브',
    locale: 'ko_KR',
    type: 'website',
    images: [{ url: 'https://toolhub.ai.kr/og/employment-contract.png', width: 1200, height: 630, alt: '근로계약서 양식 작성기' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: '근로계약서 양식 작성기',
    description: '빈칸만 채우면 완성되는 표준근로계약서 PDF',
    images: ['https://toolhub.ai.kr/og/employment-contract.png'],
  },
  alternates: {
    canonical: 'https://toolhub.ai.kr/employment-contract/',
  },
}

// 컴포넌트 가이드 FAQ(messages employmentContract.guide.faq)와 같은 내용 — 화면에 보이는 FAQ만 구조화 데이터로
const faqs = [
  {
    q: '아르바이트도 근로계약서를 써야 하나요?',
    a: '네. 하루만 일하는 아르바이트, 수습, 가족이 아닌 직원 모두 근로계약서를 써서 근로자에게 줘야 합니다. 임금·소정근로시간·주휴일·연차를 서면으로 주지 않으면 근로기준법 제114조에 따라 500만원 이하 벌금 대상이고, 단시간 근로자는 기간제법에 따라 500만원 이하 과태료도 부과될 수 있습니다.',
  },
  {
    q: '근로계약서는 언제까지 써야 하나요?',
    a: '일을 시작하기 전, 근로계약을 체결할 때 써서 바로 한 부를 근로자에게 줘야 합니다. 며칠 일해 보고 쓰는 것은 그 기간 동안 위반입니다. 임금이나 근무시간이 바뀌면 바뀐 내용을 다시 서면으로 줘야 합니다.',
  },
  {
    q: '월급제인데 최저임금은 어떻게 확인하나요?',
    a: '월 기본급과 매월 정기적으로 주는 수당을 월 소정근로시간에 주휴시간을 더한 시간으로 나눕니다. 주 40시간이면 209시간이라 2026년 최저임금 월 환산액은 10,320원 × 209시간 = 2,156,880원입니다. 이 작성기는 입력한 근무시간으로 자동 계산합니다.',
  },
  {
    q: '주휴수당은 계약서에 따로 적어야 하나요?',
    a: '1주 소정근로시간이 15시간 이상이고 그 주를 개근하면 유급 주휴일이 생깁니다. 시급제는 주휴수당을 따로 계산해 주는 경우가 많아 금액을 적어 두면 분쟁을 줄일 수 있고, 월급제는 월급에 주휴수당이 포함되었다고 적는 것이 일반적입니다. 이 작성기는 근무시간으로 주휴시간을 계산해 자동으로 적습니다.',
  },
  {
    q: '5명 미만 사업장도 근로계약서를 써야 하나요?',
    a: '네. 근로계약서 작성·교부(제17조), 최저임금, 주휴일, 휴게시간은 5명 미만 사업장에도 적용됩니다. 연장·야간·휴일근로 가산수당, 연차유급휴가, 주 52시간 제한은 5명 미만에는 적용되지 않습니다.',
  },
  {
    q: '18세 미만 학생을 아르바이트로 쓸 때 필요한 서류는?',
    a: '연소근로자 표준근로계약서, 가족관계증명서, 친권자(후견인) 동의서를 갖춰야 합니다. 근로시간은 1일 7시간·1주 35시간이 원칙이고, 15세 미만이면 고용노동부의 취직인허증이 필요합니다. 이 작성기는 18세 미만 유형을 고르면 동의서를 두 번째 장으로 함께 만듭니다.',
  },
]

export default function EmploymentContractPage() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: '근로계약서 양식 작성기',
    description: '고용노동부 표준근로계약서 양식으로 근로계약서를 작성하고 A4 PDF로 저장·인쇄합니다. 최저임금·휴게시간·근로시간 자동 검사.',
    url: 'https://toolhub.ai.kr/employment-contract',
    applicationCategory: 'BusinessApplication',
    operatingSystem: 'Any',
    browserRequirements: 'JavaScript',
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'KRW' },
    featureList: [
      '표준근로계약서 4종 (정규직·계약직·단시간·연소근로자)',
      '2026년 최저임금 10,320원 위반 자동 검사 (월급 209시간 환산)',
      '주 15시간 이상 주휴수당 자동 계산·기재',
      '휴게시간·주 52시간·연장근로 검사',
      '18세 미만 1일 7시간·주 35시간 제한 검사 + 친권자 동의서',
      '요일별 근로시간표 (단시간 근로자)',
      '이름 도장 자동 생성·도장 이미지',
      'A4 PDF 저장·인쇄',
    ],
  }
  const faqJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map((f) => ({
      '@type': 'Question',
      name: f.q,
      acceptedAnswer: { '@type': 'Answer', text: f.a },
    })),
  }

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />
      <div className="min-h-screen py-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <I18nWrapper>
            <EmploymentContract />
            <div className="mt-8">
              <RelatedTools />
            </div>
          </I18nWrapper>
        </div>
      </div>
      {/* SEO 콘텐츠 */}
      <section className="max-w-4xl mx-auto px-4 pb-12">
        <div className="mt-12 border-t border-line pt-8">
          <h2 className="text-xl font-bold text-fg mb-4">근로계약서 작성기란?</h2>
          <p className="text-body leading-relaxed mb-6">
            근로계약서는 사람을 쓰는 모든 사업장이 일을 시작하기 전에 작성해 근로자에게 한 부를 줘야 하는 문서입니다. 이 작성기는 고용노동부
            표준근로계약서의 항목 순서(근로계약기간, 근무장소, 업무내용, 소정근로시간, 근무일·휴일, 임금, 연차유급휴가, 사회보험, 교부)를 그대로 따르고,
            입력하는 동안 2026년 최저임금 미달, 휴게시간 부족, 주 52시간 초과, 18세 미만 근로시간 초과를 바로 알려 줍니다. 입력한 내용은 내 브라우저에만 저장됩니다.
          </p>
          <h3 className="text-lg font-semibold text-fg mb-3">유형별로 다른 점</h3>
          <ul className="list-disc list-inside space-y-2 text-body">
            <li><strong>정규직:</strong> 기간의 정함이 없는 계약. 근로개시일만 적습니다.</li>
            <li><strong>계약직(기간제):</strong> 시작일과 종료일을 적고, 2년을 넘기면 무기계약으로 간주됩니다.</li>
            <li><strong>아르바이트(단시간):</strong> 근무 요일과 요일별 시업·종업·휴게시간을 표로 적어야 합니다. 주 15시간 이상이면 주휴수당·연차가 생깁니다.</li>
            <li><strong>18세 미만(연소근로자):</strong> 1일 7시간·주 35시간 제한, 가족관계증명서와 친권자 동의서를 갖춰야 합니다.</li>
          </ul>
        </div>
      </section>
    </>
  )
}
