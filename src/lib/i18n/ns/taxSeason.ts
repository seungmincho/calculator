import { registerMessages } from '@/lib/i18n'
import { loadTranslationFallback } from '@/lib/i18n/translationFetch'
import messages from '../../../../messages/generated/ko/ns/taxSeason.json'

registerMessages(messages, context => context?.retry
  ? loadTranslationFallback('/i18n/en/ns/taxSeason.1f52e7fbae61ea7f.json', ['taxSeason'])
  : import('../../../../messages/generated/en/ns/taxSeason.json').then(module => module.default))
