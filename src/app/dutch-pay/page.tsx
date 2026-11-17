import { Metadata } from 'next'
import DutchPay from '@/components/DutchPay'
import I18nWrapper from '@/components/I18nWrapper'
import RelatedTools from '@/components/RelatedTools'
import ToolFaq from '@/components/ToolFaq'
import dutchPayMessages from '../../../messages/generated/ko/ns/dutchPay.json'

const TITLE = '더치페이 계산기 - 정산 기록·공지 복사 복구 | 툴허브'
const DESCRIPTION = '회식·여행비를 항목별 참가자와 부담 비율에 맞춰 나누세요. 최근 정산10개 저장 상태 확인, 손상 기록 보존, 공지·금액·링크 복사 실패 복구와 보기 전용 공유를 지원합니다.'

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  keywords: '더치페이, 더치페이 계산기, N빵 계산기, 회식비 나누기, 정산 기록, 여행 경비 정산, 총무 정산, 공지 복사',
  openGraph: {
    title: TITLE, description: DESCRIPTION,
    url: 'https://toolhub.ai.kr/dutch-pay/',
    siteName: '툴허브', locale: 'ko_KR', type: 'website',
    images: [{ url: 'https://toolhub.ai.kr/og/dutch-pay.png', width: 1200, height: 630, alt: '더치페이 계산기' }],
  },
  twitter: { card: 'summary_large_image', title: TITLE, description: DESCRIPTION, images: ['https://toolhub.ai.kr/og/dutch-pay.png'] },
  alternates: { canonical: 'https://toolhub.ai.kr/dutch-pay/' },
}

export default function DutchPayPage() {
  const jsonLd = {
    '@context': 'https://schema.org', '@type': 'WebApplication',
    name: '더치페이 계산기', description: DESCRIPTION,
    url: 'https://toolhub.ai.kr/dutch-pay/', applicationCategory: 'FinanceApplication',
    operatingSystem: 'Any', browserRequirements: 'JavaScript',
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'KRW' },
    featureList: ['항목별 균등·가중치 분배', '100원·1,000원 단위 처리와 총무 차액', '항목별 참가자 제외', '여러 명 결제의 순잔액 송금 목록', '최근 정산10개 저장 확인·명시 불러오기', '손상 기록과 현재 입력 보존', '공지·금액·링크 복사 실패 복구', '보기 전용 정산 링크'],
  }
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <div className="min-h-screen py-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <I18nWrapper>
            <DutchPay />
            <div className="mt-8">
              <ToolFaq items={dutchPayMessages.dutchPay.guide.faq.items} />
              <RelatedTools />
            </div>
          </I18nWrapper>
        </div>
      </div>
      <section className="max-w-4xl mx-auto px-4 pb-12">
        <div className="mt-12 border-t border-line pt-8">
          <h2 className="text-xl font-bold text-fg mb-4">회식·여행 정산과 기록 보존</h2>
          <p className="text-body leading-relaxed mb-6">
            한 명이 결제한 모임과 여러 명이 지출을 나눈 여행을 구분해 부담액과 송금 목록을 계산합니다.
            항목마다 참여자를 제외하거나 부담 비율을 바꾸고, 원 단위 차액은 총무에게 배정합니다.
            여러 명 결제에서는 순잔액을 짝지어 송금 건수를 줄이며 모든 경우의 최소 건수를 보장하지 않습니다.
          </p>
          <h3 className="text-lg font-semibold text-fg mb-3">저장·공유할 때 확인할 내용</h3>
          <ul className="list-disc list-inside space-y-2 text-body">
            <li><strong>저장 상태:</strong> 최근10개 정산을 남길 수 있으며 실제 쓰기 결과가 확인된 뒤 성공을 표시합니다. 손상되거나 현재 형식으로 온전히 복원할 수 없는 기록은 자동으로 덮어쓰지 않습니다.</li>
            <li><strong>현재 폼 보존:</strong> 저장 실패가 정산 입력을 지우지 않습니다. 저장한 기록은 명시적으로 불러올 때 현재 폼을 바꾸며,100항목 초과 등 저장 형식의 복원 범위를 벗어나면 저장을 거부합니다.</li>
            <li><strong>계좌 범위:</strong> 계좌는 정산 링크와 최근 기록에는 넣지 않습니다. 편집 화면의 공지 복사나 명시 공유에는 들어갈 수 있으므로 보낼 원문을 확인하세요.</li>
            <li><strong>복사 실패:</strong> 금액·공지·링크를 자동 복사하지 못하면 전체 원문을 선택하거나 재시도할 수 있습니다. 계산·저장·복사 성공은 실제 송금 성공을 의미하지 않습니다.</li>
            <li><strong>보기 전용:</strong> 받은 링크의 편집 UI를 제한합니다. 암호화나 접근 통제 기능이 아니며 명단·지출은 기존 정산 주소에 포함됩니다.</li>
          </ul>
        </div>
      </section>
    </>
  )
}
