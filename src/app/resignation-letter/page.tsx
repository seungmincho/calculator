import { Metadata } from 'next'
import ResignationLetter from '@/components/ResignationLetter'
import I18nWrapper from '@/components/I18nWrapper'
import RelatedTools from '@/components/RelatedTools'

export const metadata: Metadata = {
  title: '사직서 양식 작성기 - 무료 PDF·사유 예시 | 툴허브',
  description: '사직서 양식을 빈칸만 채워 바로 만드세요. 개인 사정·이직·권고사직 등 사직 사유 예시 문장, 퇴직금 1년 요건·사직 효력일(민법 660조)·실업급여 주의점 확인, 이름 도장, A4 PDF·인쇄까지 무료.',
  keywords: '사직서, 사직서 양식, 사직서 쓰는법, 사직서 작성법, 사직서 사유, 사직서 예시, 권고사직 사직서, 사직서 PDF, 퇴사 사유, 사직서 수리 거부',
  openGraph: {
    title: '사직서 양식 작성기 | 툴허브',
    description: '사유만 고르면 완성되는 사직서. 퇴직금·사직 효력일·실업급여 주의점 확인, PDF 출력.',
    url: 'https://toolhub.ai.kr/resignation-letter',
    siteName: '툴허브',
    locale: 'ko_KR',
    type: 'website',
    images: [{ url: 'https://toolhub.ai.kr/og/resignation-letter.png', width: 1200, height: 630, alt: '사직서 양식 작성기' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: '사직서 양식 작성기',
    description: '사유만 고르면 완성되는 사직서 PDF',
    images: ['https://toolhub.ai.kr/og/resignation-letter.png'],
  },
  alternates: {
    canonical: 'https://toolhub.ai.kr/resignation-letter/',
  },
}

// 컴포넌트 가이드 FAQ(messages resignationLetter.guide.faq)와 같은 내용 — 화면에 보이는 FAQ만 구조화 데이터로
const faqs = [
  {
    q: '회사가 사직서를 수리해 주지 않으면 어떻게 되나요?',
    a: '기간을 정하지 않은 근로계약이라면 회사가 수리하지 않아도 민법 제660조에 따라 사직 의사를 통보한 날부터 1개월이 지나면 퇴직 효력이 생겨요. 월급제처럼 기간으로 보수를 정했다면 통보한 달의 다음 임금 기간이 끝나야(보통 다음 달 말일) 효력이 생겨요. 그때까지는 출근하는 것이 안전해요.',
  },
  {
    q: '이메일이나 카카오톡으로 낸 사직서도 효력이 있나요?',
    a: '사직은 의사표시라 형식이 정해져 있지 않아 이메일·문자로도 효력이 있어요. 다만 회사에 도달했다는 사실과 날짜를 증명할 수 있어야 하니 발송 기록을 남기고, 가능하면 서명한 사직서 파일(PDF)을 첨부하세요.',
  },
  {
    q: '회사 양식으로만 내라고 하는데 따라야 하나요?',
    a: "법으로 정해진 사직서 양식은 없어서 어떤 양식이든 효력은 같아요. 회사 양식을 써도 괜찮지만, 사유 칸에 사실과 다른 내용(예: 권고사직인데 '개인 사정')을 쓰라고 하면 따르지 말고 실제 사유를 쓰세요. 실업급여 수급에 영향을 줘요.",
  },
  {
    q: '사직서를 낸 뒤 철회할 수 있나요?',
    a: '회사가 사직서를 수리(승낙)하기 전이라면 원칙적으로 철회할 수 있어요. 이미 수리됐거나 철회가 회사에 예측하지 못한 손해를 주는 특별한 사정이 있으면 회사가 동의해야 해요.',
  },
  {
    q: '퇴사하면 퇴직금은 언제 받나요?',
    a: '1년 이상 계속 근무(주 15시간 이상)했다면 퇴직일로부터 14일 안에 받아야 해요. 당사자 합의가 있으면 기일을 늦출 수 있고, 퇴직금은 원칙적으로 IRP(개인형 퇴직연금) 계좌로 이전돼요.',
  },
]

export default function ResignationLetterPage() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: '사직서 양식 작성기',
    description: '사직서 양식을 작성하고 A4 PDF로 저장·인쇄합니다. 사직 사유 예시, 퇴직금·사직 효력일·실업급여 주의점 확인.',
    url: 'https://toolhub.ai.kr/resignation-letter',
    applicationCategory: 'BusinessApplication',
    operatingSystem: 'Any',
    browserRequirements: 'JavaScript',
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'KRW' },
    featureList: [
      '한국 회사 통용 사직서 표준 양식',
      '사직 사유 예시 문장 8종 (개인 사정·이직·학업·건강·가사·계약 만료·권고사직·직접 입력)',
      '근속기간·퇴직금 1년 요건 확인',
      '사직서 수리 거부 시 효력일 계산 (민법 제660조)',
      '권고사직·계약 만료 실업급여 주의사항',
      '입사 주년 전날 퇴사 시 연차 미발생 경고',
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
            <ResignationLetter />
            <div className="mt-8">
              <RelatedTools />
            </div>
          </I18nWrapper>
        </div>
      </div>
      {/* SEO 콘텐츠 */}
      <section className="max-w-4xl mx-auto px-4 pb-12">
        <div className="mt-12 border-t border-line pt-8">
          <h2 className="text-xl font-bold text-fg mb-4">사직서 작성기란?</h2>
          <p className="text-body leading-relaxed mb-6">
            사직서는 회사에 근로계약을 끝내겠다는 뜻을 알리는 문서입니다. 이 작성기는 이름·소속·입사일·퇴직 희망일과 사직 사유만 고르면
            한국 회사에서 통용되는 표 형식 사직서를 A4 양식으로 바로 만들어 줍니다. 사유별 정중한 예시 문장을 채워 주고, 근속기간과 퇴직금 요건,
            회사가 사직서를 수리하지 않을 때의 효력일, 권고사직·계약 만료 시 실업급여 주의점을 함께 확인할 수 있습니다. 입력한 내용은 내 브라우저에만 저장됩니다.
          </p>
          <h3 className="text-lg font-semibold text-fg mb-3">사직서 쓰는 법 핵심</h3>
          <ul className="list-disc list-inside space-y-2 text-body">
            <li><strong>인적사항:</strong> 성명, 소속 부서, 직위, 입사일, 퇴직 예정일(마지막 근무일)을 적습니다.</li>
            <li><strong>사직 사유:</strong> 자진 퇴사는 &lsquo;일신상의 사유&rsquo;로 충분하지만, 권고사직·계약 만료라면 사실대로 써야 실업급여에 불리하지 않습니다.</li>
            <li><strong>퇴직일:</strong> 보통 30일 전에 제출합니다. 회사가 수리하지 않으면 제출 후 1개월(월급제는 다음 달 말일)이 지나야 효력이 생깁니다.</li>
            <li><strong>퇴직금:</strong> 1년 이상 근무해야 발생하므로, 1년을 며칠 앞두고 있다면 퇴직일을 조정하세요.</li>
            <li><strong>서명·수신:</strong> 제출일, 본인 서명(인), &lsquo;○○주식회사 대표이사 귀하&rsquo;로 마무리합니다.</li>
          </ul>
        </div>
      </section>
    </>
  )
}
