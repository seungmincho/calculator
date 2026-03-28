import { Suspense } from 'react';
import { Metadata } from 'next';
import BogeumjariLoanCalculator from '@/components/BogeumjariLoanCalculator';

export const metadata: Metadata = {
  title: '보금자리론 계산기 - 생애최초·신혼부부·다자녀 금리 비교 | 툴허브',
  description: '2026년 최신 보금자리론 계산기. 생애최초 보금자리론(LTV 80%·4.2억·0.2%p 우대), 신혼부부(소득 8.5천만·0.3%p 우대), 다자녀(한도 4억) 유형별 금리·대출한도·월상환액 즉시 계산.',
  keywords: '생애최초보금자리론, 생애최초보금자리론금리, 생애최초보금자리론자격, 보금자리론계산기, 생애최초보금자리론계산기, 2026보금자리론, LH보금자리론, 신혼부부보금자리론, 다자녀보금자리론, 보금자리론금리, 보금자리론한도, 주택담보대출계산기, 보금자리론금리계산기',
  openGraph: {
    title: '보금자리론 계산기 2026 — 생애최초·신혼부부·다자녀 금리 즉시 계산',
    description: '생애최초 보금자리론 LTV 80%·4.2억, 신혼부부 0.3%p 우대, 다자녀 4억 — 내 조건에 맞는 보금자리론을 바로 계산하세요.',
    url: 'https://toolhub.ai.kr/bogeumjari-loan',
    siteName: '툴허브',
    locale: 'ko_KR',
    type: 'website',
    images: [{ url: 'https://toolhub.ai.kr/og-image-1200x630.png', width: 1200, height: 630, alt: '보금자리론 계산기 2026' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: '보금자리론 계산기 2026',
    description: '유형별(생애최초·신혼·다자녀·일반) 한도·금리 즉시 계산',
  },
  alternates: {
    canonical: 'https://toolhub.ai.kr/bogeumjari-loan/',
  },
};

export default function BogeumjariLoanPage() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: '보금자리론 계산기 2026',
    description: '2026년 보금자리론 대출한도·금리·월상환액 계산기 (생애최초/신혼부부/다자녀/일반)',
    url: 'https://toolhub.ai.kr/bogeumjari-loan',
    applicationCategory: 'FinanceApplication',
    operatingSystem: 'Any',
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'KRW' },
    featureList: [
      '2026년 최신 금리 반영 (4.05~4.35%)',
      '유형별 자동 계산 (생애최초·신혼·다자녀·일반)',
      '우대금리 자동 적용 및 내역 표시',
      '최대 대출한도 계산 (LTV 70~80%)',
      '월 상환액·총이자 계산',
      'DTI 자동 검증 (60% 기준)',
    ],
  };

  const howToJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'HowTo',
    name: '보금자리론 계산기 사용 방법',
    description: '주택 가격과 소득 조건을 입력해 보금자리론 대출 한도·금리·월 상환액을 계산하는 방법입니다.',
    step: [
      {
        '@type': 'HowToStep',
        name: '주택 가격과 대출 금액 입력',
        text: '구매할 주택의 매매가격과 희망 대출 금액을 입력합니다. 주택 가격은 6억원 이하여야 합니다.',
      },
      {
        '@type': 'HowToStep',
        name: '소득 요건 확인',
        text: '부부합산 연소득을 입력하여 일반(7천만원), 신혼부부(8.5천만원), 다자녀(9천만원) 중 해당 유형의 자격 요건을 확인합니다.',
      },
      {
        '@type': 'HowToStep',
        name: '금리 유형 선택',
        text: '고정금리 또는 5년 혼합금리(5년 고정 후 변동) 중 선택하고, 생애최초·신혼·다자녀 우대금리 적용 여부를 확인합니다.',
      },
      {
        '@type': 'HowToStep',
        name: '상환 기간 설정',
        text: '10년~50년 중 원하는 대출 상환 기간을 선택합니다. 기간이 길수록 금리가 소폭 높아집니다.',
      },
      {
        '@type': 'HowToStep',
        name: '월 상환금과 총 이자 확인',
        text: '최종 적용 금리, 월 상환금, 총 이자 합계, DTI 비율을 확인하고 상환 가능 여부를 판단합니다.',
      },
    ],
  };

  const faqJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
      {
        '@type': 'Question',
        name: '2026년 보금자리론 금리는 얼마인가요?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: '2026년 2월 기준 아낌e 보금자리론 기준금리는 10년 4.05% ~ 50년 4.35%입니다. 생애최초(0.2%p), 신혼부부(0.3%p), 다자녀(0.2%p), 저소득 추가(0.1%p) 등 최대 1.0%p 우대 적용 시 최저 2.90~3.35%까지 낮아집니다. 고정금리로 만기까지 동일하게 적용됩니다.',
        },
      },
      {
        '@type': 'Question',
        name: '보금자리론 자격조건은 어떻게 되나요?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: '무주택자(또는 1주택자 처분 조건), 부부합산 연소득 7천만원 이하(신혼부부 8.5천만, 다자녀 9천만), 6억원 이하 주택, 전용면적 85㎡ 이하, DTI 60% 이하가 기본 조건입니다. 생애최초 구입자는 LTV가 70%→80%로 확대되고 한도도 3.6억→4.2억으로 늘어납니다.',
        },
      },
      {
        '@type': 'Question',
        name: '보금자리론과 디딤돌대출 중 어떤 게 유리한가요?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: '디딤돌대출은 소득 6천만원 이하(신혼 8.5천만) 무주택자를 위한 상품으로 금리가 연 2.15~3.0%로 훨씬 낮지만 한도가 최대 2.5억으로 제한됩니다. 보금자리론은 소득 7천만원 이하에 한도가 최대 4.2억이지만 금리가 4%대입니다. 소득이 낮으면 디딤돌, 한도가 부족하면 보금자리론이 유리합니다.',
        },
      },
      {
        '@type': 'Question',
        name: '신혼부부 보금자리론 조건은 무엇인가요?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: '혼인 7년 이내이거나 3개월 내 결혼 예정인 부부가 대상입니다. 소득 기준이 부부합산 8.5천만원으로 일반(7천만)보다 완화되고, 금리 우대 0.3%p가 적용됩니다. 대출한도는 최대 3.6억(일반과 동일), LTV는 70%입니다.',
        },
      },
      {
        '@type': 'Question',
        name: '보금자리론 대출 기간은 최대 몇 년인가요?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: '보금자리론 대출 기간은 10년, 15년, 20년, 25년, 30년, 40년, 50년 중 선택할 수 있습니다. 기간이 길수록 금리가 소폭 높아집니다(10년 4.05% → 50년 4.35%). 40세 미만은 체증식 상환(초기 부담 낮은 방식)도 선택 가능합니다.',
        },
      },
      {
        '@type': 'Question',
        name: '생애최초 보금자리론 자격 조건은?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: '생애최초 보금자리론을 받으려면 본인과 배우자 모두 과거에 주택을 소유한 이력이 없어야 합니다(세대원 전원 무주택 이력 없음). 부부합산 연소득 7천만원 이하, 주택가격 6억원 이하, 전용면적 85㎡ 이하, DTI 60% 이하 조건도 동일하게 적용됩니다. 자격 충족 시 LTV가 70%→80%로 확대되고 대출한도도 3.6억→4.2억으로 늘어나며, 금리 우대 0.2%p도 추가 적용됩니다.',
        },
      },
      {
        '@type': 'Question',
        name: '생애최초 보금자리론 금리는 얼마인가요?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: '2026년 기준 생애최초 보금자리론 금리는 기준금리(30년 기준 4.25%)에서 생애최초 우대금리 0.2%p를 차감한 연 4.05% 수준입니다. 신혼부부 조건도 동시에 해당되면 0.3%p 우대가 추가되어 최저 연 3.75%까지 낮아질 수 있습니다. 저소득 청년 등 추가 우대항목 포함 시 최대 1.0%p까지 차감되어 3%대 금리도 가능합니다.',
        },
      },
      {
        '@type': 'Question',
        name: '생애최초 보금자리론 최대 한도는?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: '생애최초 보금자리론의 최대 대출 한도는 4억 2천만원입니다. 일반 유형(3.6억)보다 6천만원 더 높습니다. 실제 대출 가능 금액은 주택가격의 80%(LTV 80%) 이내에서 결정되며, DTI(총부채상환비율) 60% 기준도 함께 적용됩니다. 예를 들어 주택가격이 5억원이면 LTV 80% 적용 시 최대 4억원까지 가능합니다.',
        },
      },
    ],
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(howToJsonLd) }} />

      <Suspense fallback={
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
          <div className="max-w-6xl mx-auto p-8">
            <div className="animate-pulse space-y-8">
              <div className="h-16 bg-gray-200 dark:bg-gray-700 rounded-xl" />
              <div className="h-96 bg-gray-200 dark:bg-gray-700 rounded-xl" />
            </div>
          </div>
        </div>
      }>
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
          <BogeumjariLoanCalculator />
        </div>
      </Suspense>

      {/* ===== 2026년 종합 가이드 ===== */}
      <div className="bg-white dark:bg-gray-900">
        <div className="max-w-4xl mx-auto px-4 py-12 space-y-12">

          {/* 1. 핵심 수치 요약 */}
          <section>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6">
              2026년 보금자리론 핵심 수치
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: '기준금리 (2월)', value: '4.05~4.35%', sub: '우대 시 최저 2.90%', color: 'blue' },
                { label: '최대 대출한도', value: '4.2억원', sub: '생애최초 기준', color: 'green' },
                { label: '최대 LTV', value: '80%', sub: '생애최초 기준', color: 'purple' },
                { label: 'DTI 기준', value: '60% 이하', sub: '총부채상환비율', color: 'orange' },
              ].map((item) => (
                <div key={item.label} className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4 text-center">
                  <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">{item.label}</div>
                  <div className="text-lg font-bold text-gray-900 dark:text-white">{item.value}</div>
                  <div className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{item.sub}</div>
                </div>
              ))}
            </div>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-3">
              ※ 2026년 1월 0.25%p, 2월 0.15%p 추가 인상. 매월 주택금융공사 홈페이지에서 최신 금리 확인 필요.
            </p>
          </section>

          {/* 1-1. 생애최초 보금자리론 상세 */}
          <section>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
              생애최초 보금자리론이란?
            </h2>
            <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed mb-4">
              생애최초 보금자리론은 본인과 배우자 모두 과거에 주택을 소유한 적이 없는 경우에 적용되는 우대 유형입니다.
              일반 보금자리론 대비 LTV가 70%에서 <strong className="text-blue-700 dark:text-blue-300">80%로 확대</strong>되고 대출 한도도 3.6억에서 <strong className="text-blue-700 dark:text-blue-300">최대 4.2억원</strong>으로 늘어납니다.
              금리도 기준금리에서 <strong className="text-green-700 dark:text-green-300">0.2%p 추가 우대</strong>가 적용되어 실수요 1주택 취득자에게 가장 유리한 정책 모기지 중 하나입니다.
            </p>
            <div className="grid sm:grid-cols-3 gap-4 mb-4">
              {[
                { label: '최대 대출 한도', value: '4억 2천만원', sub: '일반(3.6억) 대비 +6천만원', color: 'blue' },
                { label: 'LTV (담보인정비율)', value: '80%', sub: '일반(70%) 대비 +10%p', color: 'green' },
                { label: '금리 우대', value: '0.2%p', sub: '기준금리에서 자동 차감', color: 'purple' },
              ].map((item) => (
                <div key={item.label} className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-4 text-center">
                  <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">{item.label}</div>
                  <div className="text-xl font-bold text-blue-700 dark:text-blue-300">{item.value}</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{item.sub}</div>
                </div>
              ))}
            </div>
            <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-5 space-y-2">
              <p className="text-sm font-semibold text-gray-900 dark:text-white mb-2">생애최초 보금자리론 자격 요건</p>
              {[
                '본인 및 배우자 모두 과거 주택 소유 이력 없음 (세대원 전원 미보유)',
                '부부합산 연소득 7천만원 이하',
                '구입 주택 가격 6억원 이하',
                '주택 전용면적 85㎡ 이하',
                'DTI(총부채상환비율) 60% 이하',
                '현재 무주택자 (또는 신규 주택 취득과 동시에 기존 주택 처분 조건)',
              ].map((req, i) => (
                <div key={i} className="flex items-start gap-2 text-sm text-gray-700 dark:text-gray-300">
                  <span className="flex-shrink-0 text-blue-500 font-bold mt-0.5">✓</span>
                  <span>{req}</span>
                </div>
              ))}
            </div>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-3">
              ※ &quot;생애최초&quot; 여부는 주택 소유 이력 기준이므로 현재 무주택자라도 과거에 주택을 소유했다면 해당되지 않습니다.
              부부 중 한 명이라도 과거 소유 이력이 있으면 일반 유형으로 신청해야 합니다.
            </p>
          </section>

          {/* 2. 유형별 비교표 */}
          <section>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
              유형별 한눈에 보기
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="bg-blue-600 text-white">
                    <th className="px-4 py-3 text-left rounded-tl-lg">구분</th>
                    <th className="px-4 py-3 text-center">소득기준</th>
                    <th className="px-4 py-3 text-center">최대한도</th>
                    <th className="px-4 py-3 text-center">LTV</th>
                    <th className="px-4 py-3 text-center rounded-tr-lg">금리 우대</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    { type: '일반', income: '7천만원 이하', limit: '3.6억원', ltv: '70%', discount: '없음', bg: false },
                    { type: '생애최초', income: '7천만원 이하', limit: '4.2억원', ltv: '80%', discount: '0.2%p', bg: true },
                    { type: '신혼부부', income: '8.5천만원 이하', limit: '3.6억원', ltv: '70%', discount: '0.3%p', bg: false },
                    { type: '다자녀 (2명+)', income: '9천만원 이하', limit: '4억원', ltv: '70%', discount: '0.2%p', bg: true },
                    { type: '다자녀 (3명+)', income: '1억원 이하', limit: '4억원', ltv: '70%', discount: '0.2%p', bg: false },
                  ].map((row) => (
                    <tr key={row.type} className={`border-b border-gray-100 dark:border-gray-700 ${row.bg ? 'bg-gray-50 dark:bg-gray-800/50' : 'bg-white dark:bg-gray-900'}`}>
                      <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">{row.type}</td>
                      <td className="px-4 py-3 text-center text-gray-700 dark:text-gray-300">{row.income}</td>
                      <td className="px-4 py-3 text-center font-semibold text-blue-700 dark:text-blue-300">{row.limit}</td>
                      <td className="px-4 py-3 text-center text-gray-700 dark:text-gray-300">{row.ltv}</td>
                      <td className="px-4 py-3 text-center text-green-700 dark:text-green-400 font-medium">{row.discount}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">
              ※ 주택가격 6억원 이하, 전용면적 85㎡ 이하 조건 공통 적용. 신혼부부는 혼인 7년 이내 또는 3개월 내 결혼 예정자.
            </p>
          </section>

          {/* 3. 2026년 금리표 */}
          <section>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
              2026년 2월 기준 금리표 (아낌e 보금자리론)
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300">
                    <th className="px-4 py-3 text-left">대출 기간</th>
                    <th className="px-4 py-3 text-center">기준금리</th>
                    <th className="px-4 py-3 text-center">신혼·생애최초 후</th>
                    <th className="px-4 py-3 text-center">최대우대 후 (1.0%p)</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    { period: '10년', base: '4.05%', mid: '3.75~3.85%', max: '3.05%' },
                    { period: '20년', base: '4.15%', mid: '3.85~3.95%', max: '3.15%' },
                    { period: '30년', base: '4.25%', mid: '3.95~4.05%', max: '3.25%' },
                    { period: '40년', base: '4.30%', mid: '4.00~4.10%', max: '3.30%' },
                    { period: '50년', base: '4.35%', mid: '4.05~4.15%', max: '3.35%' },
                  ].map((row, i) => (
                    <tr key={row.period} className={`border-b border-gray-100 dark:border-gray-700 ${i % 2 === 0 ? 'bg-white dark:bg-gray-900' : 'bg-gray-50 dark:bg-gray-800/50'}`}>
                      <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">{row.period}</td>
                      <td className="px-4 py-3 text-center text-gray-700 dark:text-gray-300">{row.base}</td>
                      <td className="px-4 py-3 text-center text-blue-700 dark:text-blue-300">{row.mid}</td>
                      <td className="px-4 py-3 text-center font-semibold text-green-700 dark:text-green-400">{row.max}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">
              ※ 고정금리 방식으로 만기까지 동일 금리 유지. 우대금리는 중복 적용 가능하며 최대 1.0%p 한도.
            </p>
          </section>

          {/* 4. 우대금리 체계 */}
          <section>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
              우대금리 체계 (최대 1.0%p 한도)
            </h2>
            <div className="grid sm:grid-cols-2 gap-3">
              {[
                { label: '신혼부부 우대', rate: '최대 0.3%p', desc: '혼인 7년 이내 또는 3개월 내 결혼 예정자', color: 'pink' },
                { label: '생애최초 우대', rate: '최대 0.2%p', desc: '생애 처음으로 주택을 구입하는 경우', color: 'blue' },
                { label: '다자녀 우대', rate: '최대 0.2%p', desc: '미성년 자녀 2명 이상 보유 가구', color: 'green' },
                { label: '저소득 청년 우대', rate: '최대 0.5%p', desc: '만 39세 이하, 소득 기준 70% 이하 등 요건 충족 시', color: 'purple' },
                { label: '사회적 배려층', rate: '최대 0.4%p', desc: '장애인, 국가유공자, 다문화가족, 한부모가족 등', color: 'orange' },
                { label: '전세사기 피해자', rate: '별도 우대', desc: '전세사기피해지원법 상 피해자 인정 시 별도 적용', color: 'red' },
              ].map((item) => (
                <div key={item.label} className="flex items-start gap-3 bg-gray-50 dark:bg-gray-800 rounded-xl p-4">
                  <div className="flex-shrink-0 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 font-bold text-xs px-2 py-1 rounded-lg min-w-[60px] text-center">
                    {item.rate}
                  </div>
                  <div>
                    <div className="font-medium text-sm text-gray-900 dark:text-white">{item.label}</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{item.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* 5. 디딤돌 vs 보금자리론 비교 */}
          <section>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
              디딤돌대출 vs 보금자리론 — 무엇을 선택할까?
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300">
                    <th className="px-4 py-3 text-left">구분</th>
                    <th className="px-4 py-3 text-center bg-green-50 dark:bg-green-900/20 text-green-800 dark:text-green-300">디딤돌대출</th>
                    <th className="px-4 py-3 text-center bg-blue-50 dark:bg-blue-900/20 text-blue-800 dark:text-blue-300">보금자리론</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    { label: '소득 기준', didim: '6천만원 이하\n(신혼 8.5천만)', bogeum: '7천만원 이하\n(신혼 8.5천만)' },
                    { label: '주택가격', didim: '5억원 이하', bogeum: '6억원 이하' },
                    { label: '대출 한도', didim: '최대 2.5억원', bogeum: '최대 4.2억원' },
                    { label: '금리 수준', didim: '2.15~3.0%', bogeum: '4.05~4.35%' },
                    { label: '금리 유형', didim: '고정/혼합', bogeum: '고정금리' },
                    { label: '추천 대상', didim: '소득 낮은 경우\n한도 2.5억 충분 시', bogeum: '한도 더 필요 시\n소득 6~7천만 구간' },
                  ].map((row, i) => (
                    <tr key={row.label} className={`border-b border-gray-100 dark:border-gray-700 ${i % 2 === 0 ? 'bg-white dark:bg-gray-900' : 'bg-gray-50 dark:bg-gray-800/50'}`}>
                      <td className="px-4 py-3 font-medium text-gray-700 dark:text-gray-300">{row.label}</td>
                      <td className="px-4 py-3 text-center text-gray-700 dark:text-gray-300 whitespace-pre-line">{row.didim}</td>
                      <td className="px-4 py-3 text-center text-gray-700 dark:text-gray-300 whitespace-pre-line">{row.bogeum}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="mt-4 bg-amber-50 dark:bg-amber-900/20 rounded-xl p-4 text-sm text-amber-800 dark:text-amber-300">
              💡 <strong>선택 가이드:</strong> 연소득 6천만원 이하라면 디딤돌대출(2%대 금리)을 먼저 검토하세요.
              디딤돌로 한도가 부족하거나 주택가격이 5억을 넘는다면 보금자리론이 대안입니다.
              두 상품 모두 신청 가능하면 금리가 낮은 디딤돌이 유리합니다.
            </div>
          </section>

          {/* 6. LH 신혼희망타운 전용 대출 */}
          <section>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
              LH 신혼희망타운 전용 주택담보대출
            </h2>
            <div className="bg-gradient-to-r from-rose-50 to-pink-50 dark:from-rose-900/20 dark:to-pink-900/20 rounded-xl p-6">
              <p className="text-sm text-gray-700 dark:text-gray-300 mb-4">
                LH가 공급하는 신혼희망타운(60㎡ 이하) 입주자에게는 일반 보금자리론보다 유리한 전용 모기지가 제공됩니다.
              </p>
              <div className="grid sm:grid-cols-2 gap-4 text-sm">
                {[
                  { label: '대상', value: 'LH 신혼희망타운 입주자 (60㎡ 이하)' },
                  { label: '한도', value: '최대 4억원 (주택가격 × LTV 30~70%)' },
                  { label: '기간', value: '20년 또는 30년 (1년 거치 가능)' },
                  { label: '금리', value: '정책금리 적용 (일반 보금자리론보다 우대)' },
                  { label: '상환방식', value: '원리금균등분할상환' },
                  { label: '특징', value: '고정금리 · LH 입주자 전용 혜택' },
                ].map((item) => (
                  <div key={item.label} className="flex gap-2">
                    <span className="font-medium text-gray-600 dark:text-gray-400 min-w-[56px]">{item.label}</span>
                    <span className="text-gray-800 dark:text-gray-200">{item.value}</span>
                  </div>
                ))}
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-4">
                ※ LH 신혼희망타운 당첨자는 일반 보금자리론 대신 이 전용 대출을 활용하는 것이 가장 유리합니다.
              </p>
            </div>
          </section>

          {/* 7. 신청 절차 */}
          <section>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
              보금자리론 신청 절차
            </h2>
            <div className="flex flex-col sm:flex-row gap-3">
              {[
                { step: '1', title: '자격 확인', desc: '소득·주택가격·DTI 기준 충족 여부 확인 (위 계산기 활용)' },
                { step: '2', title: '서류 준비', desc: '소득 증빙(근로/사업소득), 주택매매계약서, 주민등록 등·초본 등' },
                { step: '3', title: '온라인 신청', desc: '한국주택금융공사(HF) 홈페이지 또는 은행 창구에서 신청' },
                { step: '4', title: '심사 진행', desc: '소득·신용 심사 및 담보 감정평가 (통상 2~4주 소요)' },
                { step: '5', title: '대출 실행', desc: '심사 통과 후 잔금일에 대출 실행, 전입신고 의무' },
              ].map((item, i) => (
                <div key={item.step} className="flex-1 relative">
                  <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4 h-full">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="w-6 h-6 bg-blue-600 text-white text-xs font-bold rounded-full flex items-center justify-center flex-shrink-0">{item.step}</span>
                      <span className="font-semibold text-sm text-gray-900 dark:text-white">{item.title}</span>
                    </div>
                    <p className="text-xs text-gray-600 dark:text-gray-400">{item.desc}</p>
                  </div>
                  {i < 4 && (
                    <div className="hidden sm:flex absolute -right-1.5 top-1/2 -translate-y-1/2 z-10 text-gray-300 dark:text-gray-600 text-lg">›</div>
                  )}
                </div>
              ))}
            </div>
          </section>

          {/* 8. 자격 자가진단 체크리스트 */}
          <section>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
              나는 보금자리론 대상일까? — 자격 체크리스트
            </h2>
            <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-6 space-y-3">
              {[
                { check: '무주택자이거나, 1주택 보유자로 3년 내 처분 예정인가?', important: true },
                { check: '부부합산 연소득이 7천만원 이하인가? (신혼은 8.5천만, 다자녀는 9천만)', important: true },
                { check: '구매하려는 주택 가격이 6억원 이하인가?', important: true },
                { check: '주택 전용면적이 85㎡ 이하인가?', important: true },
                { check: 'DTI(월 상환액/월 소득)가 60% 이하로 예상되는가?', important: true },
                { check: '생애 처음 주택 구입이라면 → LTV 80%, 한도 4.2억 우대 적용', important: false },
                { check: '혼인 7년 이내 신혼부부라면 → 소득기준 8.5천만, 금리 0.3%p 우대', important: false },
                { check: '자녀 2명 이상이라면 → 한도 4억, 소득기준 9천만(3명+ 1억)', important: false },
              ].map((item, i) => (
                <div key={i} className="flex items-start gap-3">
                  <span className={`flex-shrink-0 mt-0.5 text-sm ${item.important ? 'text-blue-500' : 'text-green-500'}`}>
                    {item.important ? '✓' : '★'}
                  </span>
                  <span className="text-sm text-gray-700 dark:text-gray-300">{item.check}</span>
                </div>
              ))}
            </div>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">
              ✓ 필수 조건 · ★ 해당 시 추가 혜택
            </p>
          </section>

          {/* 9. 주의사항 */}
          <section>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
              꼭 알아야 할 주의사항
            </h2>
            <div className="grid sm:grid-cols-2 gap-4">
              {[
                { title: '실거주 의무', desc: '대출 실행 후 1개월 이내 전입신고 의무. 미이행 시 대출 즉시 상환 요구 가능.' },
                { title: '전매제한', desc: '분양주택의 경우 전매제한 기간 내 매도 불가. 지역·분양가에 따라 2~10년 제한.' },
                { title: '중도상환수수료', desc: '대출 실행 후 3년 이내 상환 시 수수료 발생 (최대 1.2%). 3년 후 무료.' },
                { title: '금리 변동', desc: '기준금리는 매월 재산정됩니다. 신청 시점 금리로 고정되므로 유리한 시점 공략 중요.' },
                { title: '기존 대출 상환', desc: '1주택자 신청 시 기존 주택 처분 조건부. 신규 주택 취득 후 3년 이내 기존 주택 처분 필수.' },
                { title: '소득 산정 기준', desc: '부부합산 연소득은 근로소득·사업소득·기타소득 합산. 원천징수영수증 기준으로 심사.' },
              ].map((item) => (
                <div key={item.title} className="bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800/30 rounded-xl p-4">
                  <div className="font-semibold text-sm text-amber-900 dark:text-amber-300 mb-1">⚠ {item.title}</div>
                  <p className="text-xs text-amber-800 dark:text-amber-400">{item.desc}</p>
                </div>
              ))}
            </div>
          </section>

          {/* 10. FAQ */}
          <section>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
              자주 묻는 질문
            </h2>
            <div className="space-y-3">
              {[
                {
                  q: '2026년 보금자리론 금리가 왜 올랐나요?',
                  a: '2026년 한국은행 기준금리 인상 기조의 영향으로 보금자리론 금리도 인상되었습니다. 2026년 1월 0.25%p, 2월 0.15%p 추가 인상되어 30년 기준 4.25% 수준입니다. 우대금리를 최대한 활용하고, 금리가 낮은 디딤돌대출 자격도 함께 확인하세요.',
                },
                {
                  q: '생애최초와 신혼부부 둘 다 해당되면 어떻게 되나요?',
                  a: '생애최초 조건(LTV 80%, 한도 4.2억)을 적용받으면서 신혼부부 우대금리(0.3%p)도 함께 적용받을 수 있습니다. 단, 전체 우대금리는 최대 1.0%p 한도이므로 중복 적용 시에도 1.0%p를 초과하지 않습니다.',
                },
                {
                  q: '아낌e 보금자리론과 일반 보금자리론의 차이는?',
                  a: '아낌e 보금자리론은 비대면(온라인) 신청 전용 상품으로, 동일한 조건에서 약간 낮은 금리가 적용됩니다. 은행 창구보다 온라인으로 신청하는 것이 금리면에서 유리합니다. 위 금리표는 아낌e 보금자리론 기준입니다.',
                },
                {
                  q: '연소득 7천만원 초과인데 보금자리론 방법이 없나요?',
                  a: '보금자리론은 소득 기준 초과 시 신청할 수 없습니다. 다만 일반 은행의 주택담보대출(시중금리)을 이용하거나, 보금자리론 대상이 되는 가족(배우자 소득 조정 등)을 활용하는 방법을 검토해볼 수 있습니다. 금융전문가 상담을 권장합니다.',
                },
                {
                  q: '체증식 상환이란 무엇인가요?',
                  a: '초기에 납입액이 적고 시간이 지날수록 상환액이 늘어나는 방식입니다. 만 40세 미만 신청자에게 허용되며, 초기 소득이 낮은 사회초년생에게 유리합니다. 총 이자 부담은 원리금균등상환보다 다소 크지만 초기 부담을 줄일 수 있습니다.',
                },
                {
                  q: '생애최초 보금자리론 자격 조건은 무엇인가요?',
                  a: '본인과 배우자 모두 과거 주택 소유 이력이 없어야 합니다(세대원 전원 미보유). 이력 기준이므로 현재 무주택자여도 과거에 주택을 소유했다면 해당되지 않습니다. 일반 보금자리론 공통 조건(소득 7천만원 이하, 주택가격 6억원 이하, DTI 60% 이하)도 함께 충족해야 합니다.',
                },
                {
                  q: '생애최초 보금자리론 금리는 일반과 얼마나 차이나나요?',
                  a: '생애최초 유형에는 기준금리에서 0.2%p 우대금리가 자동 적용됩니다. 30년 기준으로 일반 4.25% → 생애최초 4.05%입니다. 신혼부부 조건도 함께 해당되면 0.3%p를 추가 적용하여 3.75%까지 낮아집니다. LTV가 80%로 확대되어 같은 주택에서도 더 많은 대출이 가능한 것이 핵심 혜택입니다.',
                },
                {
                  q: '생애최초 보금자리론은 어떤 서류를 준비해야 하나요?',
                  a: '일반 서류 외에 세대원 전원의 주택 소유 이력이 없음을 증명하는 확인서가 필요합니다. 주민등록등본(전 주소 포함 발급), 부동산 등기부등본(과거 소유 이력 조회용)을 한국주택금융공사에서 확인합니다. 건강보험료 납부 확인서, 소득 증빙(근로소득원천징수영수증 등), 주택매매계약서도 공통 필수 서류입니다.',
                },
              ].map((item, i) => (
                <details key={i} className="group bg-gray-50 dark:bg-gray-800 rounded-xl">
                  <summary className="cursor-pointer px-5 py-4 font-medium text-sm text-gray-900 dark:text-white list-none flex justify-between items-center">
                    <span>Q. {item.q}</span>
                    <span className="text-gray-400 group-open:rotate-180 transition-transform text-lg leading-none">›</span>
                  </summary>
                  <div className="px-5 pb-4 text-sm text-gray-600 dark:text-gray-400 leading-relaxed border-t border-gray-100 dark:border-gray-700 pt-3">
                    {item.a}
                  </div>
                </details>
              ))}
            </div>
          </section>

          {/* 출처 */}
          <div className="text-xs text-gray-400 dark:text-gray-500 border-t border-gray-100 dark:border-gray-700 pt-6">
            <p className="mb-1 font-medium">참고 출처</p>
            <p>한국주택금융공사(HF) 공식 홈페이지 (hf.go.kr) · 마이홈포털 (myhome.go.kr) · 2026년 1분기 보금자리론 금리 공시 기준</p>
            <p className="mt-1">※ 본 계산기는 참고용이며, 실제 대출 조건은 금융기관 심사 결과에 따라 다를 수 있습니다. 정확한 내용은 주택금융공사 또는 해당 금융기관에 문의하세요.</p>
          </div>
        </div>
      </div>
    </>
  );
}
