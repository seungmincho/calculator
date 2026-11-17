import { registerMessages } from '@/lib/i18n'
import { loadTranslationFallback } from '@/lib/i18n/translationFetch'
import messages from '../../../../messages/generated/ko/ns/ovulationCalculator.json'

registerMessages(messages, context => context?.retry
  ? loadTranslationFallback('/i18n/en/ns/ovulationCalculator.0c1fea005cd75eac.json', ['ovulationCalculator'])
  : import('../../../../messages/generated/en/ns/ovulationCalculator.json').then(module => module.default))
