import { registerMessages } from '@/lib/i18n'
import { loadTranslationFallback } from '@/lib/i18n/translationFetch'
import messages from '../../../../messages/generated/ko/ns/sunriseSunset.json'

registerMessages(messages, context => context?.retry
  ? loadTranslationFallback('/i18n/en/ns/sunriseSunset.8cf6198eb7293f9b.json', ['sunriseSunset'])
  : import('../../../../messages/generated/en/ns/sunriseSunset.json').then(module => module.default))
