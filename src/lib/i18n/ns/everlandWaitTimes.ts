import { registerMessages } from '@/lib/i18n'
import { loadTranslationFallback } from '@/lib/i18n/translationFetch'
import messages from '../../../../messages/generated/ko/ns/everlandWaitTimes.json'

registerMessages(messages, context => context?.retry
  ? loadTranslationFallback('/i18n/en/ns/everlandWaitTimes.52b930a40b19faa1.json', ['everlandWaitTimes'])
  : import('../../../../messages/generated/en/ns/everlandWaitTimes.json').then(module => module.default))
