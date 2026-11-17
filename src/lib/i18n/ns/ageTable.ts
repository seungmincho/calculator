import { registerMessages } from '@/lib/i18n'
import { loadTranslationFallback } from '@/lib/i18n/translationFetch'
import messages from '../../../../messages/generated/ko/ns/ageTable.json'

registerMessages(messages, context => context?.retry
  ? loadTranslationFallback('/i18n/en/ns/ageTable.14672e5e662723b3.json', ['ageTable'])
  : import('../../../../messages/generated/en/ns/ageTable.json').then(module => module.default))
