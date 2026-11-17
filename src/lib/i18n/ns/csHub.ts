import { registerMessages } from '@/lib/i18n'
import { loadTranslationFallback } from '@/lib/i18n/translationFetch'
import messages from '../../../../messages/generated/ko/ns/csHub.json'

registerMessages(messages, context => context?.retry
  ? loadTranslationFallback('/i18n/en/ns/csHub.df1311f6eabae9f7.json', ['csHub'])
  : import('../../../../messages/generated/en/ns/csHub.json').then(module => module.default))
