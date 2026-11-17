import { registerMessages } from '@/lib/i18n'
import { loadTranslationFallback } from '@/lib/i18n/translationFetch'
import messages from '../../../../messages/generated/ko/ns/imageScraper.json'

registerMessages(messages, context => context?.retry
  ? loadTranslationFallback('/i18n/en/ns/imageScraper.d13443bbe5d179a3.json', ['imageScraper'])
  : import('../../../../messages/generated/en/ns/imageScraper.json').then(module => module.default))
