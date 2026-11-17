import { registerMessages } from '@/lib/i18n'
import { loadTranslationFallback } from '@/lib/i18n/translationFetch'
import messages from '../../../../messages/generated/ko/ns/inquiry.json'

registerMessages(messages, context => context?.retry
  ? loadTranslationFallback('/i18n/en/ns/inquiry.982a20e4e6b3016c.json', ['inquiry'])
  : import('../../../../messages/generated/en/ns/inquiry.json').then(module => module.default))
