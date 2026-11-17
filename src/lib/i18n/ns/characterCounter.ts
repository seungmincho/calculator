import { registerMessages } from '@/lib/i18n'
import { loadTranslationFallback } from '@/lib/i18n/translationFetch'
import messages from '../../../../messages/generated/ko/ns/characterCounter.json'

registerMessages(messages, context => context?.retry
  ? loadTranslationFallback('/i18n/en/ns/characterCounter.37fc30d1fa64139c.json', ['characterCounter'])
  : import('../../../../messages/generated/en/ns/characterCounter.json').then(module => module.default))
