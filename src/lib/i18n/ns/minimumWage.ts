import { registerMessages } from '@/lib/i18n'
import { loadTranslationFallback } from '@/lib/i18n/translationFetch'
import messages from '../../../../messages/generated/ko/ns/minimumWage.json'

registerMessages(messages, context => context?.retry
  ? loadTranslationFallback('/i18n/en/ns/minimumWage.3e354ee5bf7ec168.json', ['minimumWage'])
  : import('../../../../messages/generated/en/ns/minimumWage.json').then(module => module.default))
