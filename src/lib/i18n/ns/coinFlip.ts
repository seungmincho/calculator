import { registerMessages } from '@/lib/i18n'
import { loadTranslationFallback } from '@/lib/i18n/translationFetch'
import messages from '../../../../messages/generated/ko/ns/coinFlip.json'

registerMessages(messages, context => context?.retry
  ? loadTranslationFallback('/i18n/en/ns/coinFlip.594cc32378bdd925.json', ['coinFlip'])
  : import('../../../../messages/generated/en/ns/coinFlip.json').then(module => module.default))
