import { registerMessages } from '@/lib/i18n'
import { loadTranslationFallback } from '@/lib/i18n/translationFetch'
import messages from '../../../../messages/generated/ko/ns/ageCalculator.json'

registerMessages(messages, context => context?.retry
  ? loadTranslationFallback('/i18n/en/ns/ageCalculator.44c82cea41491cb6.json', ['ageCalculator'])
  : import('../../../../messages/generated/en/ns/ageCalculator.json').then(module => module.default))
