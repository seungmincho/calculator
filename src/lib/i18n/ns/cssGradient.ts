import { registerMessages } from '@/lib/i18n'
import { loadTranslationFallback } from '@/lib/i18n/translationFetch'
import messages from '../../../../messages/generated/ko/ns/cssGradient.json'

registerMessages(messages, context => context?.retry
  ? loadTranslationFallback('/i18n/en/ns/cssGradient.3a5e11baba04a152.json', ['cssGradient'])
  : import('../../../../messages/generated/en/ns/cssGradient.json').then(module => module.default))
