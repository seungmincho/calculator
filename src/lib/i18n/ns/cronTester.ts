import { registerMessages } from '@/lib/i18n'
import { loadTranslationFallback } from '@/lib/i18n/translationFetch'
import messages from '../../../../messages/generated/ko/ns/cronTester.json'

registerMessages(messages, context => context?.retry
  ? loadTranslationFallback('/i18n/en/ns/cronTester.05297586c22bfc18.json', ['cronTester'])
  : import('../../../../messages/generated/en/ns/cronTester.json').then(module => module.default))
