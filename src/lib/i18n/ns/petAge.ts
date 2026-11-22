import { registerMessages } from '@/lib/i18n'
import { loadTranslationFallback } from '@/lib/i18n/translationFetch'
import messages from '../../../../messages/generated/ko/ns/petAge.json'

registerMessages(messages, context => context?.retry
  ? loadTranslationFallback('/i18n/en/ns/petAge.a20cd548a1fcacdb.json', ['petAge'])
  : import('../../../../messages/generated/en/ns/petAge.json').then(module => module.default))
