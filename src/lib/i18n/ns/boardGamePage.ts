import { registerMessages } from '@/lib/i18n'
import { loadTranslationFallback } from '@/lib/i18n/translationFetch'
import messages from '../../../../messages/generated/ko/ns/boardGamePage.json'

registerMessages(messages, context => context?.retry
  ? loadTranslationFallback('/i18n/en/ns/boardGamePage.841e1c434aa2cbdf.json', ['boardGamePage'])
  : import('../../../../messages/generated/en/ns/boardGamePage.json').then(module => module.default))
