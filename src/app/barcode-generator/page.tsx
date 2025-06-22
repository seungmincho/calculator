import { Metadata } from 'next'
import BarcodeGenerator from '@/components/BarcodeGenerator'
import I18nWrapper from '@/components/I18nWrapper'

export const metadata: Metadata = {
  title: '바코드 생성기 | 툴허브',
  description: '다양한 형식의 바코드를 생성하고 다운로드하세요. EAN-13, CODE128, UPC 등 8가지 바코드 형식 지원. 제품 관리, 재고 관리, 이벤트 티켓 제작에 최적화',
  keywords: [
    '바코드 생성기',
    'barcode generator',
    'EAN-13 바코드',
    'CODE128 바코드',
    'UPC 바코드',
    '상품 바코드',
    '재고 관리 바코드',
    '바코드 제작',
    '바코드 다운로드',
    '무료 바코드 생성',
    'ITF-14 바코드',
    'CODE39 바코드',
    '바코드 프린트',
    '커스텀 바코드'
  ],
  openGraph: {
    title: '바코드 생성기 | 툴허브',
    description: '다양한 형식의 바코드를 생성하고 다운로드하세요. EAN-13, CODE128, UPC 등 8가지 바코드 형식 지원',
    type: 'website',
    locale: 'ko_KR',
    siteName: '툴허브'
  },
  twitter: {
    card: 'summary_large_image',
    title: '바코드 생성기 | 툴허브',
    description: '다양한 형식의 바코드를 생성하고 다운로드하세요. 제품 관리, 재고 관리에 최적화'
  },
  alternates: {
    canonical: 'https://toolhub.ai.kr/barcode-generator'
  }
}

export default function BarcodeGeneratorPage() {
  return (
    <I18nWrapper>
      <BarcodeGenerator />
    </I18nWrapper>
  )
}