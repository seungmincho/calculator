import { registerMessages } from '@/lib/i18n'
import { loadTranslationFallback } from '@/lib/i18n/translationFetch'
import messages from '../../../../messages/generated/ko/ns/eitc.json'

registerMessages(messages, context => context?.retry
  ? loadTranslationFallback('/i18n/en/ns/eitc.fd053a2c0812aa81.json', ['eitc'])
  : import('../../../../messages/generated/en/ns/eitc.json').then(module => module.default))
