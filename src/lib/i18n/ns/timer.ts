import { registerMessages } from '@/lib/i18n'
import { loadTranslationFallback } from '@/lib/i18n/translationFetch'
import messages from '../../../../messages/generated/ko/ns/timer.json'

registerMessages(messages, context => context?.retry
  ? loadTranslationFallback('/i18n/en/ns/timer.0f7e334b791168f4.json', ['timer'])
  : import('../../../../messages/generated/en/ns/timer.json').then(module => module.default))
