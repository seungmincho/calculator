import { registerMessages } from '@/lib/i18n'
import { loadTranslationFallback } from '@/lib/i18n/translationFetch'
import messages from '../../../../messages/generated/ko/ns/csatDday.json'

registerMessages(messages, context => context?.retry
  ? loadTranslationFallback('/i18n/en/ns/csatDday.e7f0ec9f984c38a5.json', ['csatDday'])
  : import('../../../../messages/generated/en/ns/csatDday.json').then(module => module.default))
