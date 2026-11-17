import { registerMessages } from '@/lib/i18n'
import { loadTranslationFallback } from '@/lib/i18n/translationFetch'
import messages from '../../../../messages/generated/ko/ns/toastSpeech.json'

registerMessages(messages, context => context?.retry
  ? loadTranslationFallback('/i18n/en/ns/toastSpeech.1f3cd80688566472.json', ['toastSpeech'])
  : import('../../../../messages/generated/en/ns/toastSpeech.json').then(module => module.default))
