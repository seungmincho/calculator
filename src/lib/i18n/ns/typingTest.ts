import { registerMessages } from '@/lib/i18n'
import { loadTranslationFallback } from '@/lib/i18n/translationFetch'
import messages from '../../../../messages/generated/ko/ns/typingTest.json'

registerMessages(messages, context => context?.retry
  ? loadTranslationFallback('/i18n/en/ns/typingTest.9092e88ec95803b0.json', ['typingTest'])
  : import('../../../../messages/generated/en/ns/typingTest.json').then(module => module.default))
