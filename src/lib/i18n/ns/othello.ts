import { registerMessages } from '@/lib/i18n'
import { loadTranslationFallback } from '@/lib/i18n/translationFetch'
import messages from '../../../../messages/generated/ko/ns/othello.json'

registerMessages(messages, context => context?.retry
  ? loadTranslationFallback('/i18n/en/ns/othello.537087f565d3fe2a.json', ['othello'])
  : import('../../../../messages/generated/en/ns/othello.json').then(module => module.default))
