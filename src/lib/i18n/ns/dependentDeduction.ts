import { registerMessages } from '@/lib/i18n'
import { loadTranslationFallback } from '@/lib/i18n/translationFetch'
import messages from '../../../../messages/generated/ko/ns/dependentDeduction.json'

registerMessages(messages, context => context?.retry
  ? loadTranslationFallback('/i18n/en/ns/dependentDeduction.50db5966f574816c.json', ['dependentDeduction'])
  : import('../../../../messages/generated/en/ns/dependentDeduction.json').then(module => module.default))
