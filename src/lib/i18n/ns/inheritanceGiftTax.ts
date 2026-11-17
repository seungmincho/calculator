import { registerMessages } from '@/lib/i18n'
import { loadTranslationFallback } from '@/lib/i18n/translationFetch'
import messages from '../../../../messages/generated/ko/ns/inheritanceGiftTax.json'

registerMessages(messages, context => context?.retry
  ? loadTranslationFallback('/i18n/en/ns/inheritanceGiftTax.ebec8f31601fff7f.json', ['inheritanceGiftTax'])
  : import('../../../../messages/generated/en/ns/inheritanceGiftTax.json').then(module => module.default))
