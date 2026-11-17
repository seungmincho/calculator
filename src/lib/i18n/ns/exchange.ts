import { registerMessages } from '@/lib/i18n'
import { loadTranslationFallback } from '@/lib/i18n/translationFetch'
import messages from '../../../../messages/generated/ko/ns/exchange.json'

registerMessages(messages, context => context?.retry
  ? loadTranslationFallback('/i18n/en/ns/exchange.e82fe6f64cf4ff7b.json', ['exchange'])
  : import('../../../../messages/generated/en/ns/exchange.json').then(module => module.default))
