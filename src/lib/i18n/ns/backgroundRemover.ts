import { registerMessages } from '@/lib/i18n'
import { loadTranslationFallback } from '@/lib/i18n/translationFetch'
import messages from '../../../../messages/generated/ko/ns/backgroundRemover.json'

registerMessages(messages, context => context?.retry
  ? loadTranslationFallback('/i18n/en/ns/backgroundRemover.b51ea5b2585d4675.json', ['backgroundRemover'])
  : import('../../../../messages/generated/en/ns/backgroundRemover.json').then(module => module.default))
