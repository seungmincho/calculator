import { registerMessages } from '@/lib/i18n'
import { loadTranslationFallback } from '@/lib/i18n/translationFetch'
import messages from '../../../../messages/generated/ko/ns/interiorCalc.json'

registerMessages(messages, context => context?.retry
  ? loadTranslationFallback('/i18n/en/ns/interiorCalc.a544d71281805e07.json', ['interiorCalc'])
  : import('../../../../messages/generated/en/ns/interiorCalc.json').then(module => module.default))
