import type { Metadata } from 'next'
import I18nWrapper from '@/components/I18nWrapper'
import Base64Converter from '@/components/Base64Converter'

export const metadata: Metadata = {
  title: 'Base64 인코더/디코더 - 텍스트, 이미지 변환 | 툴허브',
  description: 'Base64 인코딩/디코딩 도구. 텍스트를 Base64로 변환하거나 Base64를 원본으로 복원합니다. 이미지 파일도 지원합니다.',
  keywords: 'base64, 인코더, 디코더, 인코딩, 디코딩, 변환, 이미지변환, 텍스트변환',
  openGraph: {
    title: 'Base64 인코더/디코더 - 온라인 변환 도구',
    description: '텍스트와 파일을 Base64로 인코딩/디코딩하세요',
    type: 'website',
  },
}

export default function Base64ConverterPage() {
  return (
    <I18nWrapper>
      <Base64Converter />
    </I18nWrapper>
  )
}
