import { registerMessages } from '@/lib/i18n'
import { loadTranslationFallback } from '@/lib/i18n/translationFetch'
import messages from '../../../../messages/generated/ko/ns/snakeGame.json'

registerMessages(messages, context => context?.retry
  ? loadTranslationFallback('/i18n/en/ns/snakeGame.11ca03156a4b1c0c.json', ['snakeGame'])
  : import('../../../../messages/generated/en/ns/snakeGame.json').then(module => module.default))
