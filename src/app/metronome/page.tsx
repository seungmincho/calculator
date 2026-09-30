import { Metadata } from 'next'
import Metronome from '@/components/Metronome'
import I18nWrapper from '@/components/I18nWrapper'
import RelatedTools from '@/components/RelatedTools'

export const metadata: Metadata = {
  title: '메트로놈 - BPM 박자기, 탭 템포, 진동 | 툴허브',
  description: '정확한 온라인 메트로놈. BPM 20~300, 박자표(4/4·6/8·7/8·직접 입력), 8분·셋잇단·16분·스윙, 박별 강박/음소거, 탭 템포, 스피드 트레이너, 카운트인, 랜덤 음소거 연습.',
  keywords: '메트로놈, 온라인 메트로놈, BPM, 박자기, 탭 템포, 스피드 트레이너, 드럼 메트로놈, 기타 연습, 피아노 연습, metronome, 박자 맞추기',
  openGraph: {
    title: '메트로놈 | 툴허브',
    description: '온라인 메트로놈. BPM 조절, 박자표, 탭 템포, 진동 지원.',
    url: 'https://toolhub.ai.kr/metronome',
    siteName: '툴허브',
    locale: 'ko_KR',
    type: 'website',
    images: [{ url: 'https://toolhub.ai.kr/og/metronome.png', width: 1200, height: 630, alt: '메트로놈' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: '메트로놈 | 툴허브',
    description: 'BPM 박자기, 탭 템포, 모바일 진동 지원 메트로놈',
    images: ['https://toolhub.ai.kr/og/metronome.png'],
  },
  alternates: {
    canonical: 'https://toolhub.ai.kr/metronome/',
  },
}

const faqData = [
  {
    question: '메트로놈이란 무엇인가요?',
    answer: '메트로놈은 일정한 간격으로 소리를 내어 음악의 템포(빠르기)를 알려주는 도구입니다. BPM(Beats Per Minute)으로 1분에 몇 번 박자를 치는지를 설정합니다. 이 메트로놈은 20~300 BPM을 지원하며, 박자표·세분·박별 강박을 자유롭게 바꿀 수 있습니다.',
  },
  {
    question: '온라인 메트로놈 박자가 정확한가요?',
    answer: '클릭음을 Web Audio 오디오 시계에 미리 예약하는 방식(lookahead 스케줄러)이라 화면이 버벅여도 소리 간격은 샘플 단위로 일정합니다. 재생 중에는 화면 꺼짐 방지(Wake Lock)를 요청합니다. 다만 브라우저가 백그라운드 탭을 강하게 제한하면 템포 변경 반영이 늦어질 수 있습니다.',
  },
  {
    question: '탭 템포 기능은 어떻게 사용하나요?',
    answer: '탭 템포 버튼(또는 키보드 T)을 곡에 맞춰 반복해서 누르면 최근 8번의 간격 평균으로 BPM을 계산합니다. 2초 이상 쉬면 새로 측정합니다.',
  },
  {
    question: '스피드 트레이너는 어떻게 쓰나요?',
    answer: '시작 BPM, 목표 BPM, 증가 폭, 몇 마디마다 올릴지를 정하면 재생 중 자동으로 템포가 올라갑니다. 예: 80 → 120 BPM, 4마디마다 +5. 목표에 도달하면 그 속도를 유지합니다.',
  },
  {
    question: '6/8박자에서 BPM은 무엇을 기준으로 하나요?',
    answer: 'BPM은 박자표 아래 숫자의 음표 기준입니다. 6/8이면 8분음표 한 개가 한 클릭이며, 1·4박에 강박이 들어갑니다. 점4분음표 = 60으로 연습하려면 BPM을 180으로 설정하세요.',
  },
]

export default function MetronomePage() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: '메트로놈',
    description: '온라인 메트로놈 - BPM 박자기, 탭 템포, 스피드 트레이너, 박별 강박',
    url: 'https://toolhub.ai.kr/metronome',
    applicationCategory: 'UtilityApplication',
    operatingSystem: 'Any',
    browserRequirements: 'JavaScript, Web Audio API',
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'KRW' },
    featureList: [
      'BPM 20~300 조절 (±1, ±5, 슬라이더, 키보드)',
      '박자표 2/4·3/4·4/4·5/4·6/8·7/8·12/8·직접 입력',
      '8분·셋잇단·16분·스윙 세분',
      '박별 강박·보통·음소거 설정',
      '클릭·우드블록·비프 음색, 볼륨',
      '탭 템포 (최근 탭 평균)',
      '스피드 트레이너·카운트인·랜덤 음소거·자동 정지',
      '화면 깜빡임·모바일 진동',
      '설정 링크 공유',
    ],
  }

  const faqJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqData.map(faq => ({
      '@type': 'Question',
      name: faq.question,
      acceptedAnswer: { '@type': 'Answer', text: faq.answer },
    })),
  }

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />
      <div className="min-h-screen py-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
            <I18nWrapper>
              <Metronome />
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
              온라인 메트로놈이란?
            </h2>
            <p className="text-body leading-relaxed mb-6">
              온라인 메트로놈은 악기 연습, 노래 연습, 작곡 시 정확한 박자를 유지할 수 있도록 일정한 간격으로 클릭음을 내주는 도구입니다. BPM(분당 박자수) 20~300 범위를 지원하며, 2/4부터 7/8·12/8과 직접 입력 박자표, 8분·셋잇단·16분·스윙 세분, 박마다 강박·음소거 설정, 탭 템포, 스피드 트레이너, 카운트인, 랜덤 음소거(내부 박자감 훈련)까지 제공합니다. 설치 없이 브라우저에서 바로 사용할 수 있어 편리합니다.
            </p>
            <h3 className="text-lg font-semibold text-fg mb-3">
              메트로놈 활용 팁
            </h3>
            <ul className="list-disc list-inside space-y-2 text-body">
              <li><strong>느린 BPM으로 시작:</strong> 새 곡을 배울 때는 목표 BPM의 60~70%로 시작해 정확성을 익힌 후 점진적으로 속도를 높이세요.</li>
              <li><strong>탭 템포 활용:</strong> 즐겨 듣는 노래의 BPM을 모를 때 탭 버튼을 박자에 맞춰 두드리면 자동으로 BPM이 측정됩니다.</li>
              <li><strong>박자표 변경:</strong> 왈츠는 3/4, 록은 4/4, 6/8은 빠른 셋잇단음표 느낌으로 장르에 맞는 박자표를 선택하세요.</li>
              <li><strong>스피드 트레이너:</strong> 어려운 구간은 목표의 70% 속도에서 시작해 4마디마다 +2~5 BPM씩 자동으로 올리면 무리 없이 속도가 붙습니다.</li>
              <li><strong>랜덤 음소거:</strong> 일부 마디의 소리를 끄고 속으로 박을 유지하는 연습입니다. 소리가 다시 나올 때 내 박이 맞았는지 확인하세요.</li>
              <li><strong>2·4박 강조:</strong> 재즈·팝 그루브는 1·3박을 음소거하고 2·4박만 들리게 하면 백비트 감각을 익힐 수 있습니다.</li>
            </ul>
          </div>
        </section>
    </>
  )
}
