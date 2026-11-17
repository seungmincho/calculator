import { registerMessages } from '@/lib/i18n'
import { loadTranslationFallback } from '@/lib/i18n/translationFetch'
import messages from '../../../../messages/generated/ko/ns/worldClock.json'

registerMessages(messages, context => context?.retry
  ? loadTranslationFallback('/i18n/en/ns/worldClock.bb56713b21fe4606.json', ['worldClock'])
  : import('../../../../messages/generated/en/ns/worldClock.json').then(module => module.default))
