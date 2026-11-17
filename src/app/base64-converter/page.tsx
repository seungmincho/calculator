import type { Metadata } from 'next'
import I18nWrapper from '@/components/I18nWrapper'
import Base64Converter from '@/components/Base64Converter'
import RelatedTools from '@/components/RelatedTools'
import ToolFaq from '@/components/ToolFaq'

const TITLE = 'Base64·Base64URL 변환기 - 텍스트·파일 변환 | 툴허브'
const DESCRIPTION = '표준 Base64와 Base64URL로 UTF-8 텍스트·파일을 변환합니다. 패딩 선택, data URL, 바이너리 다운로드, 확인된 이미지 미리보기와 복사 실패 복구를 지원합니다. 원문과 파일은 브라우저에서 처리합니다.'

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  keywords: 'base64, base64url, 인코더, 디코더, UTF-8, data URL, 파일변환, 패딩, 바이너리변환',
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    type: 'website',
    siteName: '툴허브',
    url: 'https://toolhub.ai.kr/base64-converter/',
    locale: 'ko_KR',
    images: [{ url: 'https://toolhub.ai.kr/og/base64-converter.png', width: 1200, height: 630, alt: 'Base64 인코더/디코더' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: TITLE,
    description: DESCRIPTION,
    images: ['https://toolhub.ai.kr/og/base64-converter.png'],
  },
  alternates: {
    canonical: 'https://toolhub.ai.kr/base64-converter/',
  },
}

export default function Base64ConverterPage() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: 'Base64 변환기',
    description: DESCRIPTION,
    url: 'https://toolhub.ai.kr/base64-converter/',
    applicationCategory: 'DeveloperApplication',
    operatingSystem: 'Any',
    browserRequirements: 'JavaScript',
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'KRW' },
    featureList: ['표준 Base64·Base64URL 형식 선택', 'Base64URL 패딩 포함·생략', 'UTF-8 텍스트와 파일 바이트 변환', 'data URL·일반 Base64 복사 구분', '바이너리 다운로드와 검증된 이미지 미리보기', '실패한 복사의 수동 선택·재시도']
  }

  const faq = [
    { q: 'Base64 인코딩이란 무엇인가요?', a: 'Base64는 바이너리 데이터를 ASCII 문자열로 변환하는 인코딩 방식입니다. A-Z, a-z, 0-9, +, / 총 64개 문자를 사용하며, 패딩에 = 문자를 사용합니다. 주요 용도: ① 이메일 첨부파일(MIME) ② HTML/CSS에 이미지 인라인 삽입(data URI) ③ API 인증 토큰(Basic Auth) ④ JWT 토큰 페이로드. 인코딩 후 크기는 원본의 약 133%로 증가합니다.' },
    { q: 'Base64와 Base64URL의 차이는 무엇인가요?', a: 'Base64URL은 표준 알파벳의 +와 /를 -와 _로 바꿉니다. 이 도구의 표준 출력은 필요한 = 패딩을 포함하고 Base64URL 출력은 기본 생략 또는 포함을 선택할 수 있습니다. 디코딩은 올바른 생략 패딩과 스페이스·탭·LF·CR·폼 피드 공백을 허용하지만 혼합 알파벳, 잘못된 패딩과 마지막 비트는 거부합니다. 사용할 서비스가 요구하는 형식을 확인하세요.' },
    { q: '디코딩 결과가 글자로 표시되지 않으면 실패인가요?', a: '바이트 변환이 성공해도 결과가 유효한 UTF-8 텍스트가 아닐 수 있습니다. 이때는 바이너리 안내와 파일 다운로드를 제공합니다. PNG·JPEG·GIF·WebP 헤더에서 16,777,216픽셀 이하임을 확인하고 실제 이미지 로드까지 성공한 경우에만 미리보기를 보여줍니다. SVG·HTML은 화면에서 실행하지 않고 일반 파일로 다룹니다.' },
    { q: '파일과 data URL은 어떻게 변환하나요?', a: '인코딩 파일은 원래 바이트를 변환합니다. 디코딩 파일은 확장자보다 실제 UTF-8 내용과 크기·Base64 규칙을 검사합니다. data URL은 ;base64, 뒤의 표준 Base64를 해석하며 MIME 이름만으로 파일 유형이나 UTF-8 성공을 보장하지 않습니다. 인코딩할 파일·UTF-8 텍스트와 디코딩 결과는 4MiB, Base64 입력 문자열과 디코딩용 텍스트 파일은 6MiB까지입니다.' },
    { q: 'Base64로 변환하면 내용이 암호화되나요?', a: 'Base64는 암호화나 서명 검증이 아닙니다. 누구나 원래 바이트로 디코딩할 수 있습니다. 이 도구는 원문·파일·결과를 URL이나 기기 기록에 저장하지 않으며 브라우저에서 처리합니다. 복사 실패 시 결과를 직접 선택하거나 다시 복사할 수 있습니다.' },
  ]

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <I18nWrapper>
        <Base64Converter />
        <ToolFaq items={faq} />
        <div className="mt-8">

          <RelatedTools />

        </div>

      </I18nWrapper>
      {/* SEO 콘텐츠 */}
      <section className="max-w-4xl mx-auto px-4 pb-12">
        <div className="mt-12 border-t border-line pt-8">
          <h2 className="text-xl font-bold text-fg mb-4">
            Base64 인코더/디코더란?
          </h2>
          <p className="text-body leading-relaxed mb-6">
            Base64 변환기는 UTF-8 텍스트와 파일 바이트를 구분해 인코딩하고, Base64 문자열을 텍스트 또는 파일로 복원합니다. 표준 형식과 Base64URL을 선택할 수 있으며 일반 Base64 결과와 data URL 복사 대상을 구분합니다. 입력이나 형식을 바꾸면 이전 결과를 새 입력의 결과로 오인하지 않도록 다시 변환해야 합니다.
          </p>
          <h3 className="text-lg font-semibold text-fg mb-3">
            Base64 변환기 활용 팁
          </h3>
          <ul className="list-disc list-inside space-y-2 text-body">
            <li><strong>이미지 인라인 삽입:</strong> 작은 아이콘 이미지를 Base64로 변환해 CSS background-image나 HTML img src에 직접 삽입하면 HTTP 요청을 줄일 수 있습니다.</li>
            <li><strong>JWT 페이로드 확인:</strong> Base64URL로 인코딩된 부분을 디코딩할 수 있지만 서명이나 내용의 진위는 검증하지 않습니다.</li>
            <li><strong>Base64URL 선택:</strong> 사용할 서비스의 알파벳·패딩 정책에 맞춰 형식을 선택하세요. data URL은 별도로 표준 Base64를 사용합니다.</li>
            <li><strong>용량 증가 고려:</strong> Base64 인코딩 후 데이터 크기는 원본의 약 133%로 증가하므로, 대용량 파일 전송에는 적합하지 않습니다.</li>
            <li><strong>한글과 공백:</strong> 텍스트는 UTF-8로 처리하며 앞뒤 공백과 공백만 있는 입력도 보존합니다. 잘못된 UTF-8 바이트를 글자 성공으로 표시하지 않습니다.</li>
            <li><strong>파일 확인:</strong> 텍스트로 읽을 수 없는 결과도 파일로 다운로드할 수 있습니다. 미리보기 여부와 바이트 변환 성공은 별개입니다.</li>
          </ul>
        </div>
      </section>
    </>
  )
}
