import { registerMessages } from '@/lib/i18n'
import { loadTranslationFallback } from '@/lib/i18n/translationFetch'
import messages from '../../../../messages/generated/ko/ns/receiptGenerator.json'

registerMessages(messages, context => context?.retry
  ? loadTranslationFallback('/i18n/en/ns/receiptGenerator.ca8ccc00e057b6cb.json', ['receiptGenerator'])
  : import('../../../../messages/generated/en/ns/receiptGenerator.json').then(module => module.default))
