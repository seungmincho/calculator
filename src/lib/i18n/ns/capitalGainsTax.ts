import { registerMessages } from '@/lib/i18n'
import { loadTranslationFallback } from '@/lib/i18n/translationFetch'
import messages from '../../../../messages/generated/ko/ns/capitalGainsTax.json'

registerMessages(messages, context => context?.retry
  ? loadTranslationFallback('/i18n/en/ns/capitalGainsTax.1a46e4a8e27add90.json', ['capitalGainsTax'])
  : import('../../../../messages/generated/en/ns/capitalGainsTax.json').then(module => module.default))
