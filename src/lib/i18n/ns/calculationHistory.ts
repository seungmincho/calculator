import { registerMessages } from '@/lib/i18n'
import { loadTranslationFallback } from '@/lib/i18n/translationFetch'
import messages from '../../../../messages/generated/ko/ns/calculationHistory.json'

registerMessages(messages, context => context?.retry
  ? loadTranslationFallback('/i18n/en/ns/calculationHistory.1d9927e9bd86f324.json', ['calculationHistory'])
  : import('../../../../messages/generated/en/ns/calculationHistory.json').then(module => module.default))
