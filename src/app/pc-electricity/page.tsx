import { Metadata } from 'next'
import PcElectricityCalculator from '@/components/PcElectricityCalculator'
import I18nWrapper from '@/components/I18nWrapper'
import RelatedTools from '@/components/RelatedTools'
import ToolFaq from '@/components/ToolFaq'
import { TARIFF } from '@/utils/pcElectricity'

const sources = [
  { label: '한국전력공사 — 주택용 전력 요금표(저압, 계절별 누진 구간)', url: 'https://cyber.kepco.co.kr/ckepco/front/jsp/CY/E/E/CYEEHP00101.jsp' },
  { label: '한국전력공사 — 연료비조정요금', url: 'https://cyber.kepco.co.kr/ckepco/front/jsp/CY/H/C/CYHCHP00210.jsp' },
  { label: '전기사업법 제51조 — 전력산업기반기금 부담금', url: 'https://www.law.go.kr/법령/전기사업법/제51조' },
]

export const metadata: Metadata = {
  title: '컴퓨터 소비전력 계산기 - PC 전기세·월 전기요금 | 툴허브',
  description: 'CPU·GPU·모니터 등 부품별 소비전력으로 PC 총 전력(W)과 하루 사용시간 기준 월·연간 전기요금을 계산. 게이밍 PC·사무용 PC·24시간 가동 전기세 비교.',
  keywords: '컴퓨터 전기세, PC 전기요금, 소비전력 계산, GPU 전력, CPU 전력, 전기요금 계산기, 게이밍 PC 전기세',
  openGraph: { title: '컴퓨터 전기세 계산기 | 툴허브', description: 'PC 전력 소비·전기요금 계산', url: 'https://toolhub.ai.kr/pc-electricity/', siteName: '툴허브', locale: 'ko_KR', type: 'website', images: [{ url: 'https://toolhub.ai.kr/og/pc-electricity.png', width: 1200, height: 630, alt: '컴퓨터 전기세 계산기' }] },
  twitter: { card: 'summary_large_image', title: '컴퓨터 전기세 계산기 | 툴허브', images: ['https://toolhub.ai.kr/og/pc-electricity.png'] },
  alternates: { canonical: 'https://toolhub.ai.kr/pc-electricity/' },
}

export default function PcElectricityPage() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: '컴퓨터 전기세 계산기',
    description: 'PC 부품별 소비전력으로 전기요금 계산.',
    url: 'https://toolhub.ai.kr/pc-electricity/',
    applicationCategory: 'UtilityApplication',
    operatingSystem: 'Any',
    browserRequirements: 'JavaScript',
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'KRW' },
    featureList: ['CPU/GPU 모델별 소비전력 프리셋', '누진제 한계비용(가구 사용량 반영)', '하계 누진구간', 'GPU 교체 절감액 비교', '게이밍/작업/대기 시간 분배', '공유 링크'],
  }
  const faq = [
    { q: '게이밍 PC 한 달 전기세는 얼마인가요?', a: '게이밍 PC(CPU 125W + GPU 300W 등 합계 약 510W, 80 PLUS 골드 파워)로 하루 5시간 게임을 30일 하면 약 74kWh를 씁니다. 누진제 때문에 추가 요금은 집의 기존 사용량에 따라 다릅니다. 월 300kWh 쓰는 가구는 약 19,000원, 월 400kWh 가구는 3단계 구간으로 넘어가 약 33,000원이 늘어납니다(기후환경·연료비조정요금, 부가세, 전력기금 포함).' },
  ]

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <div className="min-h-screen py-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
            <I18nWrapper>
              <PcElectricityCalculator />
              <ToolFaq items={faq} />
              <section className="max-w-4xl mx-auto mt-8 bg-subtle rounded-2xl p-5 text-sm text-sub">
                <h2 className="text-base font-semibold text-fg mb-3">요금 근거·출처</h2>
                <ul className="space-y-1.5">
                  {sources.map((s) => (
                    <li key={s.url}>
                      <a href={s.url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">{s.label}</a>
                    </li>
                  ))}
                </ul>
                <p className="mt-3">기준: 2026년 4분기 한전 주택용 저압 요금(2023년 11월 9일 이후 동결) — 기후환경요금 kWh당 {TARIFF.climate}원, 연료비조정요금 kWh당 {TARIFF.fuel}원, 부가가치세 {TARIFF.vat * 100}%, 전력산업기반기금 {+(TARIFF.fund * 100).toFixed(1)}%. 부품 소비전력은 제조사 정격값을 바탕으로 한 추정치입니다.</p>
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
