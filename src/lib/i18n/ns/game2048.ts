import { registerMessages } from '@/lib/i18n'
import { loadTranslationFallback } from '@/lib/i18n/translationFetch'
import messages from '../../../../messages/generated/ko/ns/game2048.json'

registerMessages(messages, context => context?.retry
  ? loadTranslationFallback('/i18n/en/ns/game2048.2a8f12f0f738d5d0.json', ['game2048'])
  : import('../../../../messages/generated/en/ns/game2048.json').then(module => module.default))
