import { Metadata } from 'next'
import Crossword from '@/components/Crossword'
import I18nWrapper from '@/components/I18nWrapper'
import RelatedTools from '@/components/RelatedTools'
import ToolFaq from '@/components/ToolFaq'

export const metadata: Metadata = {
  title: '십자말풀이 - 한국어 퍼즐 | 툴허브',
  description: '매일 새로 나오는 오늘의 십자말풀이와 무제한 연습 퍼즐을 무료로 풀어 보세요. 가로·세로 힌트를 보고 한글 단어를 채우고, 막히면 글자·단어 검사와 정답 공개를 쓸 수 있어요. 진행 자동 저장, 연속 기록·통계, 결과 공유 지원.',
  keywords: '십자말풀이, 크로스워드, crossword, 한국어 퍼즐, 낱말풀이, 가로세로 퍼즐, 무료 게임, 온라인 게임, 단어 퍼즐',
  openGraph: {
    title: '십자말풀이 - 한국어 퍼즐 | 툴허브',
    description: '가로세로 힌트로 한글 단어를 채우는 십자말풀이! 매일 새로운 퍼즐.',
    url: 'https://toolhub.ai.kr/crossword',
    siteName: '툴허브',
    locale: 'ko_KR',
    type: 'website', images: [{ url: 'https://toolhub.ai.kr/og/crossword.png', width: 1200, height: 630, alt: '십자말풀이' }] },
  twitter: {
    card: 'summary_large_image',
    title: '십자말풀이 | 툴허브',
    description: '한국어 십자말풀이를 온라인에서 즐기세요!', images: ['https://toolhub.ai.kr/og/crossword.png'] },
  alternates: { canonical: 'https://toolhub.ai.kr/crossword/' },
}

const faq = [
  {
    q: '십자말풀이란 무엇인가요?',
    a: '십자말풀이(크로스워드 퍼즐)는 격자 모양의 칸에 가로와 세로 힌트를 보고 알맞은 단어를 채워 넣는 퍼즐 게임입니다. 각 칸에 한 글자씩 들어가며, 가로 단어와 세로 단어가 교차하는 칸의 글자가 서로 일치해야 합니다. 논리적 추론과 어휘력을 동시에 키울 수 있는 인기 있는 퍼즐입니다.',
  },
  {
    q: '십자말풀이 풀이 팁은?',
    a: '① 확실한 단어부터 채우세요. 힌트를 보고 바로 떠오르는 단어를 먼저 입력합니다. ② 교차하는 글자를 활용하세요. 가로 단어에서 채운 글자가 세로 단어의 힌트가 됩니다. ③ 글자 수를 확인하세요. 칸 수에 맞는 단어를 생각합니다. ④ 검사 기능을 활용해 틀린 글자를 확인할 수 있습니다.',
  },
  {
    q: '매일 새로운 퍼즐이 제공되나요?',
    a: '네, 매일 자정(한국 시간)에 번호가 붙은 새 오늘의 퍼즐이 나옵니다. 같은 날에는 누구나 같은 퍼즐을 풀기 때문에 "툴허브 십자말풀이 #번호 4분 12초 · 힌트 1회"처럼 결과를 공유해 친구와 기록을 비교할 수 있습니다. 지난 7일 퍼즐과 무제한 연습 퍼즐도 풀 수 있고, 연속 풀이 기록과 최고 기록이 브라우저에 저장됩니다.',
  },
]

