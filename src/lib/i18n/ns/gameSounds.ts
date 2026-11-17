import { registerMessages } from '@/lib/i18n'
import { loadTranslationFallback } from '@/lib/i18n/translationFetch'
import messages from '../../../../messages/generated/ko/ns/gameSounds.json'

registerMessages(messages, context => context?.retry
  ? loadTranslationFallback('/i18n/en/ns/gameSounds.8e7fc67aa03c2e7a.json', ['gameSounds'])
  : import('../../../../messages/generated/en/ns/gameSounds.json').then(module => module.default))
