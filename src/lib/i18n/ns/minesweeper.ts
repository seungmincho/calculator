import { registerMessages } from '@/lib/i18n'
import { loadTranslationFallback } from '@/lib/i18n/translationFetch'
import messages from '../../../../messages/generated/ko/ns/minesweeper.json'

registerMessages(messages, context => context?.retry
  ? loadTranslationFallback('/i18n/en/ns/minesweeper.7c55ed13810d7bbb.json', ['minesweeper'])
  : import('../../../../messages/generated/en/ns/minesweeper.json').then(module => module.default))
