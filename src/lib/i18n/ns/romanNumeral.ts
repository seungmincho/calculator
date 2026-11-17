import { registerMessages } from '@/lib/i18n'
import { loadTranslationFallback } from '@/lib/i18n/translationFetch'
import messages from '../../../../messages/generated/ko/ns/romanNumeral.json'

registerMessages(messages, context => context?.retry
  ? loadTranslationFallback('/i18n/en/ns/romanNumeral.4ed138a998168dab.json', ['romanNumeral'])
  : import('../../../../messages/generated/en/ns/romanNumeral.json').then(module => module.default))
