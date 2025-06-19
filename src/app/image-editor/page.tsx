import { Metadata } from 'next';
import ImageEditorComponent from '@/components/ImageEditor';

export const metadata: Metadata = {
  title: '이미지 편집기 | 툴허브 - 브라우저에서 이미지 편집',
  description: '브라우저에서 바로 이미지를 편집하세요. 크롭, 회전, 필터, 텍스트 추가 등 다양한 편집 기능을 제공하며, 서버 업로드 없이 안전하게 작동합니다.',
  keywords: '이미지편집기, 사진편집, 이미지크롭, 이미지필터, 온라인편집기, 이미지회전, 텍스트추가',
  openGraph: {
    title: '이미지 편집기 | 툴허브',
    description: '브라우저에서 바로 이미지를 편집하고 다운로드하세요',
    url: 'https://toolhub.ai.kr/image-editor',
    siteName: '툴허브',
    locale: 'ko_KR',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: '이미지 편집기 | 툴허브',
    description: '브라우저에서 바로 이미지를 편집하고 다운로드하세요',
  },
  alternates: {
    canonical: 'https://toolhub.ai.kr/image-editor',
  },
};

export default function ImageEditorPage() {
  return <ImageEditorComponent />;
}