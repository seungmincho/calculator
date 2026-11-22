import { registerMessages } from '@/lib/i18n'
import { loadTranslationFallback } from '@/lib/i18n/translationFetch'
import messages from '../../../../messages/generated/ko/ns/babyVaccination.json'

registerMessages(messages, context => context?.retry
  ? loadTranslationFallback('/i18n/en/ns/babyVaccination.13fe76d89066dcf5.json', ['babyVaccination'])
  : import('../../../../messages/generated/en/ns/babyVaccination.json').then(module => module.default))
