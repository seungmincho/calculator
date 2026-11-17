import { registerMessages } from '@/lib/i18n'
import { loadTranslationFallback } from '@/lib/i18n/translationFetch'
import messages from '../../../../messages/generated/ko/ns/bodyFat.json'

registerMessages(messages, context => context?.retry
  ? loadTranslationFallback('/i18n/en/ns/bodyFat.7a3c50d8b1333293.json', ['bodyFat'])
  : import('../../../../messages/generated/en/ns/bodyFat.json').then(module => module.default))
