import { registerMessages } from '@/lib/i18n'
import { loadTranslationFallback } from '@/lib/i18n/translationFetch'
import messages from '../../../../messages/generated/ko/ns/rentTaxCredit.json'

registerMessages(messages, context => context?.retry
  ? loadTranslationFallback('/i18n/en/ns/rentTaxCredit.39f2e12574ba90bd.json', ['rentTaxCredit'])
  : import('../../../../messages/generated/en/ns/rentTaxCredit.json').then(module => module.default))
