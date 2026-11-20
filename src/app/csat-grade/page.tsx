import { Metadata } from 'next'
import CsatGrade from '@/components/CsatGrade'
import I18nWrapper from '@/components/I18nWrapper'
import RelatedTools from '@/components/RelatedTools'
import { FaqJsonLd } from '@/components/ToolFaq'
import csatGradeMessages from '../../../messages/generated/ko/ns/csatGrade.json'
import { CUT_YEAR, CSAT_YEAR, EST_YEAR, EST_SOURCE } from '@/utils/csatGrade'

const TITLE = `수능 등급컷 계산기 - ${CSAT_YEAR} 대비·목표 비교 | 툴허브`
const DESC = `${EST_YEAR}학년도 수능 가채점 예상 등급컷(${EST_SOURCE.agency} 추정)과 ${CUT_YEAR}학년도 참고 컷, 그리고 영어·한국사 절대평가를 참고하세요. 점수 기록 12개·단순 목표 6개를 저장하고 직접 입력한 등급도 별도로 비교합니다. 공식 확정컷(12월 11일 성적 통지)이나 대학별 지원 판정은 아닙니다.`

const sources = [
  { label: '교육부 — 2027학년도 수능 시행기본계획', url: 'https://www.moe.go.kr/boardCnts/viewRenew.do?boardID=294&boardSeq=105756&lev=0&m=020402&s=moe' },
  { label: '교육부 — 2027학년도 시험일·성적 통지일 안내', url: 'https://www.moe.go.kr/boardCnts/viewRenew.do?boardID=294&boardSeq=100526&lev=0&m=020402' },
  { label: `${EST_SOURCE.agency} — ${EST_YEAR}학년도 수능 추정 등급컷(가채점 예상)`, url: EST_SOURCE.url },
]

export const metadata: Metadata = {
  title: TITLE,
  description: DESC,
  keywords: `수능 등급컷, 수능 등급 계산기, ${CSAT_YEAR}학년도 수능, 전년도 등급컷, 원점수 추정컷, 수능 가채점, 가채점 등급컷, 영어 등급컷, 한국사 등급컷, 수능최저`,
  openGraph: {
    title: TITLE,
    description: DESC,
    url: 'https://toolhub.ai.kr/csat-grade/',
    siteName: '툴허브',
    locale: 'ko_KR',
    type: 'website',
    images: [{ url: 'https://toolhub.ai.kr/og/csat-grade.png', width: 1200, height: 630, alt: '수능 등급컷 계산기' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: TITLE,
    description: DESC,
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
    description: DESC,
    url: 'https://toolhub.ai.kr/csat-grade/',
    applicationCategory: 'EducationalApplication',
    operatingSystem: 'Any',
    browserRequirements: 'JavaScript',
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'KRW' },
    featureList: [
      `${EST_YEAR} 가채점 예상 컷 / ${CUT_YEAR} 참고 컷 전환`,
      '영어·한국사 절대평가 등급',
      '선택과목별 참고 등급컷 비교표',
      '기준 연도·추정 표시를 포함한 결과 공유',
      '수능최저 등급 합 참고',
      '이름 붙인 점수 기록 최대 12개 저장·명시적 불러오기',
      '선택과목·기준 연도를 구분한 현재 원점수 비교',
      '사용자 단순 목표 조건 최대 6개 저장·수정·현재 입력 비교',
      '목표 계산에 실제 사용한 영역·입력 부족 안내',
      '사용자가 직접 입력한 1~9등급으로 같은 저장 목표 비교',
      '직접 등급을 원점수 기록·URL·공유와 분리',
      '빈칸·무효 원점수·실제 0점 구분과 유효 입력 기반 요약',
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
                <h2 className="text-base font-semibold text-fg mb-3">참고 자료 기준·공식 제도 안내</h2>
                <ul className="space-y-1.5">
                  {sources.map((s) => (
                    <li key={s.url}>
                      <a href={s.url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">{s.label}</a>
                    </li>
                  ))}
                </ul>
                <p className="mt-3">이 계산기의 상대평가 결과는 기본으로 {EST_YEAR}학년도 가채점 예상 컷({EST_SOURCE.agency} 추정, {EST_SOURCE.checked} 확인)을, 전환하면 {CUT_YEAR}학년도 참고 원점수 추정컷을 사용합니다. 둘 다 {CSAT_YEAR}학년도 실제 등급이나 확정컷이 아닙니다. 참고 표의 모든 수치를 공식 발표치로 검증한 것은 아닙니다. 영어·한국사는 절대평가 기준으로 별도 계산합니다. 위 공식 자료는 올해 시험 제도와 일정의 근거이며, 이 계산기의 원점수 추정 표 전체의 출처를 뜻하지 않습니다. 확인일: 2026년 11월 17일.</p>
                <p className="mt-3">직접 등급 비교는 사용자가 입력한 등급으로 같은 단순 목표 조건을 계산하는 별도 패널입니다. 공식 성적 확인이나 대학별 합격 판정이 아니며, 직접 입력을 원점수 기록·공유 URL·결과 카드에 합치지 않습니다. 빈 원점수와 실제 0점은 구분하며 평균에 필요한 입력이 부족하면 부분 평균을 만들지 않습니다.</p>
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
