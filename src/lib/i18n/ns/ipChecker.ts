import { registerMessages } from '@/lib/i18n'
import { loadTranslationFallback } from '@/lib/i18n/translationFetch'
import messages from '../../../../messages/generated/ko/ns/ipChecker.json'

registerMessages(messages, context => context?.retry
  ? loadTranslationFallback('/i18n/en/ns/ipChecker.a1f02bf1f8dd9876.json', ['ipChecker'])
  : import('../../../../messages/generated/en/ns/ipChecker.json').then(module => module.default))
