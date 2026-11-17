import { registerMessages } from '@/lib/i18n'
import { loadTranslationFallback } from '@/lib/i18n/translationFetch'
import messages from '../../../../messages/generated/ko/ns/healthInsurance.json'

registerMessages(messages, context => context?.retry
  ? loadTranslationFallback('/i18n/en/ns/healthInsurance.08784055ab6d4059.json', ['healthInsurance'])
  : import('../../../../messages/generated/en/ns/healthInsurance.json').then(module => module.default))
