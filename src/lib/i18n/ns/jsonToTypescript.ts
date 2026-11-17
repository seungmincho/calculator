import { registerMessages } from '@/lib/i18n'
import { loadTranslationFallback } from '@/lib/i18n/translationFetch'
import messages from '../../../../messages/generated/ko/ns/jsonToTypescript.json'

registerMessages(messages, context => context?.retry
  ? loadTranslationFallback('/i18n/en/ns/jsonToTypescript.5345217be326c7c9.json', ['jsonToTypescript'])
  : import('../../../../messages/generated/en/ns/jsonToTypescript.json').then(module => module.default))
