import { Metadata } from 'next'
import SalesCommissionCalculator from '@/components/SalesCommissionCalculator'
import I18nWrapper from '@/components/I18nWrapper'
import RelatedTools from '@/components/RelatedTools'
import Link from 'next/link'
import { glassCard } from '@/lib/glass'

export const metadata: Metadata = {
  title: '판매수수료 계산기 - 쿠팡·스마트스토어·11번가 수수료 비교 | 툴허브',
  description: '쿠팡, 네이버 스마트스토어, 11번가의 카테고리별 판매수수료를 한눈에 비교합니다. 판매가 입력만으로 플랫폼별 수수료와 정산 예상액을 확인하세요.',
  keywords: '판매수수료 계산기, 쿠팡 수수료, 스마트스토어 수수료, 11번가 수수료, 오픈마켓 수수료, 카테고리별 수수료, 정산액 계산',
  openGraph: {
    title: '판매수수료 계산기 | 툴허브',
    description: '쿠팡·스마트스토어·11번가 카테고리별 수수료 비교',
    url: 'https://toolhub.ai.kr/sales-commission',
    siteName: '툴허브', locale: 'ko_KR', type: 'website',
  },
  twitter: { card: 'summary_large_image', title: '판매수수료 계산기 | 툴허브', description: '오픈마켓 수수료 비교' },
  alternates: { canonical: 'https://toolhub.ai.kr/sales-commission/' },
}

export default function SalesCommissionPage() {
  const jsonLd = {
    '@context': 'https://schema.org', '@type': 'WebApplication',
    name: '판매수수료 계산기',
    description: '쿠팡·스마트스토어·11번가 카테고리별 판매수수료 비교 계산.',
    url: 'https://toolhub.ai.kr/sales-commission/',
    applicationCategory: 'FinanceApplication', operatingSystem: 'Any', browserRequirements: 'JavaScript',
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'KRW' },
    featureList: ['3사 카테고리별 수수료 비교', '정산 예상액 자동 계산', '최저 수수료 플랫폼 표시', '전 카테고리 비교 테이블'],
  }
  const faqJsonLd = {
    '@context': 'https://schema.org', '@type': 'FAQPage',
    mainEntity: [
      { '@type': 'Question', name: '쿠팡 판매 수수료는 얼마인가요?', acceptedAnswer: { '@type': 'Answer', text: '쿠팡 판매 수수료는 카테고리별로 4%~10.9%이며, 최종 결제금액(배송비 포함) 기준으로 부과됩니다. 월 서비스 이용료 55,000원이 별도입니다(월매출 100만원 초과 시).' } },
      { '@type': 'Question', name: '스마트스토어 수수료는 얼마인가요?', acceptedAnswer: { '@type': 'Answer', text: '네이버 스마트스토어는 네이버페이 주문관리 수수료(1.98~3.63%)와 판매수수료(2.73%)가 합산되어 약 5~6% 수준입니다. 배송비에는 판매수수료가 부과되지 않습니다.' } },
    ],
  }
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 py-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
            {/* 네이버에서 "성과급 계산기"·"인센티브 세금" 검색이 이 페이지로 유입됨 → 의도 분기 안내 */}
            <p className={`${glassCard} mb-6 px-4 py-3 text-sm text-gray-700 dark:text-gray-200`}>
              회사에서 받는 <strong>성과급·인센티브의 세금과 실수령액</strong>이 궁금하신가요? →{' '}
              <Link href="/bonus-calculator" className="font-semibold underline underline-offset-2">성과급 계산기</Link>
              {' '}· 이 페이지는 쿠팡·스마트스토어 등 <strong>온라인 판매 수수료</strong> 계산기입니다.
            </p>
            <I18nWrapper><SalesCommissionCalculator />  <div className="mt-8">
    <RelatedTools />
  </div>
</I18nWrapper>
        </div>
      </div>
    </>
  )
}
