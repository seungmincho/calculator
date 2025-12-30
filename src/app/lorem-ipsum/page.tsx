import type { Metadata } from 'next'
import I18nWrapper from '@/components/I18nWrapper'
import LoremIpsumGenerator from '@/components/LoremIpsumGenerator'

export const metadata: Metadata = {
  title: 'Lorem Ipsum 생성기 - 더미 텍스트 생성 | 툴허브',
  description: '웹 디자인과 개발에 사용할 Lorem Ipsum 더미 텍스트를 생성합니다. 한글 Lorem Ipsum도 지원합니다.',
  keywords: 'lorem ipsum, 더미텍스트, 채움글, 한글lorem, 테스트텍스트, placeholder text',
  openGraph: {
    title: 'Lorem Ipsum 생성기 - 더미 텍스트',
    description: '디자인용 더미 텍스트를 생성하세요',
    type: 'website',
  },
}

export default function LoremIpsumPage() {
  return (
    <I18nWrapper>
      <LoremIpsumGenerator />
    </I18nWrapper>
  )
}
