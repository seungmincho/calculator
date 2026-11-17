import { registerMessages } from '@/lib/i18n'
import { loadTranslationFallback } from '@/lib/i18n/translationFetch'
import messages from '../../../../messages/generated/ko/ns/morseCode.json'

registerMessages(messages, context => context?.retry
  ? loadTranslationFallback('/i18n/en/ns/morseCode.4596b7f99b6a73f5.json', ['morseCode'])
  : import('../../../../messages/generated/en/ns/morseCode.json').then(module => module.default))
