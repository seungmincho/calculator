import { registerMessages } from '@/lib/i18n'
import { loadTranslationFallback } from '@/lib/i18n/translationFetch'
import messages from '../../../../messages/generated/ko/ns/exerciseCalorie.json'

registerMessages(messages, context => context?.retry
  ? loadTranslationFallback('/i18n/en/ns/exerciseCalorie.a957bd4512919498.json', ['exerciseCalorie'])
  : import('../../../../messages/generated/en/ns/exerciseCalorie.json').then(module => module.default))
