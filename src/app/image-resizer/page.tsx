import { Metadata } from 'next'
import I18nWrapper from '@/components/I18nWrapper'
import ImageResizerComponent from '@/components/ImageResizer';
import RelatedTools from '@/components/RelatedTools'
import { FaqJsonLd } from '@/components/ToolFaq'
import imageResizerMessages from '../../../messages/generated/ko/ns/imageResizer.json'

export const metadata: Metadata = {
  title: '이미지 리사이저 - 크기 조정 | 툴허브',
  description: '사진 용량 줄이기·크기 조절을 브라우저에서 바로. 픽셀·퍼센트 변경, 500KB 같은 목표 용량 맞추기, 증명사진·여권·SNS 프리셋, 여러 장 한꺼번에 ZIP 저장. 서버 업로드 없이 작동합니다.',
  keywords: '이미지 크기 조절, 사진 용량 줄이기, 증명사진 크기, 픽셀 변경, KB 줄이기, 이미지리사이저, 이미지크기조정, 이미지압축, 사진리사이즈, 이미지편집, 온라인이미지도구',
  openGraph: {
    title: '이미지 리사이저 | 툴허브',
    description: '사진 용량 줄이기·크기 조절, 목표 KB 맞추기, 증명사진 프리셋 — 서버 업로드 없음',
    url: 'https://toolhub.ai.kr/image-resizer/',
    siteName: '툴허브',
    locale: 'ko_KR',
    type: 'website',
    images: [{ url: 'https://toolhub.ai.kr/og/image-resizer.png', width: 1200, height: 630, alt: '이미지 리사이저' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: '이미지 리사이저 | 툴허브',
    description: '사진 용량 줄이기·크기 조절, 목표 KB 맞추기, 증명사진 프리셋 — 서버 업로드 없음',
    images: ['https://toolhub.ai.kr/og/image-resizer.png'],
  },
  alternates: {
    canonical: 'https://toolhub.ai.kr/image-resizer/',
  },
};

export default function ImageResizerPage() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: '이미지 리사이저',
    description: '사진 용량 줄이기·크기 조절을 브라우저에서 바로. 픽셀·퍼센트 변경, 500KB 같은 목표 용량 맞추기, 증명사진·여권·SNS 프리셋, 여러 장 한꺼번에 ZIP 저장. 서버 업로드 없이 작동합니다.',
    url: 'https://toolhub.ai.kr/image-resizer/',
    applicationCategory: 'UtilityApplication',
    operatingSystem: 'Any',
    browserRequirements: 'JavaScript',
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'KRW' },
    featureList: ['여러 장 한꺼번에', '픽셀·퍼센트·긴 변 기준', '목표 용량(KB 이하) 맞추기', '증명사진·여권·SNS 프리셋', '늘이기·맞춤·채우기', 'JPG·PNG·WebP', 'EXIF 회전 반영·메타데이터 제거', 'ZIP 다운로드', '서버 업로드 없음']
  }

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <FaqJsonLd items={imageResizerMessages.imageResizer.guide.faq.items} />
      <div className="min-h-screen py-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <I18nWrapper>
            <ImageResizerComponent />
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
            이미지 리사이저란?
          </h2>
          <p className="text-body leading-relaxed mb-6">
            이미지 리사이저는 사진이나 그림 파일의 크기(해상도)를 조정하는 온라인 도구입니다. 대용량 원본 이미지를 웹·블로그·SNS에 최적화된 크기로 축소하거나, JPEG·PNG·WebP 등 포맷을 변환할 수 있습니다. 모든 처리가 브라우저 내에서 이루어지므로 이미지가 서버에 업로드되지 않아 개인정보 보호에 안전합니다.
          </p>
          <h3 className="text-lg font-semibold text-fg mb-3">
            이미지 리사이즈 활용 팁
          </h3>
          <ul className="list-disc list-inside space-y-2 text-body">
            <li><strong>웹 최적화:</strong> 블로그·홈페이지 이미지는 너비 800~1200px로 줄이면 로딩 속도를 크게 향상시킬 수 있습니다.</li>
            <li><strong>이메일 첨부용:</strong> 스마트폰 사진은 보통 4~10MB인데, 너비 1200px로 리사이즈하면 수백 KB 수준으로 줄어듭니다.</li>
            <li><strong>비율 고정:</strong> 가로세로 비율 유지 옵션을 체크하면 이미지가 찌그러지지 않고 올바른 비율로 조정됩니다.</li>
            <li><strong>포맷 선택 팁:</strong> 사진은 JPEG, 투명 배경이 필요하면 PNG, 웹 최적화에는 WebP 형식을 사용하세요.</li>
            <li><strong>SNS 권장 크기:</strong> 인스타그램 정사각형 1080×1080px, 유튜브 썸네일 1280×720px, 카카오톡 프로필은 정사각형(예: 640×640px)으로 맞추면 잘리지 않습니다.</li>
          </ul>
        </div>
      </section>
    </>
  );
}