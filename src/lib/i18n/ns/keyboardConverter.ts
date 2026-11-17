import { registerMessages } from '@/lib/i18n'
import { loadTranslationFallback } from '@/lib/i18n/translationFetch'
import messages from '../../../../messages/generated/ko/ns/keyboardConverter.json'

registerMessages(messages, context => context?.retry
  ? loadTranslationFallback('/i18n/en/ns/keyboardConverter.c78e246a9849d679.json', ['keyboardConverter'])
  : import('../../../../messages/generated/en/ns/keyboardConverter.json').then(module => module.default))
