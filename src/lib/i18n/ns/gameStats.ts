import { registerMessages } from '@/lib/i18n'
import { loadTranslationFallback } from '@/lib/i18n/translationFetch'
import messages from '../../../../messages/generated/ko/ns/gameStats.json'

registerMessages(messages, context => context?.retry
  ? loadTranslationFallback('/i18n/en/ns/gameStats.95bcda836154241d.json', ['gameStats'])
  : import('../../../../messages/generated/en/ns/gameStats.json').then(module => module.default))
