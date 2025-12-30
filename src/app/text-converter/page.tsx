import type { Metadata } from 'next'
import I18nWrapper from '@/components/I18nWrapper'
import TextConverter from '@/components/TextConverter'

export const metadata: Metadata = {
  title: '텍스트 변환기 - 대소문자, 케이스 변환 | 툴허브',
  description: '텍스트 대소문자 변환, camelCase, snake_case, kebab-case 등 다양한 케이스 변환을 지원합니다.',
  keywords: '텍스트변환, 대소문자변환, camelcase, snakecase, kebabcase, 케이스변환, text converter',
  openGraph: {
    title: '텍스트 변환기 - 케이스 변환 도구',
    description: '다양한 텍스트 케이스를 손쉽게 변환하세요',
    type: 'website',
  },
}

export default function TextConverterPage() {
  return (
    <I18nWrapper>
      <TextConverter />
    </I18nWrapper>
  )
}
