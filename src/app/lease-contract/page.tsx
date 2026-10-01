import { Metadata } from 'next'
import LeaseContract from '@/components/LeaseContract'
import I18nWrapper from '@/components/I18nWrapper'
import RelatedTools from '@/components/RelatedTools'

export const metadata: Metadata = {
  title: '부동산 임대차계약서 작성기 - 전세·월세 양식 | 툴허브',
  description: '주택임대차표준계약서(2023 개정) 기반 전세·월세 계약서를 무료로 작성하세요. 직거래용 전세사기 예방 특약 체크리스트, 계약금·잔금 합계 검사, 2년 보장·5% 상한·전월세 신고 안내, 도장 자동 생성, A4 PDF·인쇄.',
  keywords: '부동산 임대차계약서, 임대차계약서 양식, 주택임대차표준계약서, 전세계약서 양식, 월세계약서 양식, 직거래 계약서, 전세 특약, 전세사기 예방 특약, 임대차계약서 PDF, 확정일자, 전월세 신고',
  openGraph: {
    title: '부동산 임대차계약서 작성기 | 툴허브',
    description: '표준계약서 기반 전세·월세 계약서. 전세사기 예방 특약 추천·금액 검사·PDF 출력.',
    url: 'https://toolhub.ai.kr/lease-contract',
    siteName: '툴허브',
    locale: 'ko_KR',
    type: 'website', images: [{ url: 'https://toolhub.ai.kr/og/lease-contract.png', width: 1200, height: 630, alt: '부동산 임대차계약서 작성기' }] },
  twitter: {
    card: 'summary_large_image',
    title: '부동산 임대차계약서 작성기',
    description: '표준계약서 기반 전세·월세 계약서 PDF', images: ['https://toolhub.ai.kr/og/lease-contract.png'] },
  alternates: {
    canonical: 'https://toolhub.ai.kr/lease-contract/',
  },
}

// 컴포넌트 가이드 FAQ(messages leaseContract.guide.faq)와 같은 내용 — 화면에 보이는 FAQ만 구조화 데이터로
const faqs = [
  {
    q: "중개사 없이 직거래로 쓴 계약서도 효력이 있나요?",
    a: "네. 임대차계약은 당사자의 합의만으로 성립하고, 직접 작성해 서명·날인한 계약서도 효력이 같아요. 다만 중개사의 권리관계 확인과 공제 보증이 없으므로 등기부등본·건축물대장·납세증명서를 직접 확인하고, 계약금은 소유자 명의 계좌로만 보내세요.",
  },
  {
    q: "전세 계약을 1년으로 하면 1년 뒤 나가야 하나요?",
    a: "아니요. 주택임대차보호법 제4조에 따라 2년 미만으로 정한 임대차도 2년으로 봐요. 임차인은 1년 뒤 나가도 되고 2년을 주장해도 되지만, 임대인은 2년 미만을 주장할 수 없어요.",
  },
  {
    q: "전입신고와 확정일자는 언제 받아야 하나요?",
    a: "잔금을 치르고 입주하는 날 바로 받으세요. 대항력은 전입신고 다음 날 0시에 생기므로, 같은 날 잡힌 근저당보다 순위가 늦어요. 그래서 '잔금일 다음 날까지 근저당 등 권리 변동 금지' 특약을 넣어요.",
  },
  {
    q: "전월세 신고는 누가, 언제까지 해야 하나요?",
    a: "보증금 6천만원 초과 또는 월세 30만원 초과 계약은 계약일로부터 30일 안에 임대인과 임차인이 함께(한쪽이 계약서를 내면 공동 신고로 봄) 주민센터나 부동산거래관리시스템에 신고해요. 수도권 전역·광역시·세종·제주·도의 시 지역이 대상이고, 신고하면 확정일자도 자동으로 받아요.",
  },
  {
    q: "재계약할 때 보증금은 얼마까지 올릴 수 있나요?",
    a: "임차인이 계약갱신요구권을 쓰면 보증금·월세 모두 5% 이내로만 올릴 수 있어요. 갱신요구권을 쓰지 않고 합의로 새로 계약하면 상한이 없지만, 그 경우 갱신요구권은 아직 남아 있어요.",
  },
  {
    q: "계약금만 보낸 뒤 계약을 취소할 수 있나요?",
    a: "중도금(없으면 잔금)을 내기 전까지는 임차인은 계약금을 포기하고, 임대인은 계약금의 두 배를 돌려주고 계약을 해제할 수 있어요(표준계약서 제5조, 민법 제565조). 특약에서 정한 해제 사유가 생기면 계약금을 돌려받을 수 있어요.",
  },
  {
    q: "상가나 사무실 임대차계약서도 만들 수 있나요?",
    a: "이 도구는 주택 전세·월세만 다뤄요. 상가·사무실은 상가건물 임대차보호법(계약갱신요구권 10년, 권리금 등)이 적용되므로 법무부 상가건물 임대차 표준계약서를 쓰세요.",
  },
]

