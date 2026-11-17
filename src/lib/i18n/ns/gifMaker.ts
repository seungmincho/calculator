import { registerMessages } from '@/lib/i18n'
import { loadTranslationFallback } from '@/lib/i18n/translationFetch'
import messages from '../../../../messages/generated/ko/ns/gifMaker.json'

registerMessages(messages, context => context?.retry
  ? loadTranslationFallback('/i18n/en/ns/gifMaker.e9e4d15add1b5986.json', ['gifMaker'])
  : import('../../../../messages/generated/en/ns/gifMaker.json').then(module => module.default))
