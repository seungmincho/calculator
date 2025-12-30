import type { Metadata } from 'next'
import I18nWrapper from '@/components/I18nWrapper'
import CharacterCounter from '@/components/CharacterCounter'

export const metadata: Metadata = {
  title: '글자수 세기 - 글자수, 단어수, 문장수 카운터 | 툴허브',
  description: '텍스트의 글자수, 공백제외, 단어수, 문장수, 단락수를 실시간으로 계산합니다. SNS 글자수 제한 확인에 유용합니다.',
  keywords: '글자수세기, 글자수카운터, 단어수세기, 문자수세기, 텍스트분석, SNS글자수, 트위터글자수',
  openGraph: {
    title: '글자수 세기 - 실시간 텍스트 분석',
    description: '글자수, 단어수, 문장수를 실시간으로 분석하세요',
    type: 'website',
  },
}

export default function CharacterCounterPage() {
  return (
    <I18nWrapper>
      <CharacterCounter />
    </I18nWrapper>
  )
}
