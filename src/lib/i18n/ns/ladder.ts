import { registerMessages } from '@/lib/i18n'
import { loadTranslationFallback } from '@/lib/i18n/translationFetch'
import messages from '../../../../messages/generated/ko/ns/ladder.json'

registerMessages(messages, context => context?.retry
  ? loadTranslationFallback('/i18n/en/ns/ladder.9b991c86148b3604.json', ['ladder'])
  : import('../../../../messages/generated/en/ns/ladder.json').then(module => module.default))
