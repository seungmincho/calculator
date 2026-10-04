import { Metadata } from 'next'
import CustomsDutyCalculator from '@/components/CustomsDutyCalculator'
import I18nWrapper from '@/components/I18nWrapper'
import RelatedTools from '@/components/RelatedTools'

export const metadata: Metadata = {
  title: '해외직구 관부가세 계산기 - 면세 한도·관세 계산 | 툴허브',
  description: '해외직구 관세·부가세를 원화로 바로 계산하세요. 미국 200달러·그 외 150달러 면세 한도 판정, 배송비 포함 여부, 품목별 관세율(의류 13%·가방 8%·노트북 0%), 합산과세, 1만원 미만 면제, 블프·광군제 실구매가까지.',
  keywords: '해외직구 관세 계산기, 관부가세 계산기, 직구 면세 한도, 관부가세, 해외직구 관세, 미국 직구 200달러, 직구 150달러, 목록통관, 합산과세, 블랙프라이데이 직구, 광군제 직구, 관세 계산',
  openGraph: {
    title: '해외직구 관부가세 계산기 | 툴허브',
    description: '면세 한도 판정부터 관세·부가세·실구매가까지 원화로 한 번에.',
    url: 'https://toolhub.ai.kr/customs-duty/',
    siteName: '툴허브', locale: 'ko_KR', type: 'website',
    images: [{ url: 'https://toolhub.ai.kr/og/customs-duty.png', width: 1200, height: 630, alt: '해외직구 관부가세 계산기' }],
  },
  twitter: { card: 'summary_large_image', title: '해외직구 관부가세 계산기 | 툴허브', description: '직구 면세 한도와 관세·부가세 계산', images: ['https://toolhub.ai.kr/og/customs-duty.png'] },
  alternates: { canonical: 'https://toolhub.ai.kr/customs-duty/' },
}

// 컴포넌트 가이드 FAQ(messages customsDuty.guide.faq)와 같은 내용 — 화면에 보이는 FAQ만 구조화 데이터로
const faqs = [
  { q: '해외직구 면세 한도는 얼마인가요?', a: '개인이 쓰려고 산 물건의 물품가격이 미화 150달러 이하면 관세와 부가세가 면제돼요. 미국에서 발송된 목록통관 물품은 한미 FTA 특례로 200달러까지 면세예요. 건강기능식품·의약품·전자제품처럼 일반수입신고 대상이면 미국 발송이어도 150달러가 기준이에요.' },
  { q: '배송비도 면세 한도에 포함되나요?', a: '현지 판매세와 발송 국가 안에서 든 배송비는 포함되고, 한국으로 오는 국제 배송비와 보험료는 결제 내역에서 명백히 구분되면 빠져요. 다만 한도를 넘어 과세되면 국제 배송비까지 더한 금액에 세금이 붙어요.' },
  { q: '한도를 조금만 넘으면 넘은 금액에만 세금이 붙나요?', a: '아니요. 한도를 넘으면 공제 없이 물품가격과 국제 배송비를 합친 전체 과세가격에 관세와 부가세가 붙어요. 예를 들어 미국에서 230달러 신발을 배송비 18달러에 사면 248달러 전체가 과세 대상이에요.' },
  { q: '관부가세는 어떻게 계산하나요?', a: '과세가격은 (물품가격 + 국제 배송비) × 관세청 과세환율이에요. 관세는 과세가격에 품목 관세율(의류·신발 13%, 가방·화장품·시계 8%, 노트북·휴대폰 0% 등)을 곱하고, 부가세는 과세가격과 관세를 더한 금액의 10%예요. 세액이 1만원 미만이면 걷지 않아요.' },
  { q: '합산과세는 언제 되나요?', a: '같은 해외 판매자에게 같은 날 산 물건을 나눠 들여오거나, 한 운송장으로 온 물건을 나눠 통관할 때 물품가격을 합쳐서 판정해요. 2022년 11월 17일부터는 판매자나 구매일이 다르면 같은 날 입항해도 합산하지 않아요.' },
  { q: '반품하면 낸 관세를 돌려받을 수 있나요?', a: '수입신고가 수리된 자가사용 물품을 쓰지 않은 상태 그대로 6개월 안에 해외로 다시 보내면 관세를 환급받을 수 있어요(관세법 제106조의2). 보세구역 반입이나 세관 확인 절차가 필요하니 반품 전에 세관에 문의하세요.' },
  { q: '어떤 환율로 계산하나요?', a: '관세청장이 매주 정하는 과세환율을 써요. 수입신고하는 날이 속한 주의 전주 기준환율 평균이라 카드 결제 환율과 다를 수 있어요. 이 계산기는 시장 환율을 기본값으로 쓰고, 직접 고쳐 넣을 수도 있어요.' },
  { q: '개인통관고유부호가 꼭 필요한가요?', a: '네. 해외직구 물품을 통관할 때 주민등록번호 대신 받는 사람을 확인하는 번호로, 관세청 유니패스에서 발급해요. 2026년부터 유효기간이 1년이라 만료일 전후 30일 안에 갱신해야 해요.' },
]

