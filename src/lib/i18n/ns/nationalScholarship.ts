import { registerMessages } from '@/lib/i18n'
import { loadTranslationFallback } from '@/lib/i18n/translationFetch'
import messages from '../../../../messages/generated/ko/ns/nationalScholarship.json'

registerMessages(messages, context => context?.retry
  ? loadTranslationFallback('/i18n/en/ns/nationalScholarship.84cc01bad560d8fb.json', ['nationalScholarship'])
  : import('../../../../messages/generated/en/ns/nationalScholarship.json').then(module => module.default))
