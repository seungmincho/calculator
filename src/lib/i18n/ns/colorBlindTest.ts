import { registerMessages } from '@/lib/i18n'
import { loadTranslationFallback } from '@/lib/i18n/translationFetch'
import messages from '../../../../messages/generated/ko/ns/colorBlindTest.json'

registerMessages(messages, context => context?.retry
  ? loadTranslationFallback('/i18n/en/ns/colorBlindTest.86b2771034b35a66.json', ['colorBlindTest'])
  : import('../../../../messages/generated/en/ns/colorBlindTest.json').then(module => module.default))
