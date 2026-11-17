import { registerMessages } from '@/lib/i18n'
import { loadTranslationFallback } from '@/lib/i18n/translationFetch'
import messages from '../../../../messages/generated/ko/ns/numberToKorean.json'

registerMessages(messages, context => context?.retry
  ? loadTranslationFallback('/i18n/en/ns/numberToKorean.8414288a111b56f3.json', ['numberToKorean'])
  : import('../../../../messages/generated/en/ns/numberToKorean.json').then(module => module.default))
