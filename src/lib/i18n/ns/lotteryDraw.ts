import { registerMessages } from '@/lib/i18n'
import { loadTranslationFallback } from '@/lib/i18n/translationFetch'
import messages from '../../../../messages/generated/ko/ns/lotteryDraw.json'

registerMessages(messages, context => context?.retry
  ? loadTranslationFallback('/i18n/en/ns/lotteryDraw.2b6964cf475f9e2b.json', ['lotteryDraw'])
  : import('../../../../messages/generated/en/ns/lotteryDraw.json').then(module => module.default))
