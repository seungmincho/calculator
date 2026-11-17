import { registerMessages } from '@/lib/i18n'
import { loadTranslationFallback } from '@/lib/i18n/translationFetch'
import messages from '../../../../messages/generated/ko/ns/chess.json'

registerMessages(messages, context => context?.retry
  ? loadTranslationFallback('/i18n/en/ns/chess.c0cb1031d1036793.json', ['chess'])
  : import('../../../../messages/generated/en/ns/chess.json').then(module => module.default))
