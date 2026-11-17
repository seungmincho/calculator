import { Metadata } from 'next'
import TypingTest from '@/components/TypingTest'
import I18nWrapper from '@/components/I18nWrapper'
import RelatedTools from '@/components/RelatedTools'
import { FaqJsonLd } from '@/components/ToolFaq'
import typingTestMessages from '../../../messages/generated/ko/ns/typingTest.json'

const TITLE = '타자 연습 - 한글·영문·내 글·틀린 구간 복습 | 툴허브'
const DESCRIPTION = '기본 네 가지 모드와 내 글로 한글 타수·영문 WPM·정확도를 확인하세요. 완료 후 틀린 단어와 공백 주변을 선택해 별도로 다시 연습하며, 복습은 원래 결과·내 글 초안·기존 기록을 바꾸지 않습니다.'

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  keywords: '타자 연습, 타자 속도 측정, 한글 타수, 타자 테스트, 내 글 타자 연습, 영타 연습, WPM 측정, 오늘의 문장, 타자 급수',
  openGraph: { title: TITLE, description: DESCRIPTION, url: 'https://toolhub.ai.kr/typing-test/', siteName: '툴허브', locale: 'ko_KR', type: 'website', images: [{ url: 'https://toolhub.ai.kr/og/typing-test.png', width: 1200, height: 630, alt: '타자 연습' }] },
  twitter: { card: 'summary_large_image', title: TITLE, description: DESCRIPTION, images: ['https://toolhub.ai.kr/og/typing-test.png'] },
  alternates: { canonical: 'https://toolhub.ai.kr/typing-test/' },
}

export default function TypingTestPage() {
  const jsonLd = { '@context': 'https://schema.org', '@type': 'WebApplication', name: '타자 연습', description: DESCRIPTION, url: 'https://toolhub.ai.kr/typing-test/', applicationCategory: 'UtilityApplication', operatingSystem: 'Any', browserRequirements: 'JavaScript', offers: { '@type': 'Offer', price: '0', priceCurrency: 'KRW' }, featureList: ['한글 자모 타수 측정', '오늘의 문장', '30초/60초 시간제', '영문 WPM', '자주 틀린 자모 분석', '기본 연습 기록 그래프·결과 공유', '10~1,000자 내 글 미리보기·명시 적용', '기존 기록과 분리한 내 글 결과·같은 지문 재연습', '지문을 포함하지 않는 결과 요약 복사·실패 복구', '완료 후 확정 오류의 단어·공백 주변 구간 선택', '원래 결과·기록과 분리한 최대 1,000자 구간 복습'] }
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <FaqJsonLd items={typingTestMessages.typingTest.guide.faq.items} />
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
            한글 타수는 자모 기준으로 셉니다. 닭은 ㄷ·ㅏ·ㄹ·ㄱ 4타, 과는 ㄱ·ㅗ·ㅏ 3타이고, 쌍자음은 Shift를 빼고 1타로 셉니다. 조합 중인 글자는 완료를 확정하지 않고 입력 확정 뒤 채점합니다. 매일 바뀌는 오늘의 문장과 30초·60초 시간제로 연습할 수 있으며, 영문은 5글자를 1단어로 보는 WPM을 사용합니다. 이 단위를 다른 문자 체계의 실제 키 입력 횟수와 동일하게 해석하지 마세요.
          </p>
          <h3 className="text-lg font-semibold text-fg mb-3">내가 고른 글로 연습하기</h3>
          <p className="text-body leading-relaxed mb-6">
            내 글은 10~1,000 코드포인트 범위에서 줄바꿈·탭·반복 공백을 정리한 미리보기를 확인한 뒤 적용합니다. 작성 중인 초안과 현재 연습 지문은 분리되며 새 글을 적용할 때만 연습이 다시 시작됩니다. 다른 연습 방식으로 이동하면 진행 중 타이머는 끝나지만 내 글 초안은 이번 방문 동안 유지됩니다. 내 글의 난도는 각기 다르므로 최고 기록·일일 통계에 합산하지 않습니다. 원고는 URL이나 기기 기록에 저장하지 않으며 결과 요약 복사에도 자동으로 포함하지 않습니다.
          </p>
          <h3 className="text-lg font-semibold text-fg mb-3">틀린 구간만 다시 연습하기</h3>
          <p className="text-body leading-relaxed mb-6">완료한 기본 연습과 내 글 결과 아래에서 확정 입력의 오류가 있던 구간을 선택할 수 있습니다. 공백을 틀린 경우 양옆 단어를 함께 표시하고, 나중에 고친 오류도 복습 후보로 유지합니다. 아직 입력하지 않은 시간제 지문의 뒷부분은 포함하지 않습니다. 원문 공백·문장부호를 유지한 최대 1,000자 구간을 명시적으로 시작하며, 짧은 구간의 정확도와 오류 위치 수는 원래 결과·기록에 합산하지 않습니다.</p>
          <h3 className="text-lg font-semibold text-fg mb-3">
            타이핑 속도 향상 팁
          </h3>
          <ul className="list-disc list-inside space-y-2 text-body">
            <li><strong>올바른 자세:</strong> 허리를 곧게 펴고 손목을 낮게 유지하며 타이핑해야 장시간 사용 시 부담이 줄어듭니다.</li>
            <li><strong>터치타이핑 연습:</strong> 키보드를 보지 않고 손가락 위치만으로 타이핑하는 습관을 들이면 장기적으로 속도가 크게 향상됩니다.</li>
            <li><strong>정확도 우선:</strong> 처음에는 속도보다 정확도에 집중하세요. 실수 없이 치는 습관이 들면 속도는 자연스럽게 따라옵니다.</li>
            <li><strong>같은 글 재연습:</strong> 자주 틀린 글자를 확인하고 같은 지문으로 다시 연습해 보세요. 서로 다른 난도의 지문 결과는 같은 조건의 기록처럼 비교하지 마세요.</li>
          </ul>
        </div>
      </section>
    </>
  )
}
