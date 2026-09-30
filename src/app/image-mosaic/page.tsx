import { Metadata } from 'next'
import ImageMosaic from '@/components/ImageMosaic'
import I18nWrapper from '@/components/I18nWrapper'
import RelatedTools from '@/components/RelatedTools'

export const metadata: Metadata = {
  title: '얼굴 블러 처리 · 사진 모자이크 - 무료 온라인 | 툴허브',
  description: '스크린샷·사진 속 얼굴, 번호판, 이름, 주소를 모자이크·블러·검정 박스로 가리기. Ctrl+V 붙여넣기, 여러 영역 편집, EXIF(GPS) 제거 저장. 서버 전송 없이 브라우저에서 처리.',
  keywords: '모자이크, 블러, 사진 모자이크, 이미지 블러, 얼굴 모자이크, 번호판 가리기, 스크린샷 개인정보 가리기, 캡처 모자이크, EXIF 제거, 개인정보 보호',
  openGraph: {
    title: '사진 모자이크/블러 | 툴허브',
    description: '사진에 모자이크/블러를 간편하게 적용하세요!',
    url: 'https://toolhub.ai.kr/image-mosaic',
    siteName: '툴허브', locale: 'ko_KR', type: 'website',
    images: [{ url: 'https://toolhub.ai.kr/og/image-mosaic.png', width: 1200, height: 630, alt: '사진 모자이크/블러' }],
  },
  twitter: { card: 'summary_large_image', title: '사진 모자이크/블러 | 툴허브', description: '사진에 모자이크/블러를 적용하세요!', images: ['https://toolhub.ai.kr/og/image-mosaic.png'] },
  alternates: { canonical: 'https://toolhub.ai.kr/image-mosaic/' },
}

export default function ImageMosaicPage() {
  const jsonLd = {
    '@context': 'https://schema.org', '@type': 'WebApplication',
    name: '사진 모자이크/블러', description: '사진 모자이크 및 블러 처리 도구',
    url: 'https://toolhub.ai.kr/image-mosaic', applicationCategory: 'MultimediaApplication',
    operatingSystem: 'Any', browserRequirements: 'JavaScript',
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'KRW' },
    featureList: ['Ctrl+V 스크린샷 붙여넣기', '사각형·원형·브러시 영역', '모자이크·블러·검정/흰색 박스', '영역 이동·크기 조절·삭제', '되돌리기/다시 실행', '확대/축소', 'EXIF(GPS) 제거 PNG/JPG 저장', '클립보드 복사'],
  }
  const faqJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
      { '@type': 'Question', name: '이미지 모자이크란 무엇인가요?', acceptedAnswer: { '@type': 'Answer', text: '이미지 모자이크(픽셀화)는 특정 영역을 큰 블록으로 바꿔 알아볼 수 없게 만드는 기법입니다. 얼굴, 번호판, 주소 등을 가릴 때 쓰며, 이 도구는 브라우저에서 처리하므로 이미지가 서버로 전송되지 않습니다.' } },
      { '@type': 'Question', name: '모자이크한 글자를 복원할 수 있나요?', acceptedAnswer: { '@type': 'Answer', text: '블록이 작은 모자이크나 약한 블러는 글자 형태가 남아 추정될 수 있습니다. 이름·전화번호·주소·번호판 같은 텍스트는 검정 또는 흰색 박스로 가리는 것이 가장 안전합니다.' } },
      { '@type': 'Question', name: '저장하면 사진의 GPS 위치 정보도 지워지나요?', acceptedAnswer: { '@type': 'Answer', text: '네. 저장·복사 시 픽셀만 새로 인코딩하므로 원본의 EXIF(GPS 위치, 촬영 기기, 날짜) 정보는 결과 파일에 포함되지 않습니다.' } },
    ],
  }
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />
      <div className="min-h-screen py-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <I18nWrapper>
            <ImageMosaic />
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
            사진 모자이크·블러 처리란?
          </h2>
          <p className="text-body leading-relaxed mb-6">
            사진 모자이크 및 블러 처리 도구는 이미지의 특정 영역을 픽셀화하거나 흐릿하게 만들어 개인정보나 민감한 정보를 가리는 온라인 도구입니다. 얼굴, 차량 번호판, 주민등록번호, 주소 등을 공개 전에 가릴 때 필수적으로 사용되며, 모든 처리가 브라우저에서 이루어져 이미지가 외부 서버에 전송되지 않습니다.
          </p>
          <h3 className="text-lg font-semibold text-fg mb-3">
            모자이크·블러 활용 팁
          </h3>
          <ul className="list-disc list-inside space-y-2 text-body">
            <li><strong>얼굴 모자이크:</strong> 사진에 찍힌 타인의 얼굴을 SNS나 블로그 업로드 전에 모자이크 처리하여 초상권을 보호하세요.</li>
            <li><strong>스크린샷 붙여넣기:</strong> 캡처 후 Ctrl+V만 누르면 바로 불러와집니다. 카톡·문자 캡처 속 이름과 전화번호를 가리고 클립보드로 복사해 그대로 붙여넣으세요.</li>
            <li><strong>번호판·글자는 단색 박스:</strong> 약한 모자이크나 블러는 글자가 복원될 수 있으니 번호판, 주민등록번호, 계좌번호는 검정 박스로 완전히 덮으세요.</li>
            <li><strong>위치 정보 제거:</strong> 저장할 때 새로 인코딩되어 사진의 EXIF(GPS 위치·촬영 기기) 정보가 함께 지워집니다.</li>
            <li><strong>브러시 모드 활용:</strong> 복잡한 형태의 영역은 브러시 모드로 자유롭게 칠하여 정밀하게 처리할 수 있습니다.</li>
            <li><strong>강도 조절:</strong> 모자이크 블록 크기나 블러 강도를 조절하여 자연스러운 결과물을 만드세요.</li>
          </ul>
        </div>
      </section>
    </>
  )
}
