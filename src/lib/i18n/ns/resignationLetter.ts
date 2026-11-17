import { registerMessages } from '@/lib/i18n'
import { loadTranslationFallback } from '@/lib/i18n/translationFetch'
import messages from '../../../../messages/generated/ko/ns/resignationLetter.json'

registerMessages(messages, context => context?.retry
  ? loadTranslationFallback('/i18n/en/ns/resignationLetter.c25f9b704a1d0c00.json', ['resignationLetter'])
  : import('../../../../messages/generated/en/ns/resignationLetter.json').then(module => module.default))
