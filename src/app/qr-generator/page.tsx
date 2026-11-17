import { Metadata } from 'next'
import QrGenerator from '@/components/QrGenerator'
import I18nWrapper from '@/components/I18nWrapper'
import RelatedTools from '@/components/RelatedTools'
import { FaqJsonLd } from '@/components/ToolFaq'
import koMessages from '@/../messages/generated/ko/ns/qrGenerator.json'

const TITLE = "QR 코드 생성기 - PNG·ZIP·A4 묶음 인쇄 | 툴허브"
const DESCRIPTION = "URL·텍스트·Wi-Fi·연락처 QR을 브라우저에서 만드세요. 서로 다른 내용 최대 30개를 PNG ZIP으로 저장하거나 A4 한 장에 6개씩, 최대 5장으로 인쇄합니다. 기존 단일 QR의 로고·색상·SVG·반복 인쇄도 지원합니다."

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  keywords: 'QR코드, QR생성기, 큐알코드, 바코드, 와이파이QR, 연락처QR, 로고QR, 커스텀QR, 무료QR생성, 개발도구',
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    url: 'https://toolhub.ai.kr/qr-generator/',
    siteName: '툴허브',
    locale: 'ko_KR',
    type: 'website',
    images: [{ url: 'https://toolhub.ai.kr/og/qr-generator.png', width: 1200, height: 630, alt: 'QR 코드 생성기' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: TITLE,
    description: DESCRIPTION,
    images: ['https://toolhub.ai.kr/og/qr-generator.png'],
  },
  alternates: {
    canonical: 'https://toolhub.ai.kr/qr-generator/',
  },
}

export default function QrGeneratorPage() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: 'QR 코드 생성기',
    description: DESCRIPTION,
    url: 'https://toolhub.ai.kr/qr-generator/',
    applicationCategory: 'UtilityApplication',
    operatingSystem: 'Any',
    browserRequirements: 'JavaScript',
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'KRW'
    },
    featureList: [
      'URL·텍스트·와이파이·연락처(vCard)·문자·이메일·전화·위치 QR',
      '로고 이미지 삽입',
      '색상·여백 설정과 대비 경고',
      '오류 정정 레벨 L/M/Q/H',
      'PNG(최대 2048px)·SVG 다운로드',
      '클립보드 이미지 복사',
      'A4 인쇄용 여러 장',
      '가입·만료·워터마크 없음(브라우저에서 생성)',
      '서로 다른 텍스트 최대 30행 일괄 QR 생성',
      '행별 오류 표시·PNG ZIP 다운로드',
      "서로 다른 QR 1~30개를 A4 2열 3행·최대 5장으로 인쇄",
      "이름·행 번호만 표시하고 QR 원문은 글자로 인쇄하지 않음",
      "이미지 준비 취소·재시도와 오래된 인쇄 요청 차단",
    ]
  }

  const faq = koMessages.qrGenerator.guide.faq.items

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <div className="min-h-screen py-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
            <I18nWrapper>
              <QrGenerator />
              <FaqJsonLd items={faq} />
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
            QR 코드 생성기란?
          </h2>
          <p className="text-body leading-relaxed mb-6">
            QR 코드 생성기는 URL, 텍스트, 연락처, Wi-Fi 정보 등 다양한 데이터를 QR 코드 이미지로 변환해 주는 무료 온라인 도구입니다. 명함, 메뉴판, 포스터, 마케팅 자료 제작에 활용되며, 로고 삽입과 색상 커스터마이징으로 브랜드 정체성을 유지한 개성 있는 큐알코드를 손쉽게 만들 수 있습니다.
          </p>
          <p className="text-body leading-relaxed mb-6">일괄 생성의 QR 묶음 인쇄는 서로 다른 코드를 한 번씩 배치합니다. A4 세로 한 장에 2열 3행으로 6개씩, 최대 30개를 5장까지 준비하며 이름과 번호만 글자로 표시합니다. 인쇄 배율 100%에서 용지와 여백을 확인하고 출력 후 스캔해 주세요. 인쇄 준비를 취소해도 완료된 QR 결과는 유지됩니다.</p>
          <h3 className="text-lg font-semibold text-fg mb-3">
            QR 코드 생성기 활용 팁
          </h3>
          <ul className="list-disc list-inside space-y-2 text-body">
            <li><strong>짧은 URL 사용:</strong> 긴 URL을 QR 코드에 넣으면 패턴이 촘촘해져 인식률이 낮아집니다. 가능하면 짧은 주소를 쓰되, 단축 URL 서비스는 서비스가 종료되면 QR도 함께 쓸 수 없게 되니 주의하세요.</li>
            <li><strong>오류 정정 레벨 선택:</strong> 로고를 삽입하거나 QR 코드가 훼손될 가능성이 있는 환경(야외, 포장재 등)에서는 오류 정정 레벨을 H(30%)로 설정하세요.</li>
            <li><strong>적절한 크기 유지:</strong> 인쇄물에 사용할 경우 2cm × 2cm 이상을 권장하며, 스캔 거리에 따라 크기를 조정하면 인식 오류를 줄일 수 있습니다.</li>
            <li><strong>색상 대비 확인:</strong> 전경색(패턴)과 배경색의 명암 대비가 충분해야 스마트폰 카메라가 정확히 인식합니다. 밝은 배경에 어두운 패턴이 기본 원칙입니다.</li>
          </ul>
        </div>
      </section>
    </>
  )
}
