import { Metadata } from 'next'
import LottoTaxCalculator from '@/components/LottoTaxCalculator'
import I18nWrapper from '@/components/I18nWrapper'

export const metadata: Metadata = {
  title: '로또 당첨금 세금 계산기 - 실수령액 확인 | 툴허브',
  description: '로또·복권 당첨금에 부과되는 세금(22%/33%)을 자동으로 계산하고 실수령액을 확인하세요. 3억원 기준 구간별 세율, 등수별 평균 당첨금, 수령 절차 안내.',
  keywords: '로또 세금, 복권 세금, 당첨금 세금, 로또 실수령액, 복권 당첨금 계산, 기타소득세, 로또 1등 세금',
  openGraph: {
    title: '로또 당첨금 세금 계산기 | 툴허브',
    description: '로또·복권 당첨금 세금(22%/33%) 자동 계산, 실수령액 확인',
    url: 'https://toolhub.ai.kr/lotto-tax/',
    siteName: '툴허브',
    locale: 'ko_KR',
    type: 'website',
    images: [{ url: 'https://toolhub.ai.kr/og/lotto-tax.png', width: 1200, height: 630, alt: '로또 당첨금 세금 계산기' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: '로또 당첨금 세금 계산기',
    description: '로또·복권 당첨금 세금 자동 계산, 실수령액 확인',
    images: ['https://toolhub.ai.kr/og/lotto-tax.png'],
  },
  alternates: {
    canonical: 'https://toolhub.ai.kr/lotto-tax/',
  },
}

// 계산 근거: src/components/LottoTaxCalculator.tsx (과세최저한 200만원, 20%·3억 초과 30%, 지방소득세 10%)
const sources = [
  { label: '소득세법 제21조 (기타소득 — 복권 당첨금)', url: 'https://www.law.go.kr/법령/소득세법/제21조' },
  { label: '소득세법 제84조 (기타소득 과세최저한 — 건별 200만원 이하)', url: 'https://www.law.go.kr/법령/소득세법/제84조' },
  { label: '소득세법 제129조 (원천징수세율 — 20%, 3억원 초과분 30%)', url: 'https://www.law.go.kr/법령/소득세법/제129조' },
  { label: '소득세법 제14조 (분리과세 — 복권 당첨금은 종합소득에 합산하지 않음)', url: 'https://www.law.go.kr/법령/소득세법/제14조' },
  { label: '지방세법 제103조의13 (개인지방소득세 특별징수 — 소득세의 10%)', url: 'https://www.law.go.kr/법령/지방세법/제103조의13' },
]

export default function LottoTaxPage() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: '로또 당첨금 세금 계산기',
    description: '로또·복권 당첨금에 부과되는 세금을 계산하고 실수령액을 확인하는 계산기',
    url: 'https://toolhub.ai.kr/lotto-tax/',
    applicationCategory: 'FinanceApplication',
    operatingSystem: 'Any',
    browserRequirements: 'JavaScript',
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'KRW' },
    featureList: [
      '3억원 기준 구간별 세율 (22%/33%) 자동 계산',
      '실수령액 즉시 확인',
      '로또 등수별 평균 당첨금 프리셋',
      '당첨금별 세금 비교표',
      '수령 절차 안내',
    ],
  }

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <div className="min-h-screen py-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
            <I18nWrapper>
              <LottoTaxCalculator />
            </I18nWrapper>
            <section className="mt-8 bg-subtle rounded-2xl p-5 text-sm text-sub">
              <h2 className="font-semibold text-fg mb-2">근거 법령·출처</h2>
              <ul className="space-y-1.5">
                {sources.map((s) => (
                  <li key={s.url}>
                    <a href={s.url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">{s.label}</a>
                  </li>
                ))}
              </ul>
              <p className="text-xs text-muted mt-3">기준: 2026년 11월 현재 시행 중인 소득세법·지방세법. 과세최저한 200만원은 2023년 1월 1일 이후 지급분부터 적용됩니다.</p>
            </section>
        </div>
      </div>
    </>
  )
}
