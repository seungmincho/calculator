import { registerMessages } from '@/lib/i18n'
import { loadTranslationFallback } from '@/lib/i18n/translationFetch'
import messages from '../../../../messages/generated/ko/ns/movingCost.json'

registerMessages(messages, context => context?.retry
  ? loadTranslationFallback('/i18n/en/ns/movingCost.09bd988496a998d1.json', ['movingCost'])
  : import('../../../../messages/generated/en/ns/movingCost.json').then(module => module.default))
