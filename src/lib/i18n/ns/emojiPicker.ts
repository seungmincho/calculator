import { registerMessages } from '@/lib/i18n'
import { loadTranslationFallback } from '@/lib/i18n/translationFetch'
import messages from '../../../../messages/generated/ko/ns/emojiPicker.json'

registerMessages(messages, context => context?.retry
  ? loadTranslationFallback('/i18n/en/ns/emojiPicker.15c2a786cafba965.json', ['emojiPicker'])
  : import('../../../../messages/generated/en/ns/emojiPicker.json').then(module => module.default))
