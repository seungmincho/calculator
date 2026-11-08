import { Metadata } from 'next'
import MilitaryDischarge from '@/components/MilitaryDischarge'
import I18nWrapper from '@/components/I18nWrapper'
import RelatedTools from '@/components/RelatedTools'
import { PAY_2026 } from '@/utils/militaryDischarge'

// 계산 근거: src/utils/militaryDischarge.ts 주석 (복무기간·만료일 계산·진급 기간·병 봉급)
const sources = [
  { label: '병역법 제18조 (현역의 복무)', url: 'https://www.law.go.kr/법령/병역법/제18조' },
  { label: '병무청 (군별 복무기간·사회복무요원·산업기능요원·전문연구요원 안내)', url: 'https://www.mma.go.kr' },
  { label: '민법 제160조 (역에 의한 기간 계산 — 전역일은 마지막 달 입대일 전날)', url: 'https://www.law.go.kr/법령/민법/제160조' },
  { label: '군인사법 시행규칙 제32조 (현역병 진급 최저 복무기간)', url: 'https://www.law.go.kr/법령/군인사법시행규칙/제32조' },
  { label: '인사혁신처 — 2026년 공무원 봉급표 (별표 13 군인 봉급표 비고: 병 봉급)', url: 'https://www.mpm.go.kr/mpm/info/resultPay/bizSalary/2026/' },
  { label: '공무원보수규정', url: 'https://www.law.go.kr/법령/공무원보수규정' },
]
const man = (n: number) => `${(n / 10_000).toLocaleString('ko-KR')}만원`

export const metadata: Metadata = {
  title: '전역일 계산기 - 군 복무 전역일·D-Day 계산 | 툴허브',
  description: '입대일과 군별(육군·해군·공군·해병대·사회복무요원 등)을 선택하면 전역일, D-Day, 복무 진행률, 진급 일정, 2026년 병 월급을 자동으로 계산합니다.',
  keywords: '전역일 계산기, 군 복무 기간, D-Day, 입대일, 전역 날짜, 육군 해군 공군 해병대, 사회복무요원, 복무 진행률',
  openGraph: {
    title: '전역일 계산기 - 군 복무 전역일·D-Day 계산 | 툴허브',
    description: '입대일과 군별을 선택하면 전역일, D-Day, 복무 진행률, 진급 일정을 계산합니다.',
    url: 'https://toolhub.ai.kr/military-discharge/',
    siteName: '툴허브',
    locale: 'ko_KR',
    type: 'website',
    images: [{ url: 'https://toolhub.ai.kr/og/military-discharge.png', width: 1200, height: 630, alt: '전역일 계산기' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: '전역일 계산기 | 툴허브',
    description: '군 복무 전역일, D-Day, 진급 일정을 한 번에 계산하세요.',
    images: ['https://toolhub.ai.kr/og/military-discharge.png'],
  },
  alternates: {
    canonical: 'https://toolhub.ai.kr/military-discharge/',
  },
}

export default function MilitaryDischargePage() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: '전역일 계산기',
    description: '입대일과 군별을 선택하면 전역일, D-Day, 복무 진행률, 진급 일정을 자동으로 계산합니다.',
    url: 'https://toolhub.ai.kr/military-discharge/',
    applicationCategory: 'UtilityApplication',
    operatingSystem: 'Any',
    browserRequirements: 'JavaScript',
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'KRW' },
    featureList: [
      '전역일 자동 계산',
      'D-Day 카운터',
      '복무 진행률 표시',
      '진급 일정 (이등병→일병→상병→병장)',
      '군별 복무기간 지원 (육군·해군·공군·해병대·카투사·상근예비역·사회복무요원·산업기능요원·전문연구요원)',
      '2026년 병 봉급·내일준비지원금 표시',
      '입대 100일·복무율 50%·전역 D-100 일정',
      '여러 명 저장 및 D-day 카드 이미지 공유',
    ],
  }

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <div className="min-h-screen py-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
            <I18nWrapper>
              <MilitaryDischarge />
              <section className="mt-8 bg-subtle rounded-2xl p-5 text-sm text-sub">
                <h2 className="font-semibold text-fg mb-2">근거 법령·출처</h2>
                <ul className="space-y-1.5">
                  {sources.map((s) => (
                    <li key={s.url}>
                      <a href={s.url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">{s.label}</a>
                    </li>
                  ))}
                </ul>
                <p className="text-xs text-muted mt-3">{`기준: 2026년 병무청 군별 복무기간, 2026년 공무원 봉급표의 병 봉급(이병 ${man(PAY_2026.pvt)}~병장 ${man(PAY_2026.sgt)}, 2026년 11월 8일 확인).`}</p>
              </section>
              <div className="mt-8">

                <RelatedTools />

              </div>

            </I18nWrapper>
        </div>
      </div>
    </>
  )
}
