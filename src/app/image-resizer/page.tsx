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
    canonical: 'https://toolhub.ai.kr/image-resizer',
  },
};

export default function ImageResizerPage() {
  return <I18nWrapper>
        <ImageResizerComponent />
      </I18nWrapper>;
}