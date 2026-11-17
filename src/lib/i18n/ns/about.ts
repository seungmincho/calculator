import { registerMessages } from '@/lib/i18n'
import { loadTranslationFallback } from '@/lib/i18n/translationFetch'
import messages from '../../../../messages/generated/ko/ns/about.json'

registerMessages(messages, context => context?.retry
  ? loadTranslationFallback('/i18n/en/ns/about.0e23e364db9ccf03.json', ['about'])
  : import('../../../../messages/generated/en/ns/about.json').then(module => module.default))
