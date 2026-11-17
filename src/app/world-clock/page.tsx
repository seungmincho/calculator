import { Metadata } from 'next'
import WorldClock from '@/components/WorldClock'
import I18nWrapper from '@/components/I18nWrapper'
import RelatedTools from '@/components/RelatedTools'
import ToolFaq from '@/components/ToolFaq'

const TITLE = '세계 시계 - 도시별 시차·미팅 일정 ICS | 툴허브'
const DESCRIPTION = '주요 도시의 현재 시간과 업무시간 겹침을 비교하세요. 선택한 순간의 분·초를 공유하고 도시별 미팅 시작·종료 시간과 ICS 파일을 확인합니다. 도시 목록 저장과 복사 실패 복구를 지원합니다.'

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  keywords: '세계 시간, 세계 시계, 시차 계산, world clock, 미팅 시간, ICS, 캘린더 일정, 서머타임, 뉴욕 시간, 런던 시간',
  openGraph: { title: TITLE, description: DESCRIPTION, url: 'https://toolhub.ai.kr/world-clock/', siteName: '툴허브', locale: 'ko_KR', type: 'website', images: [{ url: 'https://toolhub.ai.kr/og/world-clock.png', width: 1200, height: 630, alt: '세계 시계' }] },
  twitter: { card: 'summary_large_image', title: TITLE, description: DESCRIPTION, images: ['https://toolhub.ai.kr/og/world-clock.png'] },
  alternates: { canonical: 'https://toolhub.ai.kr/world-clock/' },
}

export default function WorldClockPage() {
  const jsonLd = { '@context': 'https://schema.org', '@type': 'WebApplication', name: '세계 시계', description: DESCRIPTION, url: 'https://toolhub.ai.kr/world-clock/', applicationCategory: 'UtilityApplication', operatingSystem: 'Any', browserRequirements: 'JavaScript', offers: { '@type': 'Offer', price: '0', priceCurrency: 'KRW' }, featureList: ['주요 도시 실시간 시계', '도시별 시차·업무시간 겹침', '기준 도시의 실제 날짜 구간과 DST 표시', '선택 순간의 분·초를 유지하는 링크 공유', '미팅 시작·종료와 단일 일정 ICS 파일', '도시 목록 저장·텍스트/링크 복사 복구'] }
  const faq = [
    { q: '공유한 미팅 시간이 도시 순서를 바꿔도 유지되나요?', a: '선택한 시간은 하나의 UTC 순간으로 보존합니다. 도시 순서만 바꾸면 같은 순간을 새 기준 도시의 날짜·시간으로 표시합니다. 공유 링크와 시간 변환기에서 가져온 분·초도 유지하며, 표의 가까운 칸 표시가 실제 선택 순간을 반올림하지 않습니다. 날짜를 직접 바꾸면 해당 날짜의 기본 선택으로 이동합니다.' },
    { q: '시간표가 항상 24칸인가요?', a: '기준 도시의 실제 날짜 구간을 사용하므로 서머타임 전환일에는 하루가 23시간이나 25시간일 수 있습니다. 반시간 전환과 30·45분 시차도 고려합니다. 건너뛰거나 반복되는 현지 시각과 날짜 끝의 부분 구간은 표에 표시되는 실제 순간을 기준으로 확인하세요. 시간대 정보는 브라우저의 시간대 데이터에 따릅니다.' },
    { q: '미팅을 캘린더에 어떻게 저장하나요?', a: '제목과 길이 30·60·90·120분을 선택한 뒤 캘린더 파일을 저장합니다. 기본 길이는 60분이며 선택 순간과 종료 순간을 UTC로 담은 단일 ICS 일정입니다. 제목은 1~100자로 입력하고 URL이나 기기 기록에 저장하지 않습니다. 파일을 캘린더 앱에서 직접 가져오며 계정 연동·참석자 초대·반복·알림 설정은 추가하지 않습니다.' },
    { q: '도시와 복사 결과는 어떻게 보존되나요?', a: '도시 목록은 브라우저에 저장하며 유효한 공유 URL의 도시 목록이 우선합니다. 복사 실패 시 현재 텍스트나 링크를 직접 선택하거나 재시도할 수 있습니다. 일정 파일 생성 중 선택·제목·길이·도시가 바뀌면 이전 결과를 자동으로 내려받지 않습니다.' },
  ]
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <div className="min-h-screen py-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <I18nWrapper>
            <WorldClock />
            <ToolFaq items={faq} />
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
            세계 시계란?
          </h2>
          <p className="text-body leading-relaxed mb-6">
            세계 시계는 주요 도시의 현재 시간과 시차를 비교하고 미팅 시간을 고르는 도구입니다. 도시별 업무시간 겹침과 선택한 순간의 현지 날짜를 확인한 뒤 같은 순간을 링크로 공유하거나 ICS 일정으로 저장할 수 있습니다. 현재 시각을 보는 동작과 미팅 시간을 고르는 동작을 구분하며 선택한 분·초를 유지합니다.
          </p>
          <h3 className="text-lg font-semibold text-fg mb-3">
            세계 시계 활용 팁
          </h3>
          <ul className="list-disc list-inside space-y-2 text-body">
            <li><strong>미팅 날짜 확인:</strong> 같은 순간도 도시별 날짜가 다를 수 있습니다. 시작·종료 시간을 각 도시에서 확인하세요.</li>
            <li><strong>도시 순서 변경:</strong> 기준 도시를 바꿔도 선택 순간은 유지됩니다. 날짜를 직접 바꾸는 동작과 구분하세요.</li>
            <li><strong>서머타임 전환:</strong> 반복되거나 건너뛰는 현지 시각이 있을 수 있습니다. 고정된 24시간 표보다 실제 날짜 구간을 기준으로 확인하세요.</li>
            <li><strong>도시 추가:</strong> 한글·영문 도시명이나 국가명으로 검색해 추가하고, 순서를 바꾸면 맨 위 도시가 시차 계산의 기준이 됩니다. 목록은 브라우저에 저장되고 링크로 공유할 수 있습니다.</li>
            <li><strong>일정 반출:</strong> 원하는 제목과 길이를 정한 뒤 ICS 파일을 받아 캘린더 앱으로 가져오세요. 링크에는 일정 제목을 넣지 않습니다.</li>
          </ul>
        </div>
      </section>
    </>
  )
}
