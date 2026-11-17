import { registerMessages } from '@/lib/i18n'
import { loadTranslationFallback } from '@/lib/i18n/translationFetch'
import messages from '../../../../messages/generated/ko/ns/fourInsurance.json'

registerMessages(messages, context => context?.retry
  ? loadTranslationFallback('/i18n/en/ns/fourInsurance.5f970300cefa7077.json', ['fourInsurance'])
  : import('../../../../messages/generated/en/ns/fourInsurance.json').then(module => module.default))
