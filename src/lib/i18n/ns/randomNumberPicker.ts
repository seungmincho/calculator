import { registerMessages } from '@/lib/i18n'
import { loadTranslationFallback } from '@/lib/i18n/translationFetch'
import messages from '../../../../messages/generated/ko/ns/randomNumberPicker.json'

registerMessages(messages, context => context?.retry
  ? loadTranslationFallback('/i18n/en/ns/randomNumberPicker.0d157a8bbc2610ec.json', ['randomNumberPicker'])
  : import('../../../../messages/generated/en/ns/randomNumberPicker.json').then(module => module.default))
