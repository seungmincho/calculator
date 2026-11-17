import { registerMessages } from '@/lib/i18n'
import { loadTranslationFallback } from '@/lib/i18n/translationFetch'
import messages from '../../../../messages/generated/ko/ns/vatCalculator.json'

registerMessages(messages, context => context?.retry
  ? loadTranslationFallback('/i18n/en/ns/vatCalculator.165d525d091eb5ac.json', ['vatCalculator'])
  : import('../../../../messages/generated/en/ns/vatCalculator.json').then(module => module.default))
