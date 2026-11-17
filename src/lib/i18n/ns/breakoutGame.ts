import { registerMessages } from '@/lib/i18n'
import { loadTranslationFallback } from '@/lib/i18n/translationFetch'
import messages from '../../../../messages/generated/ko/ns/breakoutGame.json'

registerMessages(messages, context => context?.retry
  ? loadTranslationFallback('/i18n/en/ns/breakoutGame.b5a6e45a4ffe89bd.json', ['breakoutGame'])
  : import('../../../../messages/generated/en/ns/breakoutGame.json').then(module => module.default))
