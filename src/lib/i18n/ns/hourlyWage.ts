import { registerMessages } from '@/lib/i18n'
import { loadTranslationFallback } from '@/lib/i18n/translationFetch'
import messages from '../../../../messages/generated/ko/ns/hourlyWage.json'

registerMessages(messages, context => context?.retry
  ? loadTranslationFallback('/i18n/en/ns/hourlyWage.3a1ff78b78f1d27c.json', ['hourlyWage'])
  : import('../../../../messages/generated/en/ns/hourlyWage.json').then(module => module.default))
