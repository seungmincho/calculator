import { registerMessages } from '@/lib/i18n'
import { loadTranslationFallback } from '@/lib/i18n/translationFetch'
import messages from '../../../../messages/generated/ko/ns/seasonalFood.json'

registerMessages(messages, context => context?.retry
  ? loadTranslationFallback('/i18n/en/ns/seasonalFood.b33119adbad601c4.json', ['seasonalFood'])
  : import('../../../../messages/generated/en/ns/seasonalFood.json').then(module => module.default))
