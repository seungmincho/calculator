import { registerMessages } from '@/lib/i18n'
import { loadTranslationFallback } from '@/lib/i18n/translationFetch'
import messages from '../../../../messages/generated/ko/ns/collageMaker.json'

registerMessages(messages, context => context?.retry
  ? loadTranslationFallback('/i18n/en/ns/collageMaker.4c038ed20f0f7e6f.json', ['collageMaker'])
  : import('../../../../messages/generated/en/ns/collageMaker.json').then(module => module.default))
