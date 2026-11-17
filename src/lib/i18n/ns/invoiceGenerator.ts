import { registerMessages } from '@/lib/i18n'
import { loadTranslationFallback } from '@/lib/i18n/translationFetch'
import messages from '../../../../messages/generated/ko/ns/invoiceGenerator.json'

registerMessages(messages, context => context?.retry
  ? loadTranslationFallback('/i18n/en/ns/invoiceGenerator.7acf65ac2116ef2c.json', ['invoiceGenerator'])
  : import('../../../../messages/generated/en/ns/invoiceGenerator.json').then(module => module.default))
