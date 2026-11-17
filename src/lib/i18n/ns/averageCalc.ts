import { registerMessages } from '@/lib/i18n'
import { loadTranslationFallback } from '@/lib/i18n/translationFetch'
import messages from '../../../../messages/generated/ko/ns/averageCalc.json'

registerMessages(messages, context => context?.retry
  ? loadTranslationFallback('/i18n/en/ns/averageCalc.400276cfc846f0b5.json', ['averageCalc'])
  : import('../../../../messages/generated/en/ns/averageCalc.json').then(module => module.default))
