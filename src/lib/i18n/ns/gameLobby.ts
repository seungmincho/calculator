import { registerMessages } from '@/lib/i18n'
import { loadTranslationFallback } from '@/lib/i18n/translationFetch'
import messages from '../../../../messages/generated/ko/ns/gameLobby.json'

registerMessages(messages, context => context?.retry
  ? loadTranslationFallback('/i18n/en/ns/gameLobby.d909a0a4be5a197a.json', ['gameLobby'])
  : import('../../../../messages/generated/en/ns/gameLobby.json').then(module => module.default))
