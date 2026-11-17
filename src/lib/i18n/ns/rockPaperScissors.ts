import { registerMessages } from '@/lib/i18n'
import { loadTranslationFallback } from '@/lib/i18n/translationFetch'
import messages from '../../../../messages/generated/ko/ns/rockPaperScissors.json'

registerMessages(messages, context => context?.retry
  ? loadTranslationFallback('/i18n/en/ns/rockPaperScissors.b66b72b183f7638b.json', ['rockPaperScissors'])
  : import('../../../../messages/generated/en/ns/rockPaperScissors.json').then(module => module.default))
