import { registerMessages } from '@/lib/i18n'
import { loadTranslationFallback } from '@/lib/i18n/translationFetch'
import messages from '../../../../messages/generated/ko/ns/salaryRank.json'

registerMessages(messages, context => context?.retry
  ? loadTranslationFallback('/i18n/en/ns/salaryRank.7eee74bdb0e1ab3c.json', ['salaryRank'])
  : import('../../../../messages/generated/en/ns/salaryRank.json').then(module => module.default))
