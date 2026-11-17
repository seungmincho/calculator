import type { Metadata } from 'next'
import SpeakingPractice from '@/components/SpeakingPractice'
import I18nWrapper from '@/components/I18nWrapper'
import RelatedTools from '@/components/RelatedTools'
import { FaqJsonLd } from '@/components/ToolFaq'
import speakingPracticeMessages from '../../../messages/generated/ko/ns/speakingPractice.json'

const TITLE = '1분 말하기 연습실 - 준비 카운트다운·녹음 비교 | 툴허브'
const DESCRIPTION = '마이크를 허용한 뒤 바로 또는 3초·5초 준비 후 말하기를 녹음하세요. 준비 시간은 녹음에 포함하지 않습니다. 기본 점검·재녹음 비교·기기 기록 검색을 제공하며 생성형 코칭은 선택할 때만 다운로드합니다.'

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  keywords: '1분자기소개,말하기연습,업무보고,면접연습,한국어말하기,AI피드백,녹음비교',
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    url: 'https://toolhub.ai.kr/speaking-practice/', siteName: '툴허브', locale: 'ko_KR', type: 'website',
    images: [{ url: 'https://toolhub.ai.kr/og/speaking-practice.png', width: 1200, height: 630, alt: '1분 말하기 연습실' }],
  },
  twitter: { card: 'summary_large_image', title: TITLE, description: DESCRIPTION, images: ['https://toolhub.ai.kr/og/speaking-practice.png'] },
  alternates: { canonical: 'https://toolhub.ai.kr/speaking-practice/' },
}

export default function SpeakingPracticePage() {
  const jsonLd = { '@context': 'https://schema.org', '@type': 'WebApplication', name: '1분 말하기 연습실',
    description: DESCRIPTION, url: 'https://toolhub.ai.kr/speaking-practice/', applicationCategory: 'EducationalApplication',
    operatingSystem: 'Any', browserRequirements: 'JavaScript; microphone recording support; WebGPU only for optional generative coaching',
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'KRW' },
    featureList: ['한국어 자기소개·업무 보고 연습', '최대 90초 녹음과 파일 불러오기', 'Whisper tiny 기기 내 음성 인식', '시간·추임새 후보·반복 표현·구성 단서 기본 점검', '선택 다운로드 생성형 코칭', '첫 녹음과 재녹음 비교', '기기 내 기록 저장·텍스트와 음성 내보내기', '기록의 선택적 이름 40자', '이름·모든 녹음의 전사문 검색과 연습 모드 필터', '다른 탭 수정·삭제 충돌 안내와 현재 연습 보존', '마이크 허용 뒤 0·3·5초 녹음 준비', '준비 중 취소·이탈 시 자동 녹음 차단', '실제 녹음 시작부터 90초 상한'],
  }
  return <>
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
    <FaqJsonLd items={speakingPracticeMessages.speakingPractice.faq} />
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-12">
      <I18nWrapper><SpeakingPractice /><div className="mt-8"><RelatedTools /></div></I18nWrapper>
    </div>
  </>
}
