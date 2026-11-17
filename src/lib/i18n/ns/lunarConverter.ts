import { registerMessages } from '@/lib/i18n'
import { loadTranslationFallback } from '@/lib/i18n/translationFetch'
import messages from '../../../../messages/generated/ko/ns/lunarConverter.json'

registerMessages(messages, context => context?.retry
  ? loadTranslationFallback('/i18n/en/ns/lunarConverter.fe4cf684f63edcbe.json', ['lunarConverter'])
  : import('../../../../messages/generated/en/ns/lunarConverter.json').then(module => module.default))
