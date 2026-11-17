import { registerMessages } from '@/lib/i18n'
import { loadTranslationFallback } from '@/lib/i18n/translationFetch'
import messages from '../../../../messages/generated/ko/ns/tipsPage.json'

registerMessages(messages, context => context?.retry
  ? loadTranslationFallback('/i18n/en/ns/tipsPage.4f0349c836617c00.json', ['tipsPage'])
  : import('../../../../messages/generated/en/ns/tipsPage.json').then(module => module.default))
