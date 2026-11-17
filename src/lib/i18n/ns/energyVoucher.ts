import { registerMessages } from '@/lib/i18n'
import { loadTranslationFallback } from '@/lib/i18n/translationFetch'
import messages from '../../../../messages/generated/ko/ns/energyVoucher.json'

registerMessages(messages, context => context?.retry
  ? loadTranslationFallback('/i18n/en/ns/energyVoucher.2ea7ff083acec08d.json', ['energyVoucher'])
  : import('../../../../messages/generated/en/ns/energyVoucher.json').then(module => module.default))
