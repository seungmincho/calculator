import type { Metadata } from 'next'
import I18nWrapper from '@/components/I18nWrapper'
import UrlEncoder from '@/components/UrlEncoder'

export const metadata: Metadata = {
  title: 'URL 인코더/디코더 - URL 인코딩/디코딩 변환기 | 툴허브',
  description: 'URL 인코딩/디코딩 도구. URL 파라미터를 안전하게 인코딩하거나 인코딩된 URL을 원본으로 디코딩합니다. URL 분석 기능 포함.',
  keywords: 'url인코더, url디코더, url인코딩, url디코딩, 퍼센트인코딩, urlencode, urldecode',
  openGraph: {
    title: 'URL 인코더/디코더 - 온라인 URL 변환 도구',
    description: 'URL을 안전하게 인코딩/디코딩하세요',
    type: 'website',
  },
}

export default function UrlEncoderPage() {
  return (
    <I18nWrapper>
      <UrlEncoder />
    </I18nWrapper>
  )
}
