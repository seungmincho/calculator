import { registerMessages } from '@/lib/i18n'
import { loadTranslationFallback } from '@/lib/i18n/translationFetch'
import messages from '../../../../messages/generated/ko/ns/textToSpeech.json'

registerMessages(messages, context => context?.retry
  ? loadTranslationFallback('/i18n/en/ns/textToSpeech.ae21fd98501cd8c6.json', ['textToSpeech'])
  : import('../../../../messages/generated/en/ns/textToSpeech.json').then(module => module.default))
