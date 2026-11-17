import { registerMessages } from '@/lib/i18n'
import { loadTranslationFallback } from '@/lib/i18n/translationFetch'
import messages from '../../../../messages/generated/ko/ns/sudoku.json'

registerMessages(messages, context => context?.retry
  ? loadTranslationFallback('/i18n/en/ns/sudoku.15de0ede7986fa1d.json', ['sudoku'])
  : import('../../../../messages/generated/en/ns/sudoku.json').then(module => module.default))
