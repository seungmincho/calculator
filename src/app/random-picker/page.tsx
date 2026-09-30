import { Metadata } from 'next'
import Link from 'next/link'
import DecisionToolsBar from '@/components/DecisionToolsBar'
import RandomPicker from '@/components/RandomPicker'
import I18nWrapper from '@/components/I18nWrapper'
import RelatedTools from '@/components/RelatedTools'

const TITLE = '랜덤 뽑기 - 경품 추첨기, 당첨자 뽑기, 공정성 검증 | 툴허브'
const DESC = '명단을 붙여넣고 당첨자를 중복 없이 뽑으세요. 추첨권 가중치, 이전 당첨자 제외, 두근두근 공개 연출, 라이브 발표 모드, 시드로 누구나 결과를 재현하는 검증 링크까지. 단톡방·방송 경품 추첨용 무료 추첨기.'

export const metadata: Metadata = {
  title: TITLE,
  description: DESC,
  keywords: '랜덤 뽑기, 경품 추첨, 당첨자 뽑기, 추첨기, 온라인 추첨, 이벤트 추첨, 제비뽑기, 라이브 추첨, 공정한 추첨, random picker',
  openGraph: {
    title: '랜덤 뽑기 - 경품 추첨기 | 툴허브',
    description: '명단 붙여넣고 당첨자 뽑기. 시드 검증 링크로 누구나 결과 확인',
    url: 'https://toolhub.ai.kr/random-picker',
    siteName: '툴허브',
    locale: 'ko_KR',
    type: 'website',
    images: [{ url: 'https://toolhub.ai.kr/og/random-picker.png', width: 1200, height: 630, alt: '랜덤 뽑기' }],
  },
  twitter: { card: 'summary_large_image', title: '랜덤 뽑기 - 경품 추첨기 | 툴허브', description: '명단 붙여넣고 당첨자 뽑기, 검증 링크 공유', images: ['https://toolhub.ai.kr/og/random-picker.png'] },
  alternates: { canonical: 'https://toolhub.ai.kr/random-picker/' },
}

const FAQ = [
  {
    q: '추첨 결과를 조작하지 않았다는 걸 어떻게 증명하나요?',
    a: '추첨마다 시드(난수 씨앗)와 시각이 기록되고, 결과 링크에 명단·당첨 인원·시드가 담깁니다. 링크를 연 사람의 기기에서 같은 계산을 다시 해 같은 당첨자가 나오는지 확인할 수 있습니다. 시드를 추첨 전에 미리 공지해 두면 주최자가 원하는 결과가 나올 때까지 다시 뽑는 것도 막을 수 있습니다.',
  },
  {
    q: '같은 사람이 두 번 당첨될 수 있나요?',
    a: '아니요. 한 번의 추첨에서 같은 이름은 한 번만 당첨됩니다. 여러 라운드를 진행할 때 "이전 당첨자 제외"를 켜 두면 앞 라운드 당첨자도 빠집니다.',
  },
  {
    q: '댓글을 여러 번 단 사람에게 기회를 더 주고 싶어요.',
    a: '"홍길동 x3"처럼 이름 뒤에 x숫자를 붙이면 추첨권 3장으로 계산됩니다. 중복 제거를 끄고 같은 이름을 여러 줄 넣어도 줄 수만큼 기회가 늘어납니다.',
  },
  {
    q: '시드를 쓰면 덜 무작위인가요?',
    a: '시드를 비워 두면 브라우저의 암호학적 난수(crypto.getRandomValues)로 새 시드를 만듭니다. 시드는 결과를 다시 계산할 수 있게 해 줄 뿐, 미리 알 수 없는 값이면 결과도 미리 알 수 없습니다.',
  },
]

export default function RandomPickerPage() {
  const jsonLd = {
    '@context': 'https://schema.org', '@type': 'WebApplication',
    name: '랜덤 뽑기 - 경품 추첨기', description: DESC,
    url: 'https://toolhub.ai.kr/random-picker', applicationCategory: 'UtilityApplication',
    operatingSystem: 'Any', browserRequirements: 'JavaScript',
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'KRW' },
    featureList: ['명단 붙여넣기(줄바꿈·쉼표)', '중복 없는 당첨자 N명 추첨', '추첨권 가중치', '이전 당첨자 제외', '시드 기반 재현·검증 링크', '라이브 발표 모드', '당첨 공지 복사·결과 카드 이미지'],
  }
  const faqJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: FAQ.map((f) => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })),
  }
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />
      <div className="min-h-screen py-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <I18nWrapper>
            <div className="mb-6"><DecisionToolsBar current="/random-picker" /></div>
            <RandomPicker />
            <div className="mt-8"><RelatedTools /></div>
          </I18nWrapper>
        </div>
      </div>
      {/* SEO 콘텐츠 */}
      <section className="max-w-4xl mx-auto px-4 pb-12">
        <div className="mt-12 border-t border-line pt-8">
          <h2 className="text-xl font-bold text-fg mb-4">온라인 경품 추첨, 이렇게 하면 뒷말이 없습니다</h2>
          <p className="text-body leading-relaxed mb-6">
            댓글 이벤트, 단톡방 경품, 방송 시청자 추첨처럼 여러 명 중 당첨자를 골라야 할 때 쓰는 추첨기입니다. 참가자 명단을 복사해 붙여넣고 당첨 인원만 정하면 중복 없이 당첨자를 뽑고, 공지용 문구와 결과 이미지를 바로 만들어 줍니다.
          </p>
          <h3 className="text-lg font-semibold text-fg mb-3">공정한 추첨을 위한 팁</h3>
          <ul className="list-disc list-inside space-y-2 text-body mb-6">
            <li><strong>명단 먼저 공개:</strong> 추첨 전에 참가자 명단을 단톡방이나 게시글에 올려 두면 누락·추가 논란이 없습니다.</li>
            <li><strong>시드 미리 공지:</strong> &quot;오늘 추첨 시드는 20261001&quot;처럼 미리 알려 두고 그 시드로 뽑으면, 주최자도 결과를 고를 수 없다는 게 증명됩니다.</li>
            <li><strong>검증 링크 공유:</strong> 결과와 함께 링크를 올리면 누구나 같은 명단·시드로 결과를 다시 계산해 볼 수 있습니다.</li>
            <li><strong>여러 상품은 라운드로:</strong> 1등부터 차례로 라운드를 나눠 뽑고 &quot;이전 당첨자 제외&quot;를 켜 두면 한 사람이 상품을 두 번 받지 않습니다.</li>
          </ul>
          <p className="text-body leading-relaxed">
            숫자 범위에서 뽑으려면 <Link href="/random-number/" className="text-primary underline">숫자 뽑기</Link>, 조를 짜려면 <Link href="/team-divider/" className="text-primary underline">팀 나누기</Link>, 화면에서 돌리는 연출이 필요하면 <Link href="/roulette/" className="text-primary underline">돌림판</Link>을 쓰세요.
          </p>
        </div>
      </section>
    </>
  )
}