export default function LeaseContractPage() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: '부동산 임대차계약서 작성기',
    description: '주택임대차표준계약서 구조로 전세·월세 계약서를 작성하고 A4 PDF로 저장·인쇄합니다. 전세사기 예방 특약 추천.',
    url: 'https://toolhub.ai.kr/lease-contract',
    applicationCategory: 'BusinessApplication',
    operatingSystem: 'Any',
    browserRequirements: 'JavaScript',
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'KRW' },
    featureList: [
      '주택임대차표준계약서(2023.10.6. 개정) 조항 구성',
      '전세·보증금 있는 월세, 신규·합의 재계약·갱신계약',
      '전세사기 예방 특약 체크리스트 11종 (편집 가능)',
      '계약금·중도금·잔금 합계 검사, 금액 한글·숫자 병기',
      '2년 미만 계약·갱신 5% 상한·전월세 신고 대상 안내',
      '정액관리비 항목별 기재 (월 10만원 이상)',
      '이름 도장 자동 생성·도장 이미지',
      'A4 PDF 저장·인쇄',
    ],
  }
  const faqJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map((f) => ({
      '@type': 'Question',
      name: f.q,
      acceptedAnswer: { '@type': 'Answer', text: f.a },
    })),
  }

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />
      <div className="min-h-screen py-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <I18nWrapper>
            <LeaseContract />
            <div className="mt-8">
              <RelatedTools />
            </div>
          </I18nWrapper>
        </div>
      </div>
      {/* SEO 콘텐츠 */}
      <section className="max-w-4xl mx-auto px-4 pb-12">
        <div className="mt-12 border-t border-line pt-8">
          <h2 className="text-xl font-bold text-fg mb-4">부동산 임대차계약서 작성기란?</h2>
          <p className="text-body leading-relaxed mb-6">
            법무부와 국토교통부가 보급하는 주택임대차표준계약서(2023년 10월 6일 개정)의 구성을 그대로 따라 전세·월세 계약서를 만드는 도구입니다.
            임차주택의 표시, 보증금·계약금·잔금·차임과 관리비, 임대차기간, 입주 전 수리, 제4조~제10조의 표준 조항, 특약사항과 서명란을 A4 양식으로
            채워 줍니다. 공인중개사 없이 직거래하는 경우를 위해 전세사기 예방 특약을 골라 넣을 수 있고, 금액 합계·2년 보장·갱신 5% 상한·전월세 신고 대상을
            자동으로 확인합니다. 입력한 내용은 내 브라우저에만 저장됩니다.
          </p>
          <h3 className="text-lg font-semibold text-fg mb-3">직거래 임대차계약서에 꼭 넣을 것</h3>
          <ul className="list-disc list-inside space-y-2 text-body">
            <li><strong>당사자:</strong> 등기부등본상 소유자인 임대인과 임차인의 이름, 주소, 주민등록번호, 연락처. 공동소유면 모두 서명.</li>
            <li><strong>임차주택:</strong> 등기부등본·건축물대장과 같은 소재지, 지목·면적, 구조·용도, 임차할 부분.</li>
            <li><strong>금액:</strong> 보증금·계약금·중도금·잔금·월세를 한글과 숫자로 함께 적고, 합계가 보증금과 맞는지 확인.</li>
            <li><strong>기간:</strong> 인도일과 만료일. 2년 미만으로 정해도 임차인은 2년을 주장할 수 있습니다.</li>
            <li><strong>특약:</strong> 잔금일 다음 날까지 근저당 등 권리 변동 금지, 세금 체납·선순위 보증금 고지, 전세자금대출·보증보험 불가 시 해제.</li>
          </ul>
        </div>
      </section>
    </>
  )
}
