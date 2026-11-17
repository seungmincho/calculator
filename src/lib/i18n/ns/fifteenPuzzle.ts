import { registerMessages } from '@/lib/i18n'
import { loadTranslationFallback } from '@/lib/i18n/translationFetch'
import messages from '../../../../messages/generated/ko/ns/fifteenPuzzle.json'

registerMessages(messages, context => context?.retry
  ? loadTranslationFallback('/i18n/en/ns/fifteenPuzzle.cdfa80f96e7f98dc.json', ['fifteenPuzzle'])
  : import('../../../../messages/generated/en/ns/fifteenPuzzle.json').then(module => module.default))
