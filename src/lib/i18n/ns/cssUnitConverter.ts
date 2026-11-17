import { registerMessages } from '@/lib/i18n'
import { loadTranslationFallback } from '@/lib/i18n/translationFetch'
import messages from '../../../../messages/generated/ko/ns/cssUnitConverter.json'

registerMessages(messages, context => context?.retry
  ? loadTranslationFallback('/i18n/en/ns/cssUnitConverter.8094b3a4964bc8be.json', ['cssUnitConverter'])
  : import('../../../../messages/generated/en/ns/cssUnitConverter.json').then(module => module.default))
