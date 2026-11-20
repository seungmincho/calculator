import { Metadata } from 'next'
import JeongsiScore from '@/components/JeongsiScore'
import I18nWrapper from '@/components/I18nWrapper'
import RelatedTools from '@/components/RelatedTools'
import { FaqJsonLd } from '@/components/ToolFaq'
import messages from '../../../messages/generated/ko/ns/jeongsiScore.json'

const TITLE = '정시 환산점수 계산기 2027 - 대학별 반영 비율·영어·한국사 | 툴허브'
const DESC = '수능 표준점수·백분위와 지원 대학 모집요강의 반영 비율·영어 등급 환산·한국사 가산점·미적분·과탐 가산을 넣으면 정시 환산점수와 영역별 점수를 계산해요. 가·나·다군 공식 6개를 저장해 비교할 수 있어요.'
const PAGE_URL = 'https://toolhub.ai.kr/jeongsi-score/'
const OG = 'https://toolhub.ai.kr/og/jeongsi-score.png'

export const metadata: Metadata = {
  title: TITLE,
  description: DESC,
  keywords: '정시 환산점수 계산기, 2027 정시 환산점수, 대학별 환산점수, 수능 환산점수 계산, 정시 반영 비율, 표준점수 백분위 환산, 영어 등급 환산점수, 한국사 가산점, 과탐 가산점, 미적분 가산점, 변환표준점수, 정시 모집요강',
  openGraph: {
    title: TITLE,
    description: '수능 점수와 대학 모집요강의 반영 공식으로 정시 환산점수 계산, 가·나·다군 공식 저장·비교',
    url: PAGE_URL,
    siteName: '툴허브', locale: 'ko_KR', type: 'website',
    images: [{ url: OG, width: 1200, height: 630, alt: '정시 환산점수 계산기' }],
  },
  twitter: { card: 'summary_large_image', title: '정시 환산점수 계산기 2027 | 툴허브', description: '반영 비율·영어·한국사·가산점으로 정시 환산점수 계산', images: [OG] },
  alternates: { canonical: PAGE_URL },
}

export default function JeongsiScorePage() {
  const jsonLd = {
    '@context': 'https://schema.org', '@type': 'WebApplication',
    name: '정시 환산점수 계산기',
    description: '수능 표준점수·백분위·영어·한국사 등급과 대학 모집요강의 반영 공식(영역 비율, 영어 환산·가감점, 한국사 가산점, 수학·과탐 가산 %, 만점)으로 정시 환산점수를 계산하고 공식을 저장해 비교하는 도구.',
    url: PAGE_URL,
    applicationCategory: 'EducationalApplication', operatingSystem: 'Any', browserRequirements: 'JavaScript',
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'KRW' },
    featureList: [
      '표준점수·백분위 반영 선택과 영역별 반영 비율',
      '영어 등급 환산점수 비율 반영 또는 가산·감산',
      '한국사 등급별 가산점, 수학 미적분·기하·과탐 가산 %',
      '탐구 2과목 평균 또는 상위 1과목 반영',
      '영역별 점수 내역과 만점 대비 비율',
      '가·나·다군 공식 6개 저장·비교, 링크로 공유',
    ],
  }

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <FaqJsonLd items={messages.jeongsiScore.guide.faq.items} />
      <div className="min-h-screen py-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <I18nWrapper>
            <JeongsiScore />
            <div className="mt-8">
              <RelatedTools />
            </div>
          </I18nWrapper>
        </div>
      </div>
    </>
  )
}
