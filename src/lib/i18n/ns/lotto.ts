import { registerMessages } from '@/lib/i18n'
import { loadTranslationFallback } from '@/lib/i18n/translationFetch'
import messages from '../../../../messages/generated/ko/ns/lotto.json'

registerMessages(messages, context => context?.retry
  ? loadTranslationFallback('/i18n/en/ns/lotto.2f4cd136a613b0c0.json', ['lotto'])
  : import('../../../../messages/generated/en/ns/lotto.json').then(module => module.default))
