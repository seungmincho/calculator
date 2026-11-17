import { registerMessages } from '@/lib/i18n'
import { loadTranslationFallback } from '@/lib/i18n/translationFetch'
import messages from '../../../../messages/generated/ko/ns/kanbanBoard.json'

registerMessages(messages, context => context?.retry
  ? loadTranslationFallback('/i18n/en/ns/kanbanBoard.8fcbbe66cbf03081.json', ['kanbanBoard'])
  : import('../../../../messages/generated/en/ns/kanbanBoard.json').then(module => module.default))
