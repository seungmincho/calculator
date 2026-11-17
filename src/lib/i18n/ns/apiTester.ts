import { registerMessages } from '@/lib/i18n'
import { loadTranslationFallback } from '@/lib/i18n/translationFetch'
import messages from '../../../../messages/generated/ko/ns/apiTester.json'

registerMessages(messages, context => context?.retry
  ? loadTranslationFallback('/i18n/en/ns/apiTester.dbafcda3643f3c30.json', ['apiTester'])
  : import('../../../../messages/generated/en/ns/apiTester.json').then(module => module.default))
