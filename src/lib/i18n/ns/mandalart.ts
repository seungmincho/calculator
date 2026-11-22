import { registerMessages } from '@/lib/i18n'
import { loadTranslationFallback } from '@/lib/i18n/translationFetch'
import messages from '../../../../messages/generated/ko/ns/mandalart.json'

registerMessages(messages, context => context?.retry
  ? loadTranslationFallback('/i18n/en/ns/mandalart.e3ef436c3d4a2f6f.json', ['mandalart'])
  : import('../../../../messages/generated/en/ns/mandalart.json').then(module => module.default))
