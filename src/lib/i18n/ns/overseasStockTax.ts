import { registerMessages } from '@/lib/i18n'
import { loadTranslationFallback } from '@/lib/i18n/translationFetch'
import messages from '../../../../messages/generated/ko/ns/overseasStockTax.json'

registerMessages(messages, context => context?.retry
  ? loadTranslationFallback('/i18n/en/ns/overseasStockTax.fc083667c1c28118.json', ['overseasStockTax'])
  : import('../../../../messages/generated/en/ns/overseasStockTax.json').then(module => module.default))
