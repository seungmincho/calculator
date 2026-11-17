import { Metadata } from 'next'
import CsatDday from '@/components/CsatDday'
import I18nWrapper from '@/components/I18nWrapper'
import RelatedTools from '@/components/RelatedTools'
import { FaqJsonLd } from '@/components/ToolFaq'
import csatDdayMessages from '../../../messages/generated/ko/ns/csatDday.json'
import { CSAT_EXAM_DATE, CSAT_YEAR } from '@/utils/csatGrade'
import { CSAT_GUIDANCE_CHECKED, CSAT_GUIDANCE_URL } from '@/utils/csatDday'

const [examY, examM, examD] = CSAT_EXAM_DATE.split('-').map(Number)
const TITLE = `수능 D-day ${CSAT_YEAR} - 시간표·준비물·과목 연습 | 툴허브`
const DESC = `${CSAT_YEAR}학년도 수능(${examY}년 ${examM}월 ${examD}일) D-day, 일반 수험생 시간표와 준비물·반입금지 안내를 확인하세요. 공식 안내 확인, 가채점 답 저장·인쇄, 성적 발표 일정과 과목별 연습 타이머를 제공합니다.`

export const metadata: Metadata = {
  title: TITLE,
  description: DESC,
  keywords: `수능 디데이, 수능 D-day, ${CSAT_YEAR} 수능, 수능 시간표, 수능 준비물, 수능 반입금지 물품, 수능 가채점표, 수능 연습 타이머, 수능 성적 발표일, 정시 원서접수`,
  openGraph: {
    title: TITLE,
    description: DESC,
    url: 'https://toolhub.ai.kr/csat-dday/',
    siteName: '툴허브',
    locale: 'ko_KR',
    type: 'website',
    images: [{ url: 'https://toolhub.ai.kr/og/csat-dday.png', width: 1200, height: 630, alt: '수능 D-day 2027' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: TITLE,
    description: DESC,
    images: ['https://toolhub.ai.kr/og/csat-dday.png'],
  },
  alternates: {
    canonical: 'https://toolhub.ai.kr/csat-dday/',
  },
}

export default function CsatDdayPage() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: '수능 D-day · 시간표 · 준비물',
    description: DESC,
    url: 'https://toolhub.ai.kr/csat-dday/',
    applicationCategory: 'EducationalApplication',
    operatingSystem: 'Any',
    browserRequirements: 'JavaScript',
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'KRW' },
    featureList: ['수능 D-day 실시간 카운트다운', '교시별 시간표·현재 교시 표시', '준비물·반입금지 물품 체크리스트', '가채점 답 저장·인쇄', '응원 카드 공유', '성적 통지·정시 일정', '공식 유의사항 확인 링크', '과목별 시간으로 설정한 연습 타이머 진입'],
  }

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <FaqJsonLd items={csatDdayMessages.csatDday.guide.faq.items} />
      <div className="min-h-screen py-8">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <I18nWrapper>
            <CsatDday />
            <p className="mt-8 bg-subtle rounded-2xl p-5 text-sm text-sub">
              기준: {CSAT_YEAR}학년도 대학수학능력시험 <a href="https://www.moe.go.kr/boardCnts/viewRenew.do?boardID=294&boardSeq=105756&lev=0&m=020402&s=moe" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">시행기본계획</a>과 <a href={CSAT_GUIDANCE_URL} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">교육부 수험생 유의사항</a> — 시험일 {examY}년 {examM}월 {examD}일. D-day는 한국시간 기준으로 셉니다. 공식 안내 확인일: {CSAT_GUIDANCE_CHECKED}. 세부 응시 조건은 공식 유의사항과 감독관 안내를 따르세요.
            </p>
            <div className="mt-8">
              <RelatedTools />
            </div>
          </I18nWrapper>
        </div>
      </div>
    </>
  )
}
