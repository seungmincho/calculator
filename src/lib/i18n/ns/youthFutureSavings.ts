import { registerMessages } from '@/lib/i18n'
import { loadTranslationFallback } from '@/lib/i18n/translationFetch'
import messages from '../../../../messages/generated/ko/ns/youthFutureSavings.json'

registerMessages(messages, context => context?.retry
  ? loadTranslationFallback('/i18n/en/ns/youthFutureSavings.1310f379c1f054dc.json', ['youthFutureSavings'])
  : import('../../../../messages/generated/en/ns/youthFutureSavings.json').then(module => module.default))
