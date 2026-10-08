import { Metadata } from 'next'
import MorseCode from '@/components/MorseCode'
import I18nWrapper from '@/components/I18nWrapper'
import RelatedTools from '@/components/RelatedTools'
import { FaqJsonLd } from '@/components/ToolFaq'
import morseCodeMessages from '../../../messages/generated/ko/ns/morseCode.json'

export const metadata: Metadata = {
  title: '모스부호 변환기 - 텍스트↔모스부호 변환 | 툴허브',
  description: '모스부호 변환기 - 텍스트를 모스부호로, 모스부호를 텍스트로 변환합니다. 소리 재생, 모스부호 표 제공.',
  keywords: '모스부호 변환기, morse code converter, 모스부호 변환, 모스코드, SOS 모스부호',
  openGraph: { title: '모스부호 변환기 | 툴허브', description: '텍스트↔모스부호 변환', url: 'https://toolhub.ai.kr/morse-code/', siteName: '툴허브', locale: 'ko_KR', type: 'website', images: [{ url: 'https://toolhub.ai.kr/og/morse-code.png', width: 1200, height: 630, alt: '모스부호 변환기' }] },
  twitter: { card: 'summary_large_image', title: '모스부호 변환기 | 툴허브', description: '텍스트↔모스부호 변환', images: ['https://toolhub.ai.kr/og/morse-code.png'] },
  alternates: { canonical: 'https://toolhub.ai.kr/morse-code/' },
}

export default function MorseCodePage() {
  const jsonLd = { '@context': 'https://schema.org', '@type': 'WebApplication', name: '모스부호 변환기', description: '텍스트↔모스부호 변환', url: 'https://toolhub.ai.kr/morse-code/', applicationCategory: 'UtilityApplication', operatingSystem: 'Any', browserRequirements: 'JavaScript', offers: { '@type': 'Offer', price: '0', priceCurrency: 'KRW' }, featureList: ['영문·한글(SKATS) 모스부호 변환', '소리 재생·WPM·Farnsworth 속도 조절', 'WAV 다운로드', '탭 키 입력', '코흐 방식 듣기 연습', '모스부호 표', 'SOS'] }
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <FaqJsonLd items={morseCodeMessages.morseCode.guide.faq.items} />
      <div className="min-h-screen py-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <I18nWrapper><MorseCode />  <div className="mt-8">
    <RelatedTools />
  </div>
</I18nWrapper>
        </div>
      </div>
      {/* SEO 콘텐츠 */}
      <section className="max-w-4xl mx-auto px-4 pb-12">
        <div className="mt-12 border-t border-line pt-8">
          <h2 className="text-xl font-bold text-fg mb-4">
            모스부호 변환기란?
          </h2>
          <p className="text-body leading-relaxed mb-6">
            모스부호 변환기는 영문·한글 텍스트를 모스부호(·과 -)로 변환하거나, 모스부호를 다시 텍스트로 해독하는 무료 온라인 도구입니다. 소리 재생 기능을 통해 실제 전신 신호음을 들을 수 있으며, SOS를 비롯한 국제 표준 모스 알파벳 표를 함께 제공합니다. 아마추어 무선 통신(햄 라디오), 교육, 퀴즈 풀이, 비밀 메시지 작성에 유용하게 활용할 수 있습니다.
          </p>
          <h3 className="text-lg font-semibold text-fg mb-3">
            모스부호 변환기 활용 팁
          </h3>
          <ul className="list-disc list-inside space-y-2 text-body">
            <li><strong>SOS 신호 학습:</strong> ···---···(SOS)는 국제 조난 신호로, 손전등이나 소리로 반복하면 구조 요청에 사용할 수 있습니다.</li>
            <li><strong>소리 재생 기능:</strong> 변환된 모스부호를 재생하여 실제 전신 신호음으로 듣고, 청각적으로 모스부호를 익힐 수 있습니다.</li>
            <li><strong>모스 알파벳 표 참고:</strong> A(·-)부터 Z(--..)까지 26개 알파벳과 0~9 숫자, 한글 자음·모음(SKATS)의 모스부호를 표에서 확인하고 눌러서 소리로 들을 수 있습니다.</li>
            <li><strong>비밀 메시지 작성:</strong> 텍스트를 모스부호로 변환해 암호 메시지처럼 활용하거나, 모스부호 입력란에 직접 타이핑해 해독할 수 있습니다.</li>
          </ul>
        </div>
      </section>
    </>
  )
}
