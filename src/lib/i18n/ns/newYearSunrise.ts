import { registerMessages } from '@/lib/i18n'
import { loadTranslationFallback } from '@/lib/i18n/translationFetch'
import messages from '../../../../messages/generated/ko/ns/newYearSunrise.json'

registerMessages(messages, context => context?.retry
  ? loadTranslationFallback('/i18n/en/ns/newYearSunrise.d4fa3843569a7e26.json', ['newYearSunrise'])
  : import('../../../../messages/generated/en/ns/newYearSunrise.json').then(module => module.default))
