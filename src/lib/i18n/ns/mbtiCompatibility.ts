import { registerMessages } from '@/lib/i18n'
import { loadTranslationFallback } from '@/lib/i18n/translationFetch'
import messages from '../../../../messages/generated/ko/ns/mbtiCompatibility.json'

registerMessages(messages, context => context?.retry
  ? loadTranslationFallback('/i18n/en/ns/mbtiCompatibility.6f1109ace2b8f8e7.json', ['mbtiCompatibility'])
  : import('../../../../messages/generated/en/ns/mbtiCompatibility.json').then(module => module.default))
