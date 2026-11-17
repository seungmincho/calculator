import { registerMessages } from '@/lib/i18n'
import { loadTranslationFallback } from '@/lib/i18n/translationFetch'
import messages from '../../../../messages/generated/ko/ns/jeongsi2027.json'

registerMessages(messages, context => context?.retry
  ? loadTranslationFallback('/i18n/en/ns/jeongsi2027.2ffb0f80682201bc.json', ['jeongsi2027'])
  : import('../../../../messages/generated/en/ns/jeongsi2027.json').then(module => module.default))
