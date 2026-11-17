import { registerMessages } from '@/lib/i18n'
import { loadTranslationFallback } from '@/lib/i18n/translationFetch'
import messages from '../../../../messages/generated/ko/ns/nationalPension.json'

registerMessages(messages, context => context?.retry
  ? loadTranslationFallback('/i18n/en/ns/nationalPension.2c331e7cd46f85fb.json', ['nationalPension'])
  : import('../../../../messages/generated/en/ns/nationalPension.json').then(module => module.default))
