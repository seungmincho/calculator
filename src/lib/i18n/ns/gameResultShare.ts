import { registerMessages } from '@/lib/i18n'
import { loadTranslationFallback } from '@/lib/i18n/translationFetch'
import messages from '../../../../messages/generated/ko/ns/gameResultShare.json'

registerMessages(messages, context => context?.retry
  ? loadTranslationFallback('/i18n/en/ns/gameResultShare.d2caa1f67ab7fbdc.json', ['gameResultShare'])
  : import('../../../../messages/generated/en/ns/gameResultShare.json').then(module => module.default))
