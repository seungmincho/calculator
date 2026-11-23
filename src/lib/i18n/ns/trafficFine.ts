import { registerMessages } from '@/lib/i18n'
import { loadTranslationFallback } from '@/lib/i18n/translationFetch'
import messages from '../../../../messages/generated/ko/ns/trafficFine.json'

registerMessages(messages, context => context?.retry
  ? loadTranslationFallback('/i18n/en/ns/trafficFine.e9a75df700ddd50c.json', ['trafficFine'])
  : import('../../../../messages/generated/en/ns/trafficFine.json').then(module => module.default))