export default function CustomsDutyPage() {
  const jsonLd = {
    '@context': 'https://schema.org', '@type': 'WebApplication',
    name: '해외직구 관부가세 계산기',
    description: '해외직구 면세 한도(미국 목록통관 200달러, 그 외 150달러) 판정과 관세·부가세·세금 포함 실구매가를 원화로 계산.',
    url: 'https://toolhub.ai.kr/customs-duty/',
    applicationCategory: 'FinanceApplication', operatingSystem: 'Any', browserRequirements: 'JavaScript',
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'KRW' },
    featureList: ['미국 200달러·그 외 150달러 면세 한도 판정', '목록통관·일반수입신고 구분', '품목별 관세율 프리셋', '관세·부가세·개별소비세 계산', '국제 배송비 포함 여부', '합산과세 판정', '1만원 미만 징수 면제', 'USD·EUR·JPY·CNY·GBP·KRW 환율 환산', '결과 이미지·링크 공유'],
  }
  const faqJsonLd = {
    '@context': 'https://schema.org', '@type': 'FAQPage',
    mainEntity: faqs.map((f) => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })),
  }

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />
      <div className="min-h-screen py-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <I18nWrapper>
            <CustomsDutyCalculator />
            <div className="mt-8">
              <RelatedTools />
            </div>
          </I18nWrapper>
        </div>
      </div>
      <section className="max-w-4xl mx-auto px-4 pb-12">
        <div className="mt-12 border-t border-line pt-8">
          <h2 className="text-xl font-bold text-fg mb-4">해외직구 관부가세란?</h2>
          <p className="text-body leading-relaxed mb-6">
            관부가세는 해외에서 산 물건이 들어올 때 세관이 걷는 관세와 부가가치세를 함께 부르는 말입니다. 개인이 쓰려고 산 물건의 물품가격(상품 가격 + 현지 세금 + 현지 배송비)이 미화 150달러 이하면 둘 다 면제되고, 미국에서 발송된 목록통관 물품은 200달러까지 면제됩니다. 한도를 넘으면 넘은 금액이 아니라 국제 배송비까지 더한 전체 금액에 관세(품목별 0~13% 등)와 부가세 10%가 붙습니다. 건강기능식품·의약품·전자제품처럼 목록통관이 안 되는 물품은 미국에서 와도 150달러가 기준입니다.
          </p>
          <h3 className="text-lg font-semibold text-fg mb-3">관부가세 계산 예시 (과세환율 1달러 = 1,357.14원, 2026년 10월 4일 조회)</h3>
          <ul className="list-disc list-inside space-y-2 text-body">
            <li><strong>미국 신발 230달러 + 배송비 18달러:</strong> 판정 금액 230달러로 한도 200달러 초과 → 과세가격 248달러 = 336,570원, 관세 13% 43,754원 + 부가세 38,032원 = 세금 81,786원.</li>
            <li><strong>중국 쇼핑몰 의류 19만원(원화 결제):</strong> 약 140달러로 150달러 이하 → 관부가세 0원.</li>
            <li><strong>미국 노트북 1,000달러 + 배송비 40달러:</strong> 전자제품은 일반수입신고라 150달러 기준으로 과세, 관세 0%(정보기술협정) → 부가세만 141,142원.</li>
            <li><strong>미국 영양제 160달러 + 배송비 10달러:</strong> 건강기능식품은 미국 발송이어도 150달러 기준 → 관세 8% 18,457원 + 부가세 24,917원 = 43,374원.</li>
          </ul>
        </div>
      </section>
    </>
  )
}
