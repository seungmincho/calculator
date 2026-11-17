import { registerMessages } from '@/lib/i18n'
import { loadTranslationFallback } from '@/lib/i18n/translationFetch'
import messages from '../../../../messages/generated/ko/ns/gameInvite.json'

registerMessages(messages, context => context?.retry
  ? loadTranslationFallback('/i18n/en/ns/gameInvite.66ad39c82bd123ac.json', ['gameInvite'])
  : import('../../../../messages/generated/en/ns/gameInvite.json').then(module => module.default))
