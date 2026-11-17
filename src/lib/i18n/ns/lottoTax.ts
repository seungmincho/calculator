import { registerMessages } from '@/lib/i18n'
import { loadTranslationFallback } from '@/lib/i18n/translationFetch'
import messages from '../../../../messages/generated/ko/ns/lottoTax.json'

registerMessages(messages, context => context?.retry
  ? loadTranslationFallback('/i18n/en/ns/lottoTax.b437c57347c6136f.json', ['lottoTax'])
  : import('../../../../messages/generated/en/ns/lottoTax.json').then(module => module.default))
