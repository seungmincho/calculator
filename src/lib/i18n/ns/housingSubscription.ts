import { registerMessages } from '@/lib/i18n'
import { loadTranslationFallback } from '@/lib/i18n/translationFetch'
import messages from '../../../../messages/generated/ko/ns/housingSubscription.json'

registerMessages(messages, context => context?.retry
  ? loadTranslationFallback('/i18n/en/ns/housingSubscription.e371da8e3b8d4558.json', ['housingSubscription'])
  : import('../../../../messages/generated/en/ns/housingSubscription.json').then(module => module.default))
