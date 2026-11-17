import { registerMessages } from '@/lib/i18n'
import { loadTranslationFallback } from '@/lib/i18n/translationFetch'
import messages from '../../../../messages/generated/ko/ns/prepaymentFee.json'

registerMessages(messages, context => context?.retry
  ? loadTranslationFallback('/i18n/en/ns/prepaymentFee.71667b9c74412327.json', ['prepaymentFee'])
  : import('../../../../messages/generated/en/ns/prepaymentFee.json').then(module => module.default))
