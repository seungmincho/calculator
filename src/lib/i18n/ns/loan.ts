import { registerMessages } from '@/lib/i18n'
import { loadTranslationFallback } from '@/lib/i18n/translationFetch'
import messages from '../../../../messages/generated/ko/ns/loan.json'

registerMessages(messages, context => context?.retry
  ? loadTranslationFallback('/i18n/en/ns/loan.de7c709886186299.json', ['loan'])
  : import('../../../../messages/generated/en/ns/loan.json').then(module => module.default))
