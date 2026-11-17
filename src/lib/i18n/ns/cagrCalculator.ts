import { registerMessages } from '@/lib/i18n'
import { loadTranslationFallback } from '@/lib/i18n/translationFetch'
import messages from '../../../../messages/generated/ko/ns/cagrCalculator.json'

registerMessages(messages, context => context?.retry
  ? loadTranslationFallback('/i18n/en/ns/cagrCalculator.3cfcf3629e63a29a.json', ['cagrCalculator'])
  : import('../../../../messages/generated/en/ns/cagrCalculator.json').then(module => module.default))
