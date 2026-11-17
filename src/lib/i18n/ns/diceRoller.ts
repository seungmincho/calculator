import { registerMessages } from '@/lib/i18n'
import { loadTranslationFallback } from '@/lib/i18n/translationFetch'
import messages from '../../../../messages/generated/ko/ns/diceRoller.json'

registerMessages(messages, context => context?.retry
  ? loadTranslationFallback('/i18n/en/ns/diceRoller.2f7c67c38e3b72c6.json', ['diceRoller'])
  : import('../../../../messages/generated/en/ns/diceRoller.json').then(module => module.default))
