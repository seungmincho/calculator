import { registerMessages } from '@/lib/i18n'
import { loadTranslationFallback } from '@/lib/i18n/translationFetch'
import messages from '../../../../messages/generated/ko/ns/menuPicker.json'

registerMessages(messages, context => context?.retry
  ? loadTranslationFallback('/i18n/en/ns/menuPicker.6f9a929819e85d37.json', ['menuPicker'])
  : import('../../../../messages/generated/en/ns/menuPicker.json').then(module => module.default))
