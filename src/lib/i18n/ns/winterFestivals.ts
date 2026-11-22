import { registerMessages } from '@/lib/i18n'
import { loadTranslationFallback } from '@/lib/i18n/translationFetch'
import messages from '../../../../messages/generated/ko/ns/winterFestivals.json'

registerMessages(messages, context => context?.retry
  ? loadTranslationFallback('/i18n/en/ns/winterFestivals.e29311a1e21fd430.json', ['winterFestivals'])
  : import('../../../../messages/generated/en/ns/winterFestivals.json').then(module => module.default))
