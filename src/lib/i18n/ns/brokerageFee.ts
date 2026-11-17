import { registerMessages } from '@/lib/i18n'
import { loadTranslationFallback } from '@/lib/i18n/translationFetch'
import messages from '../../../../messages/generated/ko/ns/brokerageFee.json'

registerMessages(messages, context => context?.retry
  ? loadTranslationFallback('/i18n/en/ns/brokerageFee.4a287bd96e55464f.json', ['brokerageFee'])
  : import('../../../../messages/generated/en/ns/brokerageFee.json').then(module => module.default))
