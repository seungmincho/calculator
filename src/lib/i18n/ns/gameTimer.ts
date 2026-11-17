import { registerMessages } from '@/lib/i18n'
import { loadTranslationFallback } from '@/lib/i18n/translationFetch'
import messages from '../../../../messages/generated/ko/ns/gameTimer.json'

registerMessages(messages, context => context?.retry
  ? loadTranslationFallback('/i18n/en/ns/gameTimer.83a1910c54601145.json', ['gameTimer'])
  : import('../../../../messages/generated/en/ns/gameTimer.json').then(module => module.default))
