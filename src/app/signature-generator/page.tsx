import { Metadata } from 'next'
import SignatureGenerator from '@/components/SignatureGenerator'
import I18nWrapper from '@/components/I18nWrapper'
import RelatedTools from '@/components/RelatedTools'

export const metadata: Metadata = {
  title: '서명 생성기 - 전자 서명 만들기, 이미지 다운로드 | 툴허브',
  description: '서명 만들기 - 마우스·터치·펜으로 직접 그리거나 이름을 입력해 손글씨 폰트 서명을 만들고, 여백을 자른 투명 PNG·SVG·JPG로 저장합니다. 전자계약·PDF·이메일용, 서버 전송 없음.',
  keywords: '서명 생성기, 서명 만들기, 전자 서명, 전자서명 이미지, 서명 이미지 만들기, 손글씨 서명, 이름 서명, 투명 서명 PNG, e-signature generator',
  openGraph: { title: '서명 생성기 | 툴허브', description: '전자 서명 생성 및 다운로드', url: 'https://toolhub.ai.kr/signature-generator', siteName: '툴허브', locale: 'ko_KR', type: 'website', images: [{ url: 'https://toolhub.ai.kr/og/signature-generator.png', width: 1200, height: 630, alt: '서명 생성기' }] },
  twitter: { card: 'summary_large_image', title: '서명 생성기 | 툴허브', description: '전자 서명 생성 및 다운로드', images: ['https://toolhub.ai.kr/og/signature-generator.png'] },
  alternates: { canonical: 'https://toolhub.ai.kr/signature-generator/' },
}

export default function SignatureGeneratorPage() {
  const jsonLd = { '@context': 'https://schema.org', '@type': 'WebApplication', name: '서명 생성기', description: '전자 서명 생성 및 다운로드', url: 'https://toolhub.ai.kr/signature-generator', applicationCategory: 'UtilityApplication', operatingSystem: 'Any', browserRequirements: 'JavaScript', offers: { '@type': 'Offer', price: '0', priceCurrency: 'KRW' }, featureList: ['부드러운 필압 느낌 서명 그리기', '이름 입력 손글씨 폰트 서명', '여백 자동 자르기 투명 PNG(2x/3x)', 'SVG 벡터·흰 배경 JPG', '클립보드 복사', '서명 5개 로컬 저장'] }
  const faqJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
      {
        '@type': 'Question',
        name: '전자서명의 법적 효력은?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: '2020년 12월 개정 전자서명법 시행으로 공인인증서 제도가 폐지되어, 공동인증서(구 공인인증서)와 카카오·PASS·네이버 등 민간 인증서가 같은 지위에서 쓰입니다. 전자서명은 전자적 형태라는 이유만으로 효력이 부인되지 않으며, 법령이나 당사자 간 약정에 따라 서명·기명날인의 효력을 가집니다(전자서명법 제3조). 이 도구로 생성하는 서명 이미지는 간편한 문서 서명용이며, 공식 전자서명(공동인증서, 전자계약 플랫폼)과는 다릅니다.',
        },
      },
      {
        '@type': 'Question',
        name: '서명 이미지를 문서에 삽입하는 방법은?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: '① PDF: Adobe Acrobat에서 \'서명 추가\' → 이미지 삽입. 무료 대안으로 Smallpdf, iLovePDF 사용 ② Word/한글: 삽입 → 그림으로 서명 이미지 추가, 텍스트 줄 바꿈을 \'앞으로\'로 설정 ③ 이메일: 서명 설정에서 HTML 이미지로 삽입 ④ 구글 문서: 삽입 → 이미지 → 서명 파일 업로드. PNG 투명 배경 형식이 가장 활용도가 높습니다.',
        },
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
            <SignatureGenerator />
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
            서명 생성기란?
          </h2>
          <p className="text-body leading-relaxed mb-6">
            서명 생성기는 마우스·손가락·스타일러스 펜으로 직접 그리거나, 이름만 입력해 한글·영문 손글씨 폰트로 서명 이미지를 만드는 무료 온라인 도구입니다. 획은 속도와 필압에 따라 굵기가 달라져 실제 펜으로 쓴 느낌이 나고, 저장할 때 서명 주변 빈 공간을 자동으로 잘라 투명 PNG(2x·3x 고해상도), 확대해도 깨지지 않는 SVG, 흰 배경 JPG로 내려받을 수 있습니다. 서명 이미지는 브라우저 안에서만 만들어지며 서버로 전송되지 않습니다(이름 서명은 폰트를 받을 때 입력한 글자 목록만 Google Fonts에 요청).
          </p>
          <h3 className="text-lg font-semibold text-fg mb-3">
            서명 생성기 활용 팁
          </h3>
          <ul className="list-disc list-inside space-y-2 text-body">
            <li><strong>투명 PNG 저장:</strong> 배경 없는 PNG로 저장하면 어떤 색상의 문서에도 깔끔하게 삽입할 수 있어 이메일 서명과 계약서에 활용하기 좋습니다.</li>
            <li><strong>Word/한글 삽입:</strong> 다운로드한 PNG를 삽입 후 텍스트 줄 바꿈을 '앞으로' 설정하면 서명을 원하는 위치에 자유롭게 배치할 수 있습니다.</li>
            <li><strong>모바일에서 그리기:</strong> 스마트폰 화면에서 손가락으로 그리면 더욱 자연스러운 필기체 서명을 만들 수 있습니다. 그리는 동안 화면이 스크롤되지 않습니다.</li>
            <li><strong>이름으로 만들기:</strong> 그리기가 어렵다면 이름을 입력하고 손글씨 폰트를 고른 뒤 기울기·자간을 조절하세요. 영문 이름은 필기체(스크립트) 폰트도 고를 수 있습니다.</li>
            <li><strong>법적 주의사항:</strong> 서명 이미지도 당사자 간 합의 등 상황에 따라 서명으로 인정될 수 있지만, 이미지만으로는 누가 붙였는지 증명하기 어렵습니다. 본인확인이 중요한 계약은 공동인증서·민간인증서나 전자계약 플랫폼을 이용하세요.</li>
          </ul>
        </div>
      </section>
    </>
  )
}
