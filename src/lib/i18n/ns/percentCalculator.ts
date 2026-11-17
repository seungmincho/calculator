import { registerMessages } from '@/lib/i18n'
import { loadTranslationFallback } from '@/lib/i18n/translationFetch'
import messages from '../../../../messages/generated/ko/ns/percentCalculator.json'

registerMessages(messages, context => context?.retry
  ? loadTranslationFallback('/i18n/en/ns/percentCalculator.d3983b5bd5de1782.json', ['percentCalculator'])
  : import('../../../../messages/generated/en/ns/percentCalculator.json').then(module => module.default))
