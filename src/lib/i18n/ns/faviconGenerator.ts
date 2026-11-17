import { registerMessages } from '@/lib/i18n'
import { loadTranslationFallback } from '@/lib/i18n/translationFetch'
import messages from '../../../../messages/generated/ko/ns/faviconGenerator.json'

registerMessages(messages, context => context?.retry
  ? loadTranslationFallback('/i18n/en/ns/faviconGenerator.e09a55484114d572.json', ['faviconGenerator'])
  : import('../../../../messages/generated/en/ns/faviconGenerator.json').then(module => module.default))
