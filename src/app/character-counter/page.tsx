import type { Metadata } from 'next'
import I18nWrapper from '@/components/I18nWrapper'
import CharacterCounter from '@/components/CharacterCounter'
import RelatedTools from '@/components/RelatedTools'
import ToolFaq from '@/components/ToolFaq'
import characterMessages from '../../../messages/generated/ko/ns/characterCounter.json'

const TITLE = "글자수 세기 - 원고 보호·복사 복구·바이트 계산 | 툴허브"
const DESCRIPTION = "공백 포함·제외 글자수와 바이트·목표 진행률을 확인하세요. 5개 문항 초안과 수정본·JSON 백업·줄 비교를 유지하며, 초기 복원과 늦은 작업의 원고 보호·복사 실패 복구·현재 작업 되돌리기를 제공합니다."

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  keywords: '글자수세기, 글자수카운터, 단어수세기, 문자수세기, 텍스트분석, SNS글자수, 트위터글자수',
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    type: 'website',
    siteName: '툴허브',
    url: 'https://toolhub.ai.kr/character-counter/',
    locale: 'ko_KR',
    images: [{ url: 'https://toolhub.ai.kr/og/character-counter.png', width: 1200, height: 630, alt: '글자수 세기' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: TITLE,
    description: DESCRIPTION,
    images: ['https://toolhub.ai.kr/og/character-counter.png'],
  },
  alternates: {
    canonical: 'https://toolhub.ai.kr/character-counter/',
  },
}

export default function CharacterCounterPage() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: '글자수 세기',
    description: DESCRIPTION,
    url: 'https://toolhub.ai.kr/character-counter/',
    applicationCategory: 'UtilityApplication',
    operatingSystem: 'Any',
    browserRequirements: 'JavaScript',
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'KRW' },
    featureList: ['공백 포함/제외 글자수', '잡코리아·사람인 방식 바이트(한글 2byte)', 'UTF-8 바이트', '목표 글자수 진행률', '자소서 문항 5개 자동 저장', '원고지 매수', 'X(트위터) 가중 글자수', '자주 쓴 단어 분석', '공백·줄바꿈 정리', '수정본 기기 저장·본문 비교·복원', '수정본 JSON 백업·선택 가져오기', '저장본과 현재 글을 새 탭의 줄 비교로 전달', '현재 문항의 유효한 작업 되돌리기', '복사 실패 원문 선택·재시도', '초기 복원 중 편집과 늦은 전체 초기화의 원고 보호']
  }

  const faq = characterMessages.characterCounter.guide.faq.items

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <I18nWrapper>
        <CharacterCounter />
        <ToolFaq items={faq} />
        <div className="mt-8">

          <RelatedTools />

        </div>

      </I18nWrapper>
      {/* SEO 콘텐츠 */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pb-12">
        <div className="mt-12 border-t border-line pt-8">
          <h2 className="text-xl font-bold text-fg mb-4">
            글자수 세기란?
          </h2>
          <p className="text-body leading-relaxed mb-6">
            글자수 세기 도구는 <strong>공백 포함·제외 글자수, 바이트, 단어·문장·문단 수, 원고지 매수를 실시간으로 분석</strong>하는 무료 온라인 카운터입니다. 자기소개서 문항별 목표 글자수, 대학 리포트, 공모전 응모, SNS 게시글처럼 글자수 제한이 있는 글에 쓸 수 있습니다. 이모지 조합이나 결합 문자도 화면에 보이는 한 글자로 세며, 입력한 글은 서버로 자동 전송하지 않고 이 브라우저에 초안 저장을 시도합니다. 저장소 오류나 닫기 직전 저장까지 보장하지 않으므로 필요한 원고는 백업이나 별도 파일로 보관하세요.
          </p>
          <h3 className="text-lg font-semibold text-fg mb-3">
            글자수 세기 활용 팁
          </h3>
          <ul className="list-disc list-inside space-y-2 text-body">
            <li><strong>자소서 바이트:</strong> 잡코리아·사람인 방식은 한글 2byte, 영문·숫자·공백·줄바꿈 1byte입니다. 1,000byte 제한이면 한글 약 500자입니다.</li>
            <li><strong>공백 포함/제외 확인:</strong> 기업마다 기준이 다르니 지원서 안내 문구를 먼저 확인하고 목표 기준을 맞춰 두세요.</li>
            <li><strong>SNS 제한 확인:</strong> X(트위터)는 280 가중치(한글 1자 = 2, 한글만 140자), 인스타그램 캡션은 2,200자, 유튜브 제목은 100자입니다.</li>
            <li><strong>원고지 매수:</strong> 200자 원고지(20칸×10줄) 기준으로 문단 들여쓰기와 영문 소문자·숫자 2자 1칸 규칙을 반영한 간이 계산입니다.</li>
            <li><strong>원고와 복사 보호:</strong> 현재 문항의 새 편집 뒤 옛 정리 작업을 되돌리지 않으며, 복사 실패는 전체 원문 선택·재시도로 확인하세요. 전체 초기화는 자동 초안만 지우고 저장한 수정본은 유지합니다.</li>
            <li><strong>반복 표현 줄이기:</strong> 자주 쓴 단어를 눌러 본문에서 강조해 보고, 같은 표현이 몰린 곳을 다른 말로 바꿔 보세요.</li>
          </ul>
        </div>
      </section>
    </>
  )
}
