import { Metadata } from 'next'
import TextToSpeech from '@/components/TextToSpeech'
import I18nWrapper from '@/components/I18nWrapper'
import RelatedTools from '@/components/RelatedTools'

export const metadata: Metadata = {
  title: '텍스트 읽어주기 (TTS) - 긴 글 한국어 음성 | 툴허브',
  description: '텍스트 읽어주기 - 한국어 긴 글도 문장 단위로 끊김 없이 읽어줍니다. 읽는 문장 하이라이트, 문장 클릭 재생, 느리게 학습 속도, 링크 공유. 설치·가입 없이 무료.',
  keywords: '텍스트 읽어주기, TTS, 한국어 TTS, text to speech, 음성 변환, 텍스트 음성, 글 읽어주는 사이트, 나레이션',
  openGraph: { title: '텍스트 읽어주기 (TTS) | 툴허브', description: '텍스트를 음성으로 변환', url: 'https://toolhub.ai.kr/text-to-speech', siteName: '툴허브', locale: 'ko_KR', type: 'website', images: [{ url: 'https://toolhub.ai.kr/og/text-to-speech.png', width: 1200, height: 630, alt: '텍스트 읽어주기 (TTS)' }] },
  twitter: { card: 'summary_large_image', title: '텍스트 읽어주기 | 툴허브', description: '텍스트를 음성으로 변환', images: ['https://toolhub.ai.kr/og/text-to-speech.png'] },
  alternates: { canonical: 'https://toolhub.ai.kr/text-to-speech/' },
}

export default function TextToSpeechPage() {
  const jsonLd = { '@context': 'https://schema.org', '@type': 'WebApplication', name: '텍스트 읽어주기 (TTS)', description: '텍스트를 음성으로 변환', url: 'https://toolhub.ai.kr/text-to-speech', applicationCategory: 'UtilityApplication', operatingSystem: 'Any', browserRequirements: 'JavaScript', offers: { '@type': 'Offer', price: '0', priceCurrency: 'KRW' }, featureList: ['긴 글 문장 단위 연속 재생', '읽는 문장·단어 하이라이트', '문장 클릭 재생', '속도 프리셋(학습 0.8배)', '한국어 음성 우선·선택 기억', '단축키(Space/Esc)', '링크 공유'] }
  const faqJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
      {
        '@type': 'Question',
        name: 'TTS(Text-to-Speech)란 무엇인가요?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'TTS(텍스트 음성 변환)는 텍스트를 사람의 음성으로 변환하는 기술입니다. 웹 브라우저의 Web Speech API를 사용하여 별도 설치 없이 브라우저에서 바로 사용할 수 있습니다. 활용 분야: ① 시각 장애인 접근성 ② 외국어 발음 확인 ③ 문서 청취(오디오북) ④ 프레젠테이션 음성 ⑤ 콘텐츠 제작. 한국어, 영어, 일본어 등 다국어를 지원하며 속도와 음높이를 조절할 수 있습니다.',
        },
      },
      {
        '@type': 'Question',
        name: '긴 글도 끊기지 않고 읽나요?',
        acceptedAnswer: { '@type': 'Answer', text: '글을 문장 단위(최대 140자)로 나눠 차례로 읽기 때문에 Chrome에서 약 15초 넘는 음성이 끊기는 문제를 피합니다. 읽는 문장이 강조되고, 문장을 누르면 그 문장부터 다시 읽습니다.' },
      },
      {
        '@type': 'Question',
        name: 'MP3 파일로 저장할 수 있나요?',
        acceptedAnswer: { '@type': 'Answer', text: '브라우저 음성 합성은 소리를 스피커로 바로 내보내므로 웹페이지에서 파일로 저장할 수 없습니다. 필요하면 화면 녹화(Windows Win+Alt+R, 스마트폰 화면 녹화)로 소리와 함께 녹음하세요.' },
      },
    ],
  }
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />
      <div className="min-h-screen py-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <I18nWrapper>
            <TextToSpeech />
            <div className="mt-8">
              <RelatedTools />
            </div>
          </I18nWrapper>
        </div>
      </div>
      {/* SEO 콘텐츠 */}
      <section className="max-w-4xl mx-auto px-4 pb-12">
        <div className="mt-12 border-t border-line pt-8">
          <h2 className="text-xl font-bold text-fg mb-4">
            텍스트 읽어주기(TTS)란?
          </h2>
          <p className="text-body leading-relaxed mb-6">
            텍스트 읽어주기(TTS, Text-to-Speech)는 입력한 텍스트를 브라우저의 Web Speech API를 이용해 음성으로 변환해 주는 무료 온라인 도구입니다. 한국어, 영어, 일본어 등 다국어를 지원하며 읽기 속도와 음높이(피치)를 조절할 수 있어 외국어 발음 확인, 문서 청취, 접근성 개선, 콘텐츠 제작 등 다양한 용도로 활용할 수 있습니다.
          </p>
          <h3 className="text-lg font-semibold text-fg mb-3">
            텍스트 읽어주기 활용 팁
          </h3>
          <ul className="list-disc list-inside space-y-2 text-body">
            <li><strong>외국어 발음 확인:</strong> 영어나 일본어 텍스트를 붙여넣고 원어민 음성으로 발음을 들어보면 언어 학습 효과를 높일 수 있습니다.</li>
            <li><strong>문서 청취(오디오북):</strong> 긴 글이나 보고서를 음성으로 들으면 눈의 피로를 줄이면서도 내용을 파악할 수 있어 멀티태스킹이 가능합니다.</li>
            <li><strong>속도 조절 활용:</strong> 발음 학습 시에는 '느리게(0.8배)'로 천천히, 문서를 빠르게 청취할 때는 1.5~2배속으로 설정하면 효율적입니다.</li>
            <li><strong>발표·나레이션 원고 점검:</strong> 원고를 넣고 예상 재생 시간과 문장 길이를 확인하면 말하기 어려운 긴 문장을 미리 고칠 수 있습니다.</li>
            <li><strong>접근성 활용:</strong> 시각적 불편이 있거나 읽기가 어려운 분들을 위해 웹 콘텐츠를 음성으로 전달할 때 TTS 기능을 활용하면 접근성이 크게 향상됩니다.</li>
          </ul>
        </div>
      </section>
    </>
  )
}
