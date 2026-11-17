import { registerMessages } from '@/lib/i18n'
import { loadTranslationFallback } from '@/lib/i18n/translationFetch'
import messages from '../../../../messages/generated/ko/ns/dsrCalc.json'

registerMessages(messages, context => context?.retry
  ? loadTranslationFallback('/i18n/en/ns/dsrCalc.53a55fd7212b819d.json', ['dsrCalc'])
  : import('../../../../messages/generated/en/ns/dsrCalc.json').then(module => module.default))
