import { registerMessages } from '@/lib/i18n'
import { loadTranslationFallback } from '@/lib/i18n/translationFetch'
import messages from '../../../../messages/generated/ko/ns/annualLeave.json'

registerMessages(messages, context => context?.retry
  ? loadTranslationFallback('/i18n/en/ns/annualLeave.76950330a1b579b1.json', ['annualLeave'])
  : import('../../../../messages/generated/en/ns/annualLeave.json').then(module => module.default))
