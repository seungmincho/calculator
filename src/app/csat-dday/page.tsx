import { Metadata } from 'next'
import CsatDday from '@/components/CsatDday'
import I18nWrapper from '@/components/I18nWrapper'
import RelatedTools from '@/components/RelatedTools'
import { FaqJsonLd } from '@/components/ToolFaq'
import csatDdayMessages from '../../../messages/generated/ko/ns/csatDday.json'
import { CSAT_EXAM_DATE, CSAT_YEAR } from '@/utils/csatGrade'
import { CSAT_GUIDANCE_CHECKED, CSAT_GUIDANCE_URL, TIMELINE } from '@/utils/csatDday'
import { csatDate, todayKST } from '@/utils/dday'

const kd = (s: string) => { const [y, m, d] = s.split('-').map(Number); return `${y}년 ${m}월 ${d}일` }
const at = (key: string) => kd(TIMELINE.find((x) => x.key === key)!.start)
const NEXT = CSAT_YEAR + 1
// 빌드 시점이 시험 뒤면 검색 의도가 '정답·성적 발표·다음 수능'으로 바뀐다
const AFTER = todayKST() > CSAT_EXAM_DATE
const TITLE = AFTER
  ? `수능 D-day - ${CSAT_YEAR} 정답 확정·성적 발표, ${NEXT} 수능까지 | 툴허브`
  : `수능 D-day ${CSAT_YEAR} - 시간표·준비물·과목 연습 | 툴허브`
const DESC = AFTER
  ? `${CSAT_YEAR}학년도 수능(${kd(CSAT_EXAM_DATE)}) 이후 이의신청·정답 확정(${at('answerFinal')})·성적 통지(${at('score')})·정시 일정과 ${NEXT}학년도 수능(${kd(csatDate(CSAT_YEAR).date)}) D-day를 확인하세요. 시간표·준비물 안내, 가채점 답 저장·인쇄, 과목별 연습 타이머도 제공합니다.`
  : `${CSAT_YEAR}학년도 수능(${kd(CSAT_EXAM_DATE)}) D-day, 일반 수험생 시간표와 준비물·반입금지 안내를 확인하세요. 공식 안내 확인, 가채점 답 저장·인쇄, 성적 발표 일정과 과목별 연습 타이머를 제공합니다.`

export const metadata: Metadata = {
  title: TITLE,
  description: DESC,
  keywords: `수능 디데이, 수능 D-day, ${CSAT_YEAR} 수능, ${NEXT} 수능 디데이, 수능 정답 확정, 수능 이의신청, 수능 시간표, 수능 준비물, 수능 반입금지 물품, 수능 가채점표, 수능 연습 타이머, 수능 성적 발표일, 정시 원서접수`,
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
            <CsatDday after={AFTER} />
            <p className="mt-8 bg-subtle rounded-2xl p-5 text-sm text-sub">
              기준: {CSAT_YEAR}학년도 대학수학능력시험 <a href="https://www.moe.go.kr/boardCnts/viewRenew.do?boardID=294&boardSeq=105756&lev=0&m=020402&s=moe" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">시행기본계획</a>과 <a href={CSAT_GUIDANCE_URL} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">교육부 수험생 유의사항</a> — 시험일 {kd(CSAT_EXAM_DATE)}. 이의신청·정답 확정({at('answerFinal')}) 일정은 평가원 발표, {NEXT}학년도 수능({kd(csatDate(CSAT_YEAR).date)}) 은 <a href="https://www.moe.go.kr/boardCnts/viewRenew.do?boardID=294&boardSeq=103512&lev=0" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">교육부 시행일 안내</a> 기준입니다. D-day는 한국시간 기준으로 셉니다. 공식 안내 확인일: {CSAT_GUIDANCE_CHECKED}. 세부 응시 조건은 공식 유의사항과 감독관 안내를 따르세요.
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
