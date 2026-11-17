import { registerMessages } from '@/lib/i18n'
import { loadTranslationFallback } from '@/lib/i18n/translationFetch'
import messages from '../../../../messages/generated/ko/ns/colorPalette.json'

registerMessages(messages, context => context?.retry
  ? loadTranslationFallback('/i18n/en/ns/colorPalette.d6da6561a3a00cef.json', ['colorPalette'])
  : import('../../../../messages/generated/en/ns/colorPalette.json').then(module => module.default))
