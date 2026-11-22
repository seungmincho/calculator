import { registerMessages } from '@/lib/i18n'
import { loadTranslationFallback } from '@/lib/i18n/translationFetch'
import messages from '../../../../messages/generated/ko/ns/mandalart.json'

registerMessages(messages, context => context?.retry
  ? loadTranslationFallback('/i18n/en/ns/mandalart.2b3d3c65d3ff5395.json', ['mandalart'])
  : import('../../../../messages/generated/en/ns/mandalart.json').then(module => module.default))
