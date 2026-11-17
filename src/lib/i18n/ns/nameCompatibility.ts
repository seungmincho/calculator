import { registerMessages } from '@/lib/i18n'
import { loadTranslationFallback } from '@/lib/i18n/translationFetch'
import messages from '../../../../messages/generated/ko/ns/nameCompatibility.json'

registerMessages(messages, context => context?.retry
  ? loadTranslationFallback('/i18n/en/ns/nameCompatibility.24b8554e70ca8fa5.json', ['nameCompatibility'])
  : import('../../../../messages/generated/en/ns/nameCompatibility.json').then(module => module.default))
