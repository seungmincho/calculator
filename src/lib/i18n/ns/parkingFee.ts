import { registerMessages } from '@/lib/i18n'
import { loadTranslationFallback } from '@/lib/i18n/translationFetch'
import messages from '../../../../messages/generated/ko/ns/parkingFee.json'

registerMessages(messages, context => context?.retry
  ? loadTranslationFallback('/i18n/en/ns/parkingFee.3d76258a3ed6c5e9.json', ['parkingFee'])
  : import('../../../../messages/generated/en/ns/parkingFee.json').then(module => module.default))
