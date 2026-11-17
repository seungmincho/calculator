import { registerMessages } from '@/lib/i18n'
import { loadTranslationFallback } from '@/lib/i18n/translationFetch'
import messages from '../../../../messages/generated/ko/ns/randomPicker.json'

registerMessages(messages, context => context?.retry
  ? loadTranslationFallback('/i18n/en/ns/randomPicker.0b628488c5aad453.json', ['randomPicker'])
  : import('../../../../messages/generated/en/ns/randomPicker.json').then(module => module.default))
