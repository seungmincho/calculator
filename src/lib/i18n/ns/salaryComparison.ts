import { registerMessages } from '@/lib/i18n'
import { loadTranslationFallback } from '@/lib/i18n/translationFetch'
import messages from '../../../../messages/generated/ko/ns/salaryComparison.json'

registerMessages(messages, context => context?.retry
  ? loadTranslationFallback('/i18n/en/ns/salaryComparison.979ba6a9b0ee6867.json', ['salaryComparison'])
  : import('../../../../messages/generated/en/ns/salaryComparison.json').then(module => module.default))
