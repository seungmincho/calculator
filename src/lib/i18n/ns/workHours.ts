import { registerMessages } from '@/lib/i18n'
import { loadTranslationFallback } from '@/lib/i18n/translationFetch'
import messages from '../../../../messages/generated/ko/ns/workHours.json'

registerMessages(messages, context => context?.retry
  ? loadTranslationFallback('/i18n/en/ns/workHours.182a6651e71e2da7.json', ['workHours'])
  : import('../../../../messages/generated/en/ns/workHours.json').then(module => module.default))
