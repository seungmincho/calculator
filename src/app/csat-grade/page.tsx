import { Metadata } from 'next'
import CsatGrade from '@/components/CsatGrade'
import I18nWrapper from '@/components/I18nWrapper'
import RelatedTools from '@/components/RelatedTools'
import { FaqJsonLd } from '@/components/ToolFaq'
import csatGradeMessages from '../../../messages/generated/ko/ns/csatGrade.json'
import { CUT_YEAR, CSAT_YEAR } from '@/utils/csatGrade'

const sources = [
  { label: '한국교육과정평가원 대학수학능력시험 — 시행 계획·채점 결과 발표', url: 'https://www.suneung.re.kr' },
  { label: '한국교육과정평가원', url: 'https://www.kice.re.kr' },
]

export const metadata: Metadata = {
  title: '수능 등급컷 계산기 - 과목별 등급 판정 | 툴허브',
  description: '2026학년도 수능 과목별 원점수를 입력하면 등급을 즉시 확인합니다. 국어, 수학, 영어, 한국사, 탐구 과목별 등급컷 표와 등급 산출 방식을 안내합니다.',
  keywords: '수능 등급컷, 수능 등급 계산기, 수능 등급컷 계산, 2026 수능, 수능 과목별 등급, 영어 등급컷, 수학 등급컷',
  openGraph: {
    title: '수능 등급컷 계산기 | 툴허브',
    description: '2026 수능 과목별 원점수→등급 즉시 확인',
    url: 'https://toolhub.ai.kr/csat-grade/',
    siteName: '툴허브',
    locale: 'ko_KR',
    type: 'website',
    images: [{ url: 'https://toolhub.ai.kr/og/csat-grade.png', width: 1200, height: 630, alt: '수능 등급컷 계산기' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: '수능 등급컷 계산기 | 툴허브',
    description: '수능 과목별 등급 판정 및 등급컷 확인',
    images: ['https://toolhub.ai.kr/og/csat-grade.png'],
  },
  alternates: {
    canonical: 'https://toolhub.ai.kr/csat-grade/',
  },
}

export default function CsatGradePage() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: '수능 등급컷 계산기',
    description: '2026학년도 수능 과목별 등급 판정 계산기',
    url: 'https://toolhub.ai.kr/csat-grade/',
    applicationCategory: 'EducationalApplication',
    operatingSystem: 'Any',
    browserRequirements: 'JavaScript',
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'KRW' },
    featureList: [
      '과목별 원점수→등급 변환',
      '영어·한국사 절대평가 등급',
      '등급컷 비교표',
      'URL 공유 기능',
    ],
  }

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <FaqJsonLd items={csatGradeMessages.csatGrade.guide.faq.items} />
      <div className="min-h-screen py-8">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <I18nWrapper>
              <CsatGrade />
              <section className="mt-8 bg-subtle rounded-2xl p-5 text-sm text-sub">
                <h2 className="text-base font-semibold text-fg mb-3">등급컷 기준·출처</h2>
                <ul className="space-y-1.5">
                  {sources.map((s) => (
                    <li key={s.url}>
                      <a href={s.url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">{s.label}</a>
                    </li>
                  ))}
                </ul>
                <p className="mt-3">기준: {CUT_YEAR}학년도 수능 채점 결과로 평가원이 발표한 등급 구분 표준점수. 평가원은 원점수 등급컷을 발표하지 않아 원점수 컷은 입시기관이 표준점수에서 역산한 추정치이고, 영어·한국사는 절대평가 고정 기준입니다. {CSAT_YEAR}학년도 컷은 12월 채점 결과 발표 뒤 반영합니다.</p>
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
