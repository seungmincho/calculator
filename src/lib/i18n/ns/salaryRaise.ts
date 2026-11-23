import { registerMessages } from '@/lib/i18n'
import { loadTranslationFallback } from '@/lib/i18n/translationFetch'
import messages from '../../../../messages/generated/ko/ns/salaryRaise.json'

registerMessages(messages, context => context?.retry
  ? loadTranslationFallback('/i18n/en/ns/salaryRaise.4b14599b2b2b2648.json', ['salaryRaise'])
  : import('../../../../messages/generated/en/ns/salaryRaise.json').then(module => module.default))
