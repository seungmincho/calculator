import { registerMessages } from '@/lib/i18n'
import { loadTranslationFallback } from '@/lib/i18n/translationFetch'
import messages from '../../../../messages/generated/ko/ns/barcodeGenerator.json'

registerMessages(messages, context => context?.retry
  ? loadTranslationFallback('/i18n/en/ns/barcodeGenerator.cfe01e321ac5ca62.json', ['barcodeGenerator'])
  : import('../../../../messages/generated/en/ns/barcodeGenerator.json').then(module => module.default))
