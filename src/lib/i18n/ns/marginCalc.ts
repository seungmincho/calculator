import { registerMessages } from '@/lib/i18n'
import { loadTranslationFallback } from '@/lib/i18n/translationFetch'
import messages from '../../../../messages/generated/ko/ns/marginCalc.json'

registerMessages(messages, context => context?.retry
  ? loadTranslationFallback('/i18n/en/ns/marginCalc.75362e4df074c4d8.json', ['marginCalc'])
  : import('../../../../messages/generated/en/ns/marginCalc.json').then(module => module.default))
