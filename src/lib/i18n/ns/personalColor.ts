import { registerMessages } from '@/lib/i18n'
import { loadTranslationFallback } from '@/lib/i18n/translationFetch'
import messages from '../../../../messages/generated/ko/ns/personalColor.json'

registerMessages(messages, context => context?.retry
  ? loadTranslationFallback('/i18n/en/ns/personalColor.366d5047973549b8.json', ['personalColor'])
  : import('../../../../messages/generated/en/ns/personalColor.json').then(module => module.default))
