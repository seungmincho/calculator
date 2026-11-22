import { registerMessages } from '@/lib/i18n'
import { loadTranslationFallback } from '@/lib/i18n/translationFetch'
import messages from '../../../../messages/generated/ko/ns/quitSmoking.json'

registerMessages(messages, context => context?.retry
  ? loadTranslationFallback('/i18n/en/ns/quitSmoking.4040c18d32b7284c.json', ['quitSmoking'])
  : import('../../../../messages/generated/en/ns/quitSmoking.json').then(module => module.default))
