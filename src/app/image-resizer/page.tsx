import { Metadata } from 'next'
import I18nWrapper from '@/components/I18nWrapper';
import ImageResizerComponent from '@/components/ImageResizer';

export const metadata: Metadata = {
  title: '이미지 리사이저 | 툴허브 - 브라우저에서 이미지 크기 조정',
  description: '브라우저에서 바로 이미지 크기를 조정하고 다운로드하세요. 다양한 해상도와 포맷을 지원하며, 개인정보 보호를 위해 서버 업로드 없이 작동합니다.',
  keywords: '이미지리사이저, 이미지크기조정, 이미지압축, 사진리사이즈, 이미지편집, 온라인이미지도구',
  openGraph: {
    title: '이미지 리사이저 | 툴허브',
    description: '브라우저에서 바로 이미지 크기를 조정하고 다운로드하세요',
    url: 'https://toolhub.ai.kr/image-resizer',
    siteName: '툴허브',
    locale: 'ko_KR',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: '이미지 리사이저 | 툴허브',
    description: '브라우저에서 바로 이미지 크기를 조정하고 다운로드하세요',
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
    description: '브라우저에서 바로 이미지 크기를 조정하고 다운로드하세요. 다양한 해상도와 포맷을 지원하며, 개인정보 보호를 위해 서버 업로드 없이 작동합니다.',
    url: 'https://toolhub.ai.kr/image-resizer',
    applicationCategory: 'UtilityApplication',
    operatingSystem: 'Any',
    browserRequirements: 'JavaScript',
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'KRW' },
    featureList: ['이미지 크기 조정', '비율 유지', '다양한 포맷 지원', '브라우저에서 처리']
  }

  const faqJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
      {
        '@type': 'Question',
        name: '이미지 리사이즈 시 화질 손실을 최소화하는 방법은?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: '① 원본보다 크게 확대하지 않기 (업스케일링은 항상 화질 저하) ② 비율을 유지한 채 축소하기 ③ JPEG의 경우 품질 85% 이상 유지 ④ PNG는 무손실이므로 투명 배경이나 텍스트가 있는 이미지에 적합 ⑤ WebP는 같은 화질에서 JPEG보다 25-35% 작은 파일 크기를 제공합니다. 큰 이미지를 작게 축소하는 것은 화질 손실이 거의 없습니다.'
        }
      },
      {
        '@type': 'Question',
        name: '웹에 적합한 이미지 크기와 포맷은?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: '웹 이미지 권장 사항: 블로그/본문 이미지 800-1200px 너비, 히어로 이미지 1920px, 썸네일 300-400px. 포맷별 용도: JPEG는 사진, WebP는 웹 최적화(모든 모던 브라우저 지원), PNG는 투명 배경/로고, SVG는 아이콘/일러스트. 파일 크기는 페이지당 총 1MB 이내가 이상적이며, 지연 로딩(lazy loading)을 활용하세요.'
        }
      },
      {
        '@type': 'Question',
        name: 'JPEG, PNG, WebP 포맷의 차이점은?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'JPEG: 손실 압축, 사진에 최적, 투명 배경 불가, 파일 크기 작음. PNG: 무손실 압축, 투명 배경 지원, 텍스트/로고에 적합, 파일 크기 큼. WebP: 구글이 개발, 손실/무손실 모두 지원, 투명 배경 가능, JPEG 대비 25-35% 작음. AVIF: 차세대 포맷, WebP보다 20% 더 작지만 브라우저 지원이 제한적입니다.'
        }
      },
    ],
  }

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />
      <I18nWrapper>
        <ImageResizerComponent />
      </I18nWrapper>
      {/* SEO 콘텐츠 */}
      <section className="max-w-4xl mx-auto px-4 pb-12">
        <div className="mt-12 border-t border-gray-200 dark:border-gray-700 pt-8">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
            이미지 리사이저란?
          </h2>
          <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-6">
            이미지 리사이저는 사진이나 그림 파일의 크기(해상도)를 조정하는 온라인 도구입니다. 대용량 원본 이미지를 웹·블로그·SNS에 최적화된 크기로 축소하거나, JPEG·PNG·WebP 등 포맷을 변환할 수 있습니다. 모든 처리가 브라우저 내에서 이루어지므로 이미지가 서버에 업로드되지 않아 개인정보 보호에 안전합니다.
          </p>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
            이미지 리사이즈 활용 팁
          </h3>
          <ul className="list-disc list-inside space-y-2 text-gray-700 dark:text-gray-300">
            <li><strong>웹 최적화:</strong> 블로그·홈페이지 이미지는 너비 800~1200px로 줄이면 로딩 속도를 크게 향상시킬 수 있습니다.</li>
            <li><strong>이메일 첨부용:</strong> 스마트폰 사진은 보통 4~10MB인데, 너비 1200px로 리사이즈하면 수백 KB 수준으로 줄어듭니다.</li>
            <li><strong>비율 고정:</strong> 가로세로 비율 유지 옵션을 체크하면 이미지가 찌그러지지 않고 올바른 비율로 조정됩니다.</li>
            <li><strong>포맷 선택 팁:</strong> 사진은 JPEG, 투명 배경이 필요하면 PNG, 웹 최적화에는 WebP 형식을 사용하세요.</li>
            <li><strong>SNS 권장 크기:</strong> 인스타그램 정사각형 1080×1080px, 유튜브 썸네일 1280×720px, 카카오톡 프로필 640×640px가 적합합니다.</li>
          </ul>
        </div>
      </section>
    </>
  );
}