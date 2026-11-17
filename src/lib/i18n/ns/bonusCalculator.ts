import { registerMessages } from '@/lib/i18n'
import { loadTranslationFallback } from '@/lib/i18n/translationFetch'
import messages from '../../../../messages/generated/ko/ns/bonusCalculator.json'

registerMessages(messages, context => context?.retry
  ? loadTranslationFallback('/i18n/en/ns/bonusCalculator.eaa8bfd5914b826f.json', ['bonusCalculator'])
  : import('../../../../messages/generated/en/ns/bonusCalculator.json').then(module => module.default))
