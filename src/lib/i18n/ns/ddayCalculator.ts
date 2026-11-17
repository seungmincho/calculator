import { registerMessages } from '@/lib/i18n'
import { loadTranslationFallback } from '@/lib/i18n/translationFetch'
import messages from '../../../../messages/generated/ko/ns/ddayCalculator.json'

registerMessages(messages, context => context?.retry
  ? loadTranslationFallback('/i18n/en/ns/ddayCalculator.0353cfd8cdfdaefe.json', ['ddayCalculator'])
  : import('../../../../messages/generated/en/ns/ddayCalculator.json').then(module => module.default))
