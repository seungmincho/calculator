import { Metadata } from 'next'
import TypingTest from '@/components/TypingTest'
import I18nWrapper from '@/components/I18nWrapper'
import RelatedTools from '@/components/RelatedTools'

export const metadata: Metadata = {
  title: '타자 연습 - 한글 타수·영문 WPM 측정, 오늘의 문장 | 툴허브',
  description: '한글 타자 속도를 한컴타자 방식(자모 타수, 타/분)으로 정확히 측정하세요. 오늘의 문장 매일 도전, 짧은 글·긴 글·30초/60초 시간제, 영문 WPM, 정확도와 자주 틀린 자모, 등급, 기록 그래프, 결과 공유까지.',
  keywords: '타자 연습, 타자 속도 측정, 한글 타수, 타자 테스트, 타이핑 테스트, 영타 연습, WPM 측정, 오늘의 문장, 타자 급수',
  openGraph: { title: '타자 연습 - 오늘의 문장 | 툴허브', description: '한글 타수(타/분)·영문 WPM 측정, 매일 오늘의 문장 도전', url: 'https://toolhub.ai.kr/typing-test', siteName: '툴허브', locale: 'ko_KR', type: 'website', images: [{ url: 'https://toolhub.ai.kr/og/typing-test.png', width: 1200, height: 630, alt: '타자 연습' }] },
  twitter: { card: 'summary_large_image', title: '타자 연습 | 툴허브', description: '한글 타수·영문 WPM 측정, 오늘의 문장', images: ['https://toolhub.ai.kr/og/typing-test.png'] },
  alternates: { canonical: 'https://toolhub.ai.kr/typing-test/' },
}

const FAQ = [
  ['한글 타수는 어떻게 계산하나요?', '자판을 누른 횟수(자모 수)를 1분 기준으로 환산합니다. 닭은 ㄷ·ㅏ·ㄹ·ㄱ 4타, 과는 ㄱ·ㅗ·ㅏ 3타이며, 쌍자음(ㄲ·ㄸ·ㅃ·ㅆ·ㅉ)과 ㅒ·ㅖ는 Shift를 세지 않고 1타로 셉니다. 한컴타자연습과 같은 방식입니다.'],
  ['평균 타자 속도는?', '일반 성인 평균은 분당 200~300타(한글)이며 사무직은 300~400타 이상이면 빠른 편입니다. 영문은 평균 40WPM, 빠른 타자는 80WPM 이상입니다.'],
  ['오늘의 문장은 무엇인가요?', '한국 시간 자정마다 바뀌는 문장으로, 모든 사람이 같은 문장에 도전합니다. 하루 동안 여러 번 도전할 수 있고 가장 좋은 기록이 오늘의 최고 기록으로 남습니다.'],
  ['정확도는 어떻게 계산되나요?', '입력한 글자 중 한 번이라도 틀린 글자의 비율을 뺀 값입니다. 틀린 뒤 지우고 고쳐도 오타로 기록되어, 실제 실력에 가까운 정확도를 보여 줍니다.'],
]

export default function TypingTestPage() {
  const jsonLd = { '@context': 'https://schema.org', '@type': 'WebApplication', name: '타자 연습', description: '한글 타수(타/분)·영문 WPM 측정, 오늘의 문장, 시간제 연습', url: 'https://toolhub.ai.kr/typing-test', applicationCategory: 'UtilityApplication', operatingSystem: 'Any', browserRequirements: 'JavaScript', offers: { '@type': 'Offer', price: '0', priceCurrency: 'KRW' }, featureList: ['한글 자모 타수 측정', '오늘의 문장', '30초/60초 시간제', '영문 WPM', '자주 틀린 자모 분석', '기록 그래프', '결과 공유'] }
  const faqJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: FAQ.map(([q, a]) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: a } })),
  }
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />
      <div className="min-h-screen py-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <I18nWrapper>
            <TypingTest />
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
            타자 연습, 이렇게 측정합니다
          </h2>
          <p className="text-body leading-relaxed mb-6">
            한글 타수는 글자 수가 아니라 자판을 누른 횟수(자모)로 셉니다. 닭은 ㄷ·ㅏ·ㄹ·ㄱ 4타, 과는 ㄱ·ㅗ·ㅏ 3타이고, 쌍자음은 Shift를 빼고 1타로 셉니다. 입력 중인 글자(조합 중)는 틀림으로 표시하지 않으므로 한글 입력기에서도 정확하게 채점됩니다. 매일 바뀌는 오늘의 문장에 도전하고, 30초·60초 시간제로 실전 속도를 재 보세요. 영문은 5글자를 1단어로 보는 WPM으로 측정합니다.
          </p>
          <h3 className="text-lg font-semibold text-fg mb-3">
            타이핑 속도 향상 팁
          </h3>
          <ul className="list-disc list-inside space-y-2 text-body">
            <li><strong>올바른 자세:</strong> 허리를 곧게 펴고 손목을 낮게 유지하며 타이핑해야 장시간 사용 시 부담이 줄어듭니다.</li>
            <li><strong>터치타이핑 연습:</strong> 키보드를 보지 않고 손가락 위치만으로 타이핑하는 습관을 들이면 장기적으로 속도가 크게 향상됩니다.</li>
            <li><strong>정확도 우선:</strong> 처음에는 속도보다 정확도에 집중하세요. 실수 없이 치는 습관이 들면 속도는 자연스럽게 따라옵니다.</li>
            <li><strong>매일 꾸준히:</strong> 하루 10~15분씩 매일 연습하는 것이 한 번에 몰아서 하는 것보다 훨씬 효과적입니다. 1달이면 눈에 띄는 실력 향상을 체감할 수 있습니다.</li>
          </ul>
        </div>
      </section>
    </>
  )
}
