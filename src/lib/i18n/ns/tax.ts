import { registerMessages } from '@/lib/i18n'
import { loadTranslationFallback } from '@/lib/i18n/translationFetch'
import messages from '../../../../messages/generated/ko/ns/tax.json'

registerMessages(messages, context => context?.retry
  ? loadTranslationFallback('/i18n/en/ns/tax.c85ed236ab9345e9.json', ['tax'])
  : import('../../../../messages/generated/en/ns/tax.json').then(module => module.default))
