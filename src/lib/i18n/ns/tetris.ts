import { registerMessages } from '@/lib/i18n'
import { loadTranslationFallback } from '@/lib/i18n/translationFetch'
import messages from '../../../../messages/generated/ko/ns/tetris.json'

registerMessages(messages, context => context?.retry
  ? loadTranslationFallback('/i18n/en/ns/tetris.e8c2c54e7b963e98.json', ['tetris'])
  : import('../../../../messages/generated/en/ns/tetris.json').then(module => module.default))
