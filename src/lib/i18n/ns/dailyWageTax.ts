import { registerMessages } from '@/lib/i18n'
import { loadTranslationFallback } from '@/lib/i18n/translationFetch'
import messages from '../../../../messages/generated/ko/ns/dailyWageTax.json'

registerMessages(messages, context => context?.retry
  ? loadTranslationFallback('/i18n/en/ns/dailyWageTax.8e708ad5bf8ea61d.json', ['dailyWageTax'])
  : import('../../../../messages/generated/en/ns/dailyWageTax.json').then(module => module.default))
