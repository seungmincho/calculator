import { registerMessages } from '@/lib/i18n'
import { loadTranslationFallback } from '@/lib/i18n/translationFetch'
import messages from '../../../../messages/generated/ko/ns/terms.json'

registerMessages(messages, context => context?.retry
  ? loadTranslationFallback('/i18n/en/ns/terms.75a91c40dac0ae3e.json', ['terms'])
  : import('../../../../messages/generated/en/ns/terms.json').then(module => module.default))