export default function CrosswordPage() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'VideoGame',
    name: '십자말풀이 (한국어 크로스워드)',
    description: '가로세로 힌트로 한글 단어를 채우는 십자말풀이 퍼즐 게임. 매일 새 퍼즐 제공.',
    url: 'https://toolhub.ai.kr/crossword/',
    applicationCategory: 'GameApplication',
    operatingSystem: 'Any',
    browserRequirements: 'JavaScript',
    genre: 'Puzzle',
    gamePlatform: 'Web Browser',
    numberOfPlayers: '1',
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'KRW' },
    featureList: ['한국어 십자말풀이', '매일 새 오늘의 퍼즐', '결과 공유', '연속 기록·통계', '진행 자동 저장', '글자·단어 검사와 공개', '무제한 연습 퍼즐'],
  }


  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <div className="min-h-screen py-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
            <I18nWrapper>
              <Crossword />
              <ToolFaq items={faq} />
              <div className="mt-8">
                <RelatedTools />
              </div>
            </I18nWrapper>
        </div>
      </div>
      {/* SEO */}
      <section className="max-w-4xl mx-auto px-4 pb-12">
        <div className="mt-12 border-t border-line pt-8">
          <h2 className="text-xl font-bold text-fg mb-4">
            십자말풀이(크로스워드)란?
          </h2>
          <p className="text-body leading-relaxed mb-6">
            십자말풀이(크로스워드 퍼즐, Crossword Puzzle)는 격자 모양의 칸에 가로와 세로 힌트를 보고 알맞은 단어를 채워 넣는 대표적인 단어 퍼즐 게임입니다.
            영어권에서 1913년 처음 등장한 이래 전 세계적으로 사랑받고 있으며, 한국어 십자말풀이는 한글의 특성을 살려 음절 단위로 칸을 채우는 것이 특징입니다.
            어휘력, 상식, 논리적 추론 능력을 동시에 키울 수 있어 남녀노소 누구나 즐길 수 있습니다.
          </p>
          <h3 className="text-lg font-semibold text-fg mb-3">
            십자말풀이 풀이 전략
          </h3>
          <ul className="list-disc list-inside space-y-2 text-body">
            <li><strong>쉬운 힌트부터:</strong> 확실히 알고 있는 단어를 먼저 채우면 교차하는 다른 단어의 글자를 알 수 있습니다.</li>
            <li><strong>교차점 활용:</strong> 가로와 세로 단어가 만나는 교차점의 글자가 일치해야 하므로, 한쪽을 채우면 다른 쪽의 힌트가 됩니다.</li>
            <li><strong>글자 수 확인:</strong> 빈칸 수와 힌트를 조합하면 후보 단어를 좁힐 수 있습니다.</li>
            <li><strong>검사 기능:</strong> 막힐 때는 글자·단어·전체 검사로 틀린 글자를 확인할 수 있습니다. 검사와 공개는 힌트 횟수로 기록됩니다.</li>
            <li><strong>이어 풀기:</strong> 진행 상황은 자동 저장되니, 다 못 풀었다면 나중에 같은 기기에서 이어서 풀면 됩니다.</li>
            <li><strong>놓친 퍼즐:</strong> 지난 7일 동안의 오늘의 퍼즐은 다시 풀 수 있고, 더 풀고 싶다면 무제한 연습 퍼즐을 이용하세요.</li>
          </ul>
          <h3 className="text-lg font-semibold text-fg mt-6 mb-3">
            오늘의 십자말풀이 푸는 법
          </h3>
          <ol className="list-decimal list-inside space-y-2 text-body">
            <li>매일 자정(한국 시간)에 번호가 붙은 오늘의 퍼즐이 나옵니다. 같은 날에는 모두 같은 퍼즐을 풀어 기록을 비교할 수 있습니다.</li>
            <li>칸을 누르고 한글로 입력합니다. 한 글자를 끝내면 다음 칸으로 넘어가고, 영문 자판이면 한/영 키로 바꾸라는 안내가 나옵니다.</li>
            <li>같은 칸을 다시 누르거나 Space를 누르면 가로·세로가 바뀌고, Tab은 다음 단어, 화살표는 칸 이동입니다.</li>
            <li>막히면 글자·단어·전체 검사나 글자·단어 공개를 씁니다. 한 번 쓸 때마다 힌트 1회로 기록됩니다.</li>
            <li>완성하면 걸린 시간과 힌트 횟수가 담긴 결과를 이미지나 문구로 공유할 수 있고, 푼 퍼즐 수·연속 기록·최고 기록은 이 기기 브라우저에 쌓입니다.</li>
          </ol>
        </div>
      </section>
    </>
  )
}
